"""R1: bind empirical assertions in canonical plan sections to typed claims. Pure: no I/O.

Canonical sections are scanned in full, including fenced blocks; an unclosed
fence fails. Each detected assertion instance must bind to exactly one unused
claim on its line. That claim must be type-compatible and match the
assertion's subject (path, function, type or specifier), its revision (a SHA
prefix on the line) and its property (line, text, size, values or polarity).

Every claim or judgment ID is referenced exactly once. A judgment covers only
non-mechanical numbers or exhaustiveness wording, and only through a statement
quoted verbatim from its own line. Detection is lexical: it cannot certify
arbitrary prose, so the auditor still reviews the plan.
"""
from __future__ import annotations

import posixpath
import re
from collections import Counter

from plan_claims_schema import _fail

REQUIRED = ("## Locked Decisions", "## Definition of Done", "## CI Commands")
CANONICAL = REQUIRED + ("## Phase ",)
REF_RE = re.compile(r"\[(claim|judgment):([a-z0-9][a-z0-9-]{0,48})\]")
HEX_RE = re.compile(r"\b[0-9a-f]{7,40}\b")
MAX_LINE = 2000
FORMS = (
    ("grep evidence", re.compile(r"`git show ([0-9a-f]{7,40}):([^`\s|]+)[^`]*` -> `(\d+):([^`]*)`")),
    ("file:line citation", re.compile(r"([\w./-]+\.[A-Za-z][A-Za-z0-9]{0,5}):(\d+)\b")),
    ("line reference", re.compile(r"\blines? (\d+(?:(?:, | and | to |-)\d+)*)\b")),
    ("size", re.compile(r"\b(\d[\d,]*)[ -]lines?\b")),
    ("enum literal", re.compile(r"\"[^\"\s|]{1,40}\"(?: ?\| ?\"[^\"\s|]{1,40}\")+")),
    ("import", re.compile(r"\bimports? `([^`]{1,200})`|\brequire\(\s*[\"']([^\"']{1,200})[\"']")),
    ("text", re.compile(r"\b(contains|does not contain|lacks) `([^`]{1,500})`")),
    ("test classification", re.compile(r"(?i)\bred-first\b|\bregression-lock\b|\bfails? (?:red|by name)\b"
                                       r"|\b(?:already|currently|still) (?:pass(?:es|ing)?|fail(?:s|ing)?|red|green)\b")),
    ("import graph", re.compile(r"(?i)\bimport (?:cycle|edge)s?\b")),
    ("exhaustiveness", re.compile(r"(?i)\bonly (?:callers?|importers?|call sites?|usages?)\b|\bno other (?:callers?|importers?|usages?)\b")),
)
JUDGMENT_FORMS = {"import graph", "exhaustiveness"}
EXEMPT = re.compile("|".join([
    r"\b[0-9a-f]{40}\b", r"\b(?=[0-9a-f]*[a-f])[0-9a-f]{7,39}\b", r"#\d+",
    r"\b(?:Phase|phase|Step|Steps|[Ii]teration|Entry|Entries|Amendment|PR|issue)s? #?\d+(?:\.\d+)*",
    r"\bv?\d+\.\d+\.\d+\b", r"\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?Z?)?\b", r"^\s*\d+\.\s",
    r"[\w./-]+\.[A-Za-z][A-Za-z0-9]{0,5}\b", r"\bUTC[+-]\d+(?:[.:]\d+)?", r"\b[A-Za-z_]+\d+\w*\b", r"\b\d+(?:st|nd|rd|th)\b",
]), re.M)
NUMBER_RE = re.compile(r"\d[\d,.]*")


def canonical_lines(text: str, manifest_lines: range) -> list[tuple[int, str, bool]]:
    found, out, canonical, tests, fence = set(), [], False, False, None
    for number, line in enumerate(text.splitlines(), 1):
        if number in manifest_lines:
            if fence is not None:
                _fail("R1", f"unclosed code fence opened at line {fence}")
            if canonical:
                _fail("R1", "the qor-plan-claims manifest must sit outside canonical sections")
            continue
        if line.lstrip().startswith(("```", "~~~")):
            fence = number if fence is None else None
            continue
        if fence is None and line.startswith("## "):
            canonical, tests = line.startswith(CANONICAL), False
            found.update(p for p in CANONICAL if line.startswith(p))
        elif fence is None and line.startswith("### "):
            tests = "test" in line.lower()
        elif canonical:
            if len(line) > MAX_LINE:
                _fail("R1", f"line {number} is too long to analyse ({len(line)} > {MAX_LINE} characters)")
            out.append((number, line, tests and fence is None))
    if fence is not None:
        _fail("R1", f"unclosed code fence opened at line {fence}")
    missing = [p.strip("# ").strip() for p in CANONICAL if p not in found]
    if missing:
        _fail("R1", f"plan is missing canonical sections: {', '.join(missing)}")
    return out


def _blank(work: str, span: tuple[int, int]) -> str:
    return work[:span[0]] + " " * (span[1] - span[0]) + work[span[1]:]


def analyse(line: str, unit_tests: bool, commits: frozenset = frozenset()) -> tuple[list, list]:
    """Return ([(form, match)], [pending (start, end) spans that only a judgment may cover])."""
    work = REF_RE.sub(lambda m: " " * len(m.group()), line)
    found, pending = [], []
    for form, pattern in FORMS:
        for m in list(pattern.finditer(work)):
            if form in JUDGMENT_FORMS:
                pending.append(m.span())
            else:
                found.append((form, m))
            work = _blank(work, m.span())
    for m in list(HEX_RE.finditer(work)):
        if any(sha.startswith(m.group()) for sha in commits):
            work = _blank(work, m.span())
    if not unit_tests:
        residual = EXEMPT.sub(lambda m: " " * len(m.group()), work)
        pending += [m.span() for m in NUMBER_RE.finditer(residual)]
    return found, pending


def _subject_ok(claim: dict, line: str) -> bool:
    words = set(re.findall(r"[\w$.-]+", line))
    if claim["kind"] == "function-lines":
        return claim["function"] in words
    if claim["kind"] == "enum-values":
        return claim["type"] in words
    return posixpath.basename(claim["path"]) in line


def _property_ok(form: str, m: re.Match, claim: dict, line: str, item: str) -> bool:
    kind = claim["kind"]
    if form == "grep evidence":
        return (kind == "line-equals" and claim["commit"].startswith(m.group(1)) and claim["path"] == m.group(2)
                and claim["line"] == int(m.group(3)) and claim["text"] == m.group(4))
    if form in ("file:line citation", "line reference"):
        path = m.group(1) if form == "file:line citation" else posixpath.basename(claim.get("path", ""))
        return (kind == "line-equals" and claim["line"] == int(item)
                and (claim["path"] == path or claim["path"].endswith("/" + path)))
    if form == "size":
        return kind in ("file-lines", "function-lines") and int(item) in (claim.get("equals"), claim["max"])
    if form == "enum literal":
        return kind == "enum-values" and set(re.findall(r"\"([^\"]*)\"", m.group())) == set(claim["values"])
    negated = bool(re.search(r"\b(?:not|no|never)\b", line[max(0, m.start() - 30):m.start()]))
    if form == "import":
        return kind == "import-edge" and claim["specifier"] == item and claim["present"] == (not negated)
    want = "text-absent" if m.group(1) in ("does not contain", "lacks") else "text-present"
    return kind == want and claim["text"] == item


def _items(form: str, m: re.Match) -> list[str]:
    if form == "line reference":
        return re.findall(r"\d+", m.group(1))
    if form == "size":
        return [m.group(1).replace(",", "")]
    if form == "file:line citation":
        return [m.group(2)]
    if form == "import":
        return [m.group(1) or m.group(2)]
    if form == "text":
        return [m.group(2)]
    return [m.group()]


def _bind_claims(number: int, line: str, found: list, refs: list, claims: dict) -> set:
    available, used = [i for t, i in refs if t == "claim"], set()
    prefixes = HEX_RE.findall(line)
    for form, m in found:
        for item in _items(form, m):
            if form == "test classification":
                match = [c for c in available if c not in used and claims[c]["kind"] == "test-outcome"]
                if not match:
                    _fail("R1", f"test classification at line {number} needs a test-outcome claim backed by a trusted harness (D3)")
            else:
                match = [c for c in available if c not in used and any(claims[c]["commit"].startswith(p) for p in prefixes)
                         and claims[c]["kind"] != "test-outcome" and _subject_ok(claims[c], line)
                         and _property_ok(form, m, claims[c], line, item)]
            if not match:
                _fail("R1", f"unbound assertion ({form}) at line {number}: {m.group()[:100]}")
            used.add(match[0])
    unbound = [c for c in available if c not in used]
    if unbound:
        _fail("R1", f"claim {unbound[0]} on line {number} is not bound to a compatible assertion")
    return used


def _bind_judgments(number: int, line: str, pending: list, refs: list, judgments: dict) -> None:
    clean = REF_RE.sub(lambda m: " " * len(m.group()), line)
    spans = {}
    for t, j in refs:
        if t == "judgment":
            start = clean.find(judgments[j]["statement"])
            if start < 0:
                _fail("R1", f"judgment {j} statement is not quoted verbatim from line {number}")
            spans[j] = (start, start + len(judgments[j]["statement"]))
    covering = set()
    for s, e in pending:
        owner = [j for j, (a, b) in spans.items() if a <= s and e <= b]
        if not owner:
            _fail("R1", f"unbound assertion (number or exhaustiveness) at line {number}: {clean[s:e]!r} needs a claim or a scoped judgment")
        covering.add(owner[0])
    if set(spans) - covering:
        _fail("R1", f"judgment {sorted(set(spans) - covering)[0]} at line {number} covers no non-mechanical assertion")


def _check_ids(manifest: dict, prose: str, lines: list) -> None:
    ids = [c["id"] for c in manifest["claims"]] + [j["id"] for j in manifest["judgments"]]
    if len(ids) != len(set(ids)):
        _fail("R1", f"duplicate claim or judgment ids: {sorted({i for i in ids if ids.count(i) > 1})}")
    rationales = [j["rationale"].strip().lower() for j in manifest["judgments"]]
    if len(rationales) != len(set(rationales)):
        _fail("R1", "judgment rationales must be specific to each assertion, not copied")
    canonical_refs = [r for _, line, _ in lines for r in REF_RE.findall(line)]
    if len(canonical_refs) != len(REF_RE.findall(prose)):
        _fail("R1", "claim or judgment references outside canonical sections cannot bind to an assertion")
    for (t, i), count in Counter(canonical_refs).items():
        if count > 1:
            _fail("R1", f"{t} {i} referenced on {count} lines (one assertion per entry)")
    declared = {("claim", c["id"]) for c in manifest["claims"]} | {("judgment", j["id"]) for j in manifest["judgments"]}
    if set(canonical_refs) - declared:
        _fail("R1", f"missing claim or judgment for references {sorted(set(canonical_refs) - declared)}")
    if declared - set(canonical_refs):
        _fail("R1", f"orphan manifest entries never referenced by the plan: {sorted(declared - set(canonical_refs))}")


def check_completeness(text: str, prose: str, manifest: dict, manifest_lines: range) -> None:
    lines = canonical_lines(text, manifest_lines)
    commits = frozenset(manifest["commits"].values())
    analysed = [(n, line, *analyse(line, tests, commits)) for n, line, tests in lines]
    if any(found or pending for _, _, found, pending in analysed) and not (manifest["claims"] or manifest["judgments"]):
        _fail("R1", "empirical assertions require a non-empty manifest of bound claims")
    _check_ids(manifest, prose, lines)
    claims = {c["id"]: c for c in manifest["claims"]}
    judgments = {j["id"]: j for j in manifest["judgments"]}
    for number, line, found, pending in analysed:
        refs = REF_RE.findall(line)
        _bind_claims(number, line, found, refs, claims)
        _bind_judgments(number, line, pending, refs, judgments)
