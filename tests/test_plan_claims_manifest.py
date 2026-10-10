"""Regression suite for the read-only plan-claims gate (Phase 17 remediation R1-R4).

Run: python -m unittest discover -s tests -p test_plan_claims_manifest.py
The checker under test is scripts/plan_claims_check.py. Every rejection is asserted
by its error code ([R1], [R3], [R4], [SCHEMA]) so a test cannot pass for the wrong reason.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
import plan_claims_check as pcc  # noqa: E402

CORE = (
    'import { helper } from "./helper.cjs";\n'
    'export type RuntimeKind = "electron" | "web";\n'
    "export function small(a: string) {\n"
    '  const s = "}{";\n'
    "  // } comment brace\n"
    "  const t = `${a}}`;\n"
    "  return s + t;\n"
    "}\n"
)
HOSTILE = "$(touch {s})\n`touch {s}`\n; python -c \"open(r'{s}','w')\"\n"


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True,
                          text=True, encoding="utf-8").stdout.strip()


class Fixture:
    def __init__(self, root: Path):
        self.root = root
        self.repo = root / "repo"
        self.sentinel = root / "SENTINEL"
        (self.repo / "src").mkdir(parents=True)
        (self.repo / "src" / "core.ts").write_text(CORE, encoding="utf-8")
        (self.repo / "src" / "hostile.txt").write_text(HOSTILE.format(s=self.sentinel), encoding="utf-8")
        _git(self.repo, "init", "-q")
        _git(self.repo, "add", "-A")
        oid = _git(self.repo, "hash-object", "-w", "src/core.ts")
        _git(self.repo, "update-index", "--add", "--cacheinfo", f"120000,{oid},src/link.ts")
        _git(self.repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "fixture")
        _git(self.repo, "tag", "v1")
        self.sha = _git(self.repo, "rev-parse", "HEAD")
        self.blob = _git(self.repo, "rev-parse", "HEAD:src/core.ts")

    def plan(self, phase: int = 17, manifest: dict | None = None, extra: str = "",
             lead: str = "") -> Path:
        claim_line = f"- Size is bounded [claim:core-size] at `{self.sha}`."
        body = (f"# Plan\n\n{lead}## Locked Decisions\n\n{claim_line}\n{extra}\n"
                "## Phase 1: Work\n\n### Affected Files\n\n- src/core.ts\n\n"
                "## Definition of Done\n\n- D1: done\n\n## CI Commands\n\n- `npm test`\n\n")
        if manifest is not None:
            body += "## Plan Claims\n\n```json qor-plan-claims\n" + json.dumps(manifest, indent=1) + "\n```\n"
        path = self.repo / "docs" / f"plan-qor-phase{phase}-x.md"
        path.parent.mkdir(exist_ok=True)
        path.write_text(body, encoding="utf-8")
        return path

    def manifest(self, claims: list | None = None, judgments: list | None = None) -> dict:
        size = {"id": "core-size", "kind": "file-lines", "commit": self.sha, "path": "src/core.ts", "max": 8}
        return {"version": 2, "commits": {"fixture": self.sha},
                "claims": [size] + (claims or []), "judgments": judgments or []}


class GateTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="qor-claims-test-")
        self.f = Fixture(Path(self._tmp.name))

    def tearDown(self):
        self._tmp.cleanup()

    def ok(self, plan: Path) -> list:
        return pcc.verify_plan(self.f.repo, plan)

    def rejects(self, plan: Path, code: str, fragment: str = "") -> str:
        with self.assertRaises(Exception) as caught:
            pcc.verify_plan(self.f.repo, plan)
        message = str(caught.exception)
        self.assertIn(f"[{code}]", message)
        self.assertIn(fragment, message)
        return message


class R1ClaimCompleteness(GateTestCase):
    def test_fully_referenced_manifest_passes(self):
        self.assertEqual(self.ok(self.f.plan(manifest=self.f.manifest())), ["core-size"])

    def test_one_trivial_claim_with_undeclared_false_prose_fails(self):
        extra = "- `src/core.ts:99` defines a 164-entry list and `foo.cts` is 37 lines.\n"
        self.rejects(self.f.plan(manifest=self.f.manifest(), extra=extra), "R1", "unreferenced empirical assertion")

    def test_undeclared_enum_literal_fails(self):
        extra = '- The runtime kind is "desktop" | "web".\n'
        self.rejects(self.f.plan(manifest=self.f.manifest(), extra=extra), "R1", "enum literal")

    def test_undeclared_red_first_classification_fails(self):
        extra = "- The 51-zone test is red-first.\n"
        self.rejects(self.f.plan(manifest=self.f.manifest(), extra=extra), "R1", "test classification")

    def test_red_first_cannot_be_waived_as_judgment(self):
        judgment = {"id": "tz-red", "statement": "51-zone red-first",
                    "rationale": "The author believes this test is currently failing on the candidate."}
        extra = "- The 51-zone test is red-first [judgment:tz-red].\n"
        self.rejects(self.f.plan(manifest=self.f.manifest(judgments=[judgment]), extra=extra), "R1", "trusted harness")

    def test_missing_reference_fails(self):
        extra = "- Kind enum is fixed [claim:no-such-claim].\n"
        self.rejects(self.f.plan(manifest=self.f.manifest(), extra=extra), "R1", "missing claim")

    def test_orphan_manifest_entry_fails(self):
        orphan = {"id": "orphan", "kind": "text-present", "commit": self.f.sha, "path": "src/core.ts", "text": "small"}
        self.rejects(self.f.plan(manifest=self.f.manifest([orphan])), "R1", "orphan")

    def test_duplicate_ids_fail(self):
        dup = {"id": "core-size", "kind": "file-lines", "commit": self.f.sha, "path": "src/core.ts", "max": 9}
        self.rejects(self.f.plan(manifest=self.f.manifest([dup])), "R1", "duplicate")

    def test_judgment_needs_substantive_rationale(self):
        good = {"id": "razor", "statement": "functions under 40 lines",
                "rationale": "Design limit, not an observation; auditor checks it against the implementation."}
        extra = "- Every function stays under 40 lines [judgment:razor].\n"
        self.assertEqual(self.ok(self.f.plan(manifest=self.f.manifest(judgments=[good]), extra=extra)), ["core-size", "razor"])
        short = dict(good, rationale="because")
        self.rejects(self.f.plan(manifest=self.f.manifest(judgments=[short]), extra=extra), "SCHEMA", "rationale")

    def test_missing_canonical_section_fails(self):
        plan = self.f.plan(manifest=self.f.manifest())
        plan.write_text(plan.read_text(encoding="utf-8").replace("## CI Commands", "## Commands"), encoding="utf-8")
        self.rejects(plan, "R1", "CI Commands")

    def test_history_section_is_not_canonical(self):
        lead = "## Iteration history\n\n- Iteration 2 claimed 164 entries.\n\n"
        self.assertEqual(self.ok(self.f.plan(manifest=self.f.manifest(), lead=lead)), ["core-size"])

    def test_gated_phase_needs_manifest_and_pre_gate_phase_is_grandfathered(self):
        self.rejects(self.f.plan(phase=17), "R1", "no qor-plan-claims")
        self.assertEqual(self.ok(self.f.plan(phase=16)), [])

    def test_read_only_kinds_evaluate_against_the_commit(self):
        sha = self.f.sha
        claims = [
            {"id": "enum", "kind": "enum-values", "commit": sha, "path": "src/core.ts", "type": "RuntimeKind", "values": ["web", "electron"]},
            {"id": "edge", "kind": "import-edge", "commit": sha, "path": "src/core.ts", "specifier": "./helper.cjs", "present": True},
            {"id": "line", "kind": "line-equals", "commit": sha, "path": "src/core.ts", "line": 3, "text": "export function small(a: string) {"},
            {"id": "fn", "kind": "function-lines", "commit": sha, "path": "src/core.ts", "function": "small", "max": 6, "equals": 6},
        ]
        extra = "".join(f"- checked [claim:{c['id']}]\n" for c in claims)
        self.assertEqual(len(self.ok(self.f.plan(manifest=self.f.manifest(claims), extra=extra))), 5)
        wrong = [dict(claims[0], values=["desktop", "web"])]
        self.rejects(self.f.plan(manifest=self.f.manifest(wrong), extra="- e [claim:enum]\n"), "R1", "enum")
        too_long = [dict(claims[3], max=5, equals=None)]
        del too_long[0]["equals"]
        self.rejects(self.f.plan(manifest=self.f.manifest(too_long), extra="- f [claim:fn]\n"), "R1", "6 lines exceeds 5")


class R3NoAuthorExecution(GateTestCase):
    PAYLOADS = [
        {"kind": "command", "argv": ["bash", "-c", "touch {s}"]},
        {"kind": "command", "argv": ["python", "-c", "open(r'{s}','w')"]},
        {"kind": "command", "argv": ["npm", "run", "evil"], "setup": [["npm", "ci"]]},
        {"kind": "command", "argv": ["cmd", "/c", "type nul > {s}"]},
        {"kind": "file-lines", "argv": ["sh", "-c", "touch {s}"]},
        {"kind": "file-lines", "output_regex": ".*", "run": "touch {s}"},
    ]

    def test_executable_payloads_rejected_before_any_process_runs(self):
        for raw in self.PAYLOADS:
            payload = json.loads(json.dumps(raw).replace("{s}", str(self.f.sentinel).replace("\\", "/")))
            claim = {"id": "evil", "commit": self.f.sha, "path": "src/core.ts", "max": 9, **payload}
            for version in (1, 2):
                manifest = dict(self.f.manifest([claim]), version=version)
                plan = self.f.plan(manifest=manifest, extra="- evil [claim:evil]\n")
                with mock.patch.object(pcc.subprocess, "run", wraps=subprocess.run) as spy:
                    self.rejects(plan, "SCHEMA")
                self.assertEqual(spy.call_count, 0, f"process started for {payload}")
                self.assertFalse(self.f.sentinel.exists(), f"payload executed: {payload}")

    def test_legacy_v1_command_manifest_is_not_executed(self):
        sentinel = str(self.f.sentinel).replace("\\", "/")
        legacy = {"version": 1, "claims": [{"id": "evil", "kind": "command", "ref": self.f.sha,
                                            "argv": [sys.executable, "-c", f"open(r'{sentinel}', 'w').close()"],
                                            "expect": "pass"}]}
        plan = self.f.plan(manifest=legacy, extra="- evil [claim:evil]\n")
        try:
            pcc.verify_plan(self.f.repo, plan)
        except Exception as error:  # rejection is the required outcome
            self.assertIn("[SCHEMA]", str(error))
        finally:
            subprocess.run(["git", "-C", str(self.f.repo), "worktree", "prune"], capture_output=True)
        self.assertFalse(self.f.sentinel.exists(), "legacy command manifest executed author-controlled Python")

    def test_hostile_blob_content_is_only_read(self):
        claim = {"id": "hostile", "kind": "text-present", "commit": self.f.sha, "path": "src/hostile.txt", "text": "$(touch"}
        plan = self.f.plan(manifest=self.f.manifest([claim]), extra="- h [claim:hostile]\n")
        with mock.patch.object(pcc.subprocess, "run", wraps=subprocess.run) as spy:
            self.ok(plan)
        self.assertFalse(self.f.sentinel.exists())
        for call in spy.call_args_list:
            argv = call.args[0]
            self.assertEqual(argv[0], "git")
            self.assertIn(argv[argv.index("--no-pager") + 1], {"cat-file", "ls-tree"}, argv)
            self.assertIs(call.kwargs.get("shell", False), False)

    def test_traversal_option_and_absolute_paths_rejected_without_git(self):
        for bad in ["../x.ts", "/etc/passwd", "-c", "src/../core.ts", "C:/x", "src\\core.ts", "src:core.ts", "", "src//core.ts"]:
            claim = {"id": "p", "kind": "file-lines", "commit": self.f.sha, "path": bad, "max": 9}
            plan = self.f.plan(manifest=self.f.manifest([claim]), extra="- p [claim:p]\n")
            with mock.patch.object(pcc.subprocess, "run", wraps=subprocess.run) as spy:
                self.rejects(plan, "R3", "path")
            self.assertEqual(spy.call_count, 0, bad)

    def test_symlink_blob_rejected(self):
        claim = {"id": "link", "kind": "file-lines", "commit": self.f.sha, "path": "src/link.ts", "max": 9}
        self.rejects(self.f.plan(manifest=self.f.manifest([claim]), extra="- l [claim:link]\n"), "R3", "regular file")

    def test_successful_run_writes_nothing(self):
        plan = self.f.plan(manifest=self.f.manifest())
        before = _snapshot(self.f.repo)
        self.ok(plan)
        self.assertEqual(before, _snapshot(self.f.repo))
        self.assertFalse(self.f.sentinel.exists())


class R4ImmutableRefs(GateTestCase):
    def test_non_sha_refs_rejected_without_git(self):
        sha = self.f.sha
        for ref in ["HEAD", "master", "v1", sha[:7], "HEAD~1", sha + "^", sha.upper(), sha[:39], "@"]:
            claim = {"id": "r", "kind": "file-lines", "commit": ref, "path": "src/core.ts", "max": 9}
            manifest = self.f.manifest([claim])
            manifest["commits"]["other"] = ref
            plan = self.f.plan(manifest=manifest, extra=f"- r [claim:r] `{ref}`\n")
            with mock.patch.object(pcc.subprocess, "run", wraps=subprocess.run) as spy:
                self.rejects(plan, "R4", "40-character")
            self.assertEqual(spy.call_count, 0, ref)

    def test_full_sha_must_be_an_existing_commit_object(self):
        for oid in [self.f.blob, "0" * 40]:
            claim = {"id": "r", "kind": "file-lines", "commit": oid, "path": "src/core.ts", "max": 9}
            manifest = self.f.manifest([claim])
            manifest["commits"]["other"] = oid
            self.rejects(self.f.plan(manifest=manifest, extra=f"- r [claim:r] `{oid}`\n"), "R4", "commit object")

    def test_claim_commit_must_be_declared_and_recorded_in_prose(self):
        manifest = self.f.manifest()
        manifest["commits"] = {}
        self.rejects(self.f.plan(manifest=manifest), "R4", "not declared")
        other = self.f.manifest()
        plan = self.f.plan(manifest=other)
        plan.write_text(plan.read_text(encoding="utf-8").replace(f"at `{self.f.sha}`", "here", 1), encoding="utf-8")
        self.rejects(plan, "R4", "not recorded")

    def test_no_checkout_worktree_or_override(self):
        os.environ["QOR_CLAIMS_CHECKOUT_" + self.f.sha[:7]] = str(self.f.root / "dirty")
        try:
            with mock.patch.object(pcc.subprocess, "run", wraps=subprocess.run) as spy:
                self.ok(self.f.plan(manifest=self.f.manifest()))
        finally:
            del os.environ["QOR_CLAIMS_CHECKOUT_" + self.f.sha[:7]]
        flat = [arg for call in spy.call_args_list for arg in call.args[0]]
        self.assertNotIn("worktree", flat)
        self.assertNotIn("checkout", flat)
        self.assertEqual(_git(self.f.repo, "worktree", "list").count("\n"), 0)


class R2BindingIntegration(GateTestCase):
    def _cli(self, plan: Path) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(REPO / "scripts" / "plan_claims_check.py"),
                               "--repo", str(self.f.repo), str(plan)], capture_output=True, text=True)

    def test_cli_fails_closed_on_invalid_plan(self):
        bad = self._cli(self.f.plan(manifest=self.f.manifest(), extra="- 37 lines undeclared\n"))
        self.assertEqual(bad.returncode, 1, bad.stdout + bad.stderr)
        self.assertIn("[R1]", bad.stdout + bad.stderr)
        good = self._cli(self.f.plan(manifest=self.f.manifest()))
        self.assertEqual(good.returncode, 0, good.stdout + good.stderr)

    def test_ci_job_runs_checker_without_bypass(self):
        workflow = (REPO / ".github" / "workflows" / "plan-claims.yml").read_text(encoding="utf-8")
        for required in ("python scripts/plan_claims_check.py", "fetch-depth: 0", "contents: read",
                         "docs/plan-qor-phase*.md", "python -m unittest discover -s tests -p test_plan_claims_manifest.py"):
            self.assertIn(required, workflow)
        for bypass in ("continue-on-error", "|| true", "|| exit 0", "set +e"):
            self.assertNotIn(bypass, workflow)


def _snapshot(repo: Path) -> tuple:
    git_dir = repo / ".git"
    files = sorted((str(p.relative_to(git_dir)), p.stat().st_size, p.stat().st_mtime_ns)
                   for p in git_dir.rglob("*") if p.is_file())
    status = subprocess.run(["git", "-C", str(repo), "status", "--porcelain"], check=True, capture_output=True,
                            text=True, env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"}).stdout
    return files, status


if __name__ == "__main__":
    unittest.main()
