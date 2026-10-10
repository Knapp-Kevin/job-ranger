"""Executable plan-claims gate (Phase 17 /qor-remediate closure enforcer).

Plans from phase 17 onward must carry a fenced ```json qor-plan-claims block.
Each claim restates an empirical statement from the plan prose (a cited line,
a function size, a red/green test status) in a form this file can execute
against an exact git ref. A plan whose claims do not reproduce is not ready
for /qor-audit.

Run: python -m pytest tests/test_plan_claims_manifest.py
Select a plan explicitly with QOR_PLAN=docs/plan-qor-phaseNN-*.md.
Reuse a prepared checkout for command claims with
QOR_CLAIMS_CHECKOUT_<ref-prefix>=<path> (its HEAD must equal the ref).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FIRST_GATED_PHASE = 17
BLOCK_RE = re.compile(r"```json qor-plan-claims\n(.*?)\n```", re.S)
PHASE_RE = re.compile(r"plan-qor-phase(\d+)")


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], check=True,
                          capture_output=True, text=True, encoding="utf-8").stdout


def load_manifest(plan_text: str, phase: int) -> dict | None:
    blocks = BLOCK_RE.findall(plan_text)
    if not blocks:
        if phase >= FIRST_GATED_PHASE:
            raise AssertionError(f"phase {phase} plan has no qor-plan-claims block")
        return None
    if len(blocks) > 1:
        raise AssertionError("plan has more than one qor-plan-claims block")
    manifest = json.loads(blocks[0])
    if manifest.get("version") != 1 or not manifest.get("claims"):
        raise AssertionError("qor-plan-claims needs version 1 and a non-empty claims list")
    return manifest


def check_grep(repo: Path, claim: dict) -> None:
    text = git(repo, "show", f"{claim['ref']}:{claim['path']}")
    pattern = re.compile(claim["pattern"])
    hits = [f"{n}:{line}" for n, line in enumerate(text.splitlines(), 1) if pattern.search(line)]
    if claim.get("expect_absent"):
        assert not hits, f"{claim['id']}: expected no match, found {hits[:3]}"
        return
    assert hits, f"{claim['id']}: pattern not found at {claim['ref']}:{claim['path']}"
    assert hits[0] == claim["expect"], f"{claim['id']}: expected {claim['expect']!r}, observed {hits[0]!r}"


def function_length(text: str, name: str) -> int:
    lines = text.splitlines()
    start_re = re.compile(rf"^(export )?(async )?function {re.escape(name)}\b")
    for index, line in enumerate(lines):
        if start_re.match(line):
            for end in range(index, len(lines)):
                if lines[end] == "}":
                    return end - index + 1
            raise AssertionError(f"function {name} has no column-0 closing brace")
    raise AssertionError(f"function {name} not found")


def check_size(repo: Path, claim: dict) -> None:
    text = git(repo, "show", f"{claim['ref']}:{claim['path']}")
    if claim["kind"] == "file-lines":
        observed = len(text.splitlines())
    else:
        observed = function_length(text, claim["function"])
    assert observed <= claim["max"], f"{claim['id']}: {observed} lines exceeds {claim['max']}"
    if "expect" in claim:
        assert observed == claim["expect"], f"{claim['id']}: expected {claim['expect']} lines, observed {observed}"


def checkout_for(repo: Path, ref: str, scratch: Path) -> Path:
    full = git(repo, "rev-parse", ref).strip()
    override = os.environ.get(f"QOR_CLAIMS_CHECKOUT_{ref[:7]}")
    if override:
        head = git(Path(override), "rev-parse", "HEAD").strip()
        assert head == full, f"checkout {override} is at {head}, claims require {full}"
        return Path(override)
    target = scratch / full[:12]
    if not target.exists():
        git(repo, "worktree", "add", "--detach", str(target), full)
    return target


def check_command(repo: Path, claim: dict, scratch: Path, prepared: set) -> None:
    cwd = checkout_for(repo, claim["ref"], scratch)
    for step in claim.get("setup", []):
        if (str(cwd), tuple(step)) not in prepared:
            run_argv(step, cwd, must_pass=True)
            prepared.add((str(cwd), tuple(step)))
    result = run_argv(claim["argv"], cwd, must_pass=False)
    passed = result.returncode == 0
    want = claim["expect"]
    assert want in ("pass", "fail"), f"{claim['id']}: expect must be pass or fail"
    assert passed == (want == "pass"), (
        f"{claim['id']}: expected {want}, exit {result.returncode}\n{result.stdout[-800:]}{result.stderr[-800:]}")
    if claim.get("output_regex"):
        assert re.search(claim["output_regex"], result.stdout + result.stderr), (
            f"{claim['id']}: output does not match {claim['output_regex']!r}")


def run_argv(argv: list, cwd: Path, must_pass: bool) -> subprocess.CompletedProcess:
    exe = shutil.which(argv[0]) or argv[0]
    result = subprocess.run([exe, *argv[1:]], cwd=cwd, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if must_pass and result.returncode != 0:
        raise AssertionError(f"setup {argv} failed: {result.stderr[-800:]}")
    return result


def verify_plan(repo: Path, plan_path: Path) -> list[str]:
    match = PHASE_RE.search(plan_path.name)
    assert match, f"{plan_path} is not a docs/plan-qor-phaseNN plan"
    manifest = load_manifest(plan_path.read_text(encoding="utf-8"), int(match.group(1)))
    if manifest is None:
        return []
    ids = [c["id"] for c in manifest["claims"]]
    assert len(ids) == len(set(ids)), "claim ids must be unique"
    prepared: set = set()
    with tempfile.TemporaryDirectory(prefix="qor-claims-") as tmp:
        scratch = Path(tmp)
        try:
            for claim in manifest["claims"]:
                kind = claim["kind"]
                if kind == "git-grep":
                    check_grep(repo, claim)
                elif kind in ("function-lines", "file-lines"):
                    check_size(repo, claim)
                elif kind == "command":
                    check_command(repo, claim, scratch, prepared)
                else:
                    raise AssertionError(f"{claim['id']}: unknown claim kind {kind!r}")
        finally:
            for child in scratch.iterdir():
                subprocess.run(["git", "-C", str(repo), "worktree", "remove", "--force", str(child)],
                               capture_output=True)
    return ids


def active_plan(repo: Path) -> Path:
    explicit = os.environ.get("QOR_PLAN")
    if explicit:
        return repo / explicit
    plans = sorted((repo / "docs").glob("plan-qor-phase*.md"),
                   key=lambda p: int(PHASE_RE.search(p.name).group(1)))
    assert plans, "no docs/plan-qor-phase*.md plan found"
    return plans[-1]


def test_active_phase_plan_claims_reproduce():
    verify_plan(REPO, active_plan(REPO))


# --- self-tests: the gate's own behaviour on a synthetic repository ---

def _fixture_repo(tmp_path: Path) -> tuple[Path, str]:
    repo = tmp_path / "repo"
    (repo / "src").mkdir(parents=True)
    (repo / "src" / "a.ts").write_text(
        'export type Kind = "electron" | "web";\nexport function small() {\n  return 1;\n}\n', encoding="utf-8")
    (repo / "ok.js").write_text("process.exit(0)\n", encoding="utf-8")
    (repo / "bad.js").write_text("console.log('named assertion red'); process.exit(1)\n", encoding="utf-8")
    for args in (["init", "-q"], ["add", "-A"],
                 ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "fixture"]):
        git(repo, *args)
    return repo, git(repo, "rev-parse", "HEAD").strip()


def _plan(repo: Path, phase: int, claims: list | None) -> Path:
    body = "# Plan\n"
    if claims is not None:
        body += "```json qor-plan-claims\n" + json.dumps({"version": 1, "claims": claims}) + "\n```\n"
    path = repo / "docs" / f"plan-qor-phase{phase}-x.md"
    path.parent.mkdir(exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return path


def _expect_failure(repo: Path, plan: Path, fragment: str) -> None:
    try:
        verify_plan(repo, plan)
    except AssertionError as error:
        assert fragment in str(error), str(error)
        return
    raise AssertionError(f"gate accepted a plan that should fail ({fragment})")


def test_gated_phase_without_manifest_is_rejected(tmp_path):
    repo, _ = _fixture_repo(tmp_path)
    _expect_failure(repo, _plan(repo, 17, None), "no qor-plan-claims block")


def test_pre_gate_phase_without_manifest_is_grandfathered(tmp_path):
    repo, _ = _fixture_repo(tmp_path)
    assert verify_plan(repo, _plan(repo, 16, None)) == []


def test_grep_claim_reproduces_and_drift_is_rejected(tmp_path):
    repo, head = _fixture_repo(tmp_path)
    good = {"id": "enum", "kind": "git-grep", "ref": head, "path": "src/a.ts",
            "pattern": "type Kind", "expect": '1:export type Kind = "electron" | "web";'}
    assert verify_plan(repo, _plan(repo, 17, [good])) == ["enum"]
    _expect_failure(repo, _plan(repo, 17, [dict(good, expect="2:wrong")]), "expected '2:wrong'")
    absent = {"id": "no-desktop", "kind": "git-grep", "ref": head, "path": "src/a.ts",
              "pattern": '"desktop"', "expect_absent": True}
    assert verify_plan(repo, _plan(repo, 17, [absent])) == ["no-desktop"]
    _expect_failure(repo, _plan(repo, 17, [dict(absent, pattern='"web"')]), "expected no match")


def test_size_claims_enforce_limits(tmp_path):
    repo, head = _fixture_repo(tmp_path)
    fn = {"id": "fn", "kind": "function-lines", "ref": head, "path": "src/a.ts", "function": "small", "max": 3}
    assert verify_plan(repo, _plan(repo, 17, [fn])) == ["fn"]
    _expect_failure(repo, _plan(repo, 17, [dict(fn, max=2)]), "exceeds 2")
    _expect_failure(repo, _plan(repo, 17, [dict(fn, expect=4)]), "expected 4 lines")
    big = {"id": "file", "kind": "file-lines", "ref": head, "path": "src/a.ts", "max": 3}
    _expect_failure(repo, _plan(repo, 17, [big]), "exceeds 3")


def test_command_claims_verify_red_and_green_classification(tmp_path):
    repo, head = _fixture_repo(tmp_path)
    green = {"id": "lock", "kind": "command", "ref": head, "argv": ["node", "ok.js"], "expect": "pass"}
    red = {"id": "red", "kind": "command", "ref": head, "argv": ["node", "bad.js"], "expect": "fail",
           "output_regex": "named assertion red"}
    assert verify_plan(repo, _plan(repo, 17, [green, red])) == ["lock", "red"]
    # A "red-first" claim that is actually green (the F1 defect) is rejected.
    _expect_failure(repo, _plan(repo, 17, [dict(green, id="misclassified", expect="fail")]), "expected fail")
    _expect_failure(repo, _plan(repo, 17, [dict(red, output_regex="other text")]), "output does not match")


def test_duplicate_claim_ids_and_unknown_kinds_are_rejected(tmp_path):
    repo, head = _fixture_repo(tmp_path)
    claim = {"id": "x", "kind": "git-grep", "ref": head, "path": "src/a.ts", "pattern": "small",
             "expect": "2:export function small() {"}
    _expect_failure(repo, _plan(repo, 17, [claim, claim]), "unique")
    _expect_failure(repo, _plan(repo, 17, [dict(claim, kind="prose")]), "unknown claim kind")
