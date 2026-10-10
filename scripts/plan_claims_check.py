"""Read-only plan-claims gate for governed plans (phase 17 onward).

A gated plan carries one ```json qor-plan-claims manifest (version 2). The
gate never runs plan-supplied commands. It only reads immutable git objects
with fixed `git cat-file` / `git ls-tree` calls. The checks are:
- closed schema;
- full 40-hex commit SHAs, each declared in the manifest and recorded in prose;
- every known empirical assertion form in a canonical section references a
  claim or a judgment exception;
- no missing or orphan IDs.

Detection is lexical. It cannot prove that arbitrary prose is complete, so the
independent auditor still owns undeclared or judgment-only assertions.

Usage: python scripts/plan_claims_check.py [--repo DIR] [PLAN ...]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from plan_claims_schema import SHA_RE, PlanClaimsError, _fail, validate_manifest
from plan_claims_source import evaluate

FIRST_GATED_PHASE = 17
BLOCK_RE = re.compile(r"```json qor-plan-claims\r?\n(.*?)\r?\n```", re.S)
REF_RE = re.compile(r"\[(claim|judgment):([a-z0-9][a-z0-9-]{0,48})\]")
PHASE_RE = re.compile(r"plan-qor-phase(\d+)")
REQUIRED_SECTIONS = ("## Locked Decisions", "## Definition of Done", "## CI Commands")
CANONICAL_PREFIXES = REQUIRED_SECTIONS + ("## Phase ",)
ASSERTION_FORMS = [
    ("file:line citation", re.compile(r"[\w./-]+\.(?:cts|ts|tsx|js|cjs|mjs|json|py|ya?ml|md):\d+")),
    ("grep evidence", re.compile(r"->\s*`\d+:")),
    ("size or count", re.compile(r"\b\d[\d,]*(?:\.\d+)?\s*(?:lines?|entries|items|bytes|B|KiB|MiB|characters|chars|countries|jobs|listings|files|functions|callers|time zones)\b")),
    ("enum literal", re.compile(r"\"[^\"\s]{1,40}\"\s*\|\s*\"[^\"\s]{1,40}\"")),
    ("test classification", re.compile(r"(?i)\bred-first\b|\bregression-lock\b|\balready (?:passes|green)\b|\bfails? (?:red|by name)\b|\bcurrently (?:red|green)\b")),
    ("import or dependency", re.compile(r"(?i)\bimport (?:cycle|edge)s?\b|\bimports? `[^`]+`|\brequire\(\s*[\"']")),
]
GIT_ENV = {"GIT_OPTIONAL_LOCKS": "0", "GIT_TERMINAL_PROMPT": "0", "GIT_NO_REPLACE_OBJECTS": "1"}


def canonical_lines(plan_text: str) -> list[tuple[int, str]]:
    found, inside, fenced, out = set(), False, False, []
    for number, line in enumerate(plan_text.splitlines(), 1):
        if line.startswith("```"):
            fenced = not fenced
            continue
        if line.startswith("## "):
            inside = line.startswith(CANONICAL_PREFIXES)
            found.update(p for p in CANONICAL_PREFIXES if line.startswith(p))
        elif inside and not fenced:
            out.append((number, line))
    missing = [p.strip("# ").strip() for p in CANONICAL_PREFIXES if p not in found]
    if missing:
        _fail("R1", f"plan is missing canonical sections: {', '.join(missing)}")
    return out


def check_completeness(plan_text: str, manifest: dict) -> None:
    kinds = {c["id"]: c["kind"] for c in manifest["claims"]}
    ids = [c["id"] for c in manifest["claims"]] + [j["id"] for j in manifest["judgments"]]
    if len(ids) != len(set(ids)):
        _fail("R1", f"duplicate claim or judgment ids: {sorted({i for i in ids if ids.count(i) > 1})}")
    prose = BLOCK_RE.sub("", plan_text)
    for number, line in canonical_lines(prose):
        refs = REF_RE.findall(line)
        for form, pattern in ASSERTION_FORMS:
            if not pattern.search(line):
                continue
            if not refs:
                _fail("R1", f"unreferenced empirical assertion ({form}) at line {number}: {line.strip()[:120]}")
            if form == "test classification" and not any(t == "claim" and kinds.get(i) == "test-outcome" for t, i in refs):
                _fail("R1", f"test classification at line {number} needs a test-outcome claim backed by a trusted harness")
    referenced = {(t, i) for t, i in REF_RE.findall(prose)}
    declared = {("claim", i) for i in kinds} | {("judgment", j["id"]) for j in manifest["judgments"]}
    if referenced - declared:
        _fail("R1", f"missing claim or judgment for references {sorted(referenced - declared)}")
    if declared - referenced:
        _fail("R1", f"orphan manifest entries never referenced by the plan: {sorted(declared - referenced)}")
    for label, sha in manifest["commits"].items():
        if sha not in prose:
            _fail("R4", f"commit {label} {sha} is not recorded in the plan prose")


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    argv = ["git", "-C", str(repo), "-c", "core.fsmonitor=false", "--literal-pathspecs", "--no-pager", *args]
    return subprocess.run(argv, capture_output=True, env={**os.environ, **GIT_ENV}, check=False)


def resolve_commit(repo: Path, sha: str) -> None:
    result = _git(repo, "cat-file", "-t", sha)
    if result.returncode != 0 or result.stdout.strip() != b"commit":
        _fail("R4", f"{sha} does not resolve to a commit object")


def read_blob(repo: Path, claim: dict) -> str:
    listed = _git(repo, "ls-tree", "-z", claim["commit"], "--", claim["path"]).stdout.split(b"\0")[0]
    if not listed:
        _fail("R1", f"claim {claim['id']}: {claim['path']} does not exist at {claim['commit']}")
    meta, _, name = listed.partition(b"\t")
    mode, kind, oid = meta.decode().split(" ")
    if name.decode() != claim["path"] or kind != "blob" or mode not in ("100644", "100755") or not SHA_RE.fullmatch(oid):
        _fail("R3", f"claim {claim['id']}: {claim['path']} is not a regular file at {claim['commit']}")
    try:
        return _git(repo, "cat-file", "blob", oid).stdout.decode("utf-8")
    except UnicodeDecodeError:
        _fail("R3", f"claim {claim['id']}: {claim['path']} is not UTF-8 text")


def verify_plan(repo: Path, plan_path: Path) -> list[str]:
    match = PHASE_RE.search(plan_path.name)
    if not match:
        _fail("R1", f"{plan_path.name} is not a docs/plan-qor-phaseNN plan")
    text = plan_path.read_text(encoding="utf-8")
    blocks = BLOCK_RE.findall(text)
    if not blocks:
        if int(match.group(1)) >= FIRST_GATED_PHASE:
            _fail("R1", f"phase {match.group(1)} plan has no qor-plan-claims manifest")
        return []
    if len(blocks) > 1:
        _fail("SCHEMA", "plan has more than one qor-plan-claims block")
    try:
        manifest = validate_manifest(json.loads(blocks[0]))
    except json.JSONDecodeError as error:
        _fail("SCHEMA", f"manifest is not JSON: {error}")
    check_completeness(text, manifest)
    for sha in sorted(set(manifest["commits"].values())):
        resolve_commit(repo, sha)
    for claim in manifest["claims"]:
        if claim["kind"] == "test-outcome":
            _fail("R1", f"claim {claim['id']}: test-outcome needs trusted harness evidence; none exists yet (dependency D3)")
        problem = evaluate(read_blob(repo, claim), claim)
        if problem:
            _fail("R1", f"claim {claim['id']} does not reproduce at {claim['commit']}: {problem}")
    return [c["id"] for c in manifest["claims"]] + [j["id"] for j in manifest["judgments"]]


def gated_plans(repo: Path) -> list[Path]:
    plans = [p for p in (repo / "docs").glob("plan-qor-phase*.md") if PHASE_RE.search(p.name)]
    return sorted(p for p in plans if int(PHASE_RE.search(p.name).group(1)) >= FIRST_GATED_PHASE)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", default=".")
    parser.add_argument("plans", nargs="*")
    args = parser.parse_args(argv)
    repo = Path(args.repo).resolve()
    plans = [Path(p) for p in args.plans] or gated_plans(repo)
    failed = 0
    for plan in plans:
        try:
            print(f"PASS {plan.name}: {len(verify_plan(repo, plan))} claims/judgments")
        except PlanClaimsError as error:
            failed += 1
            print(f"FAIL {plan.name}: {error}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
