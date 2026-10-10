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
