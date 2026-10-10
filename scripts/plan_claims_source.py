"""Read-only evaluation of claims against blob text. Pure: no I/O, no execution."""
from __future__ import annotations

import re


def _skip_trivia(text: str, i: int) -> int:
    if text.startswith("//", i):
        end = text.find("\n", i)
        return len(text) if end < 0 else end
    if text.startswith("/*", i):
        return text.index("*/", i + 2) + 2
    if text[i] in "'\"":
        j = i + 1
        while text[j] != text[i]:
            j += 2 if text[j] == "\\" else 1
        return j + 1
    if text[i] == "`":
        j = i + 1
        while text[j] != "`":
            if text[j] == "\\":
                j += 2
            elif text.startswith("${", j):
                j = _match_brace(text, j + 1) + 1
            else:
                j += 1
        return j + 1
    return i


def _match_brace(text: str, i: int) -> int:
    depth = 0
    while i < len(text):
        nxt = _skip_trivia(text, i)
        if nxt != i:
            i = nxt
            continue
        depth += {"{": 1, "}": -1}.get(text[i], 0)
        if depth == 0:
            return i
        i += 1
    raise ValueError("unbalanced braces")


def function_lines(text: str, name: str) -> int:
    decl = re.compile(rf"^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*{re.escape(name)}\s*[(<]", re.M)
    matches = list(decl.finditer(text))
    if len(matches) != 1:
        raise ValueError(f"expected one declaration of {name}, found {len(matches)}")
    i, parens, seen = matches[0].start(), 0, False
    while i < len(text):
        nxt = _skip_trivia(text, i)
        if nxt != i:
            i = nxt
            continue
        parens += {"(": 1, ")": -1}.get(text[i], 0)
        seen = seen or text[i] == "("
        if text[i] == "{" and parens == 0 and seen:
            close = _match_brace(text, i)
            return text.count("\n", matches[0].start(), close) + 1
        i += 1
    raise ValueError(f"no body for {name}")


def evaluate(text: str, claim: dict) -> str | None:
    kind = claim["kind"]
    if kind == "line-equals":
        lines = text.split("\n")
        actual = lines[claim["line"] - 1].rstrip("\r") if claim["line"] <= len(lines) else None
        return None if actual == claim["text"] else f"line {claim['line']} is {actual!r}"
    if kind in ("text-present", "text-absent"):
        return None if (claim["text"] in text) == (kind == "text-present") else f"text {'missing' if kind == 'text-present' else 'present'}"
    if kind == "enum-values":
        m = re.search(rf"\btype\s+{re.escape(claim['type'])}\s*=\s*([^;]*);", text)
        body = m.group(1) if m else ""
        if not re.fullmatch(r"\s*\|?\s*\"[^\"]*\"(?:\s*\|\s*\"[^\"]*\")*\s*", body):
            return f"type {claim['type']} is not a string-literal union"
        found = re.findall(r"\"([^\"]*)\"", body)
        return None if set(found) == set(claim["values"]) else f"enum values are {sorted(found)}"
    if kind == "import-edge":
        specs = set(re.findall(r"(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)[\"']([^\"'\n]+)[\"']", text))
        return None if (claim["specifier"] in specs) == claim["present"] else f"import of {claim['specifier']} present={not claim['present']}"
    try:
        count = function_lines(text, claim["function"]) if kind == "function-lines" else len(text.splitlines())
    except (ValueError, IndexError) as error:
        return str(error)
    if count > claim["max"]:
        return f"{count} lines exceeds {claim['max']}"
    return None if claim.get("equals") in (None, count) else f"{count} lines, expected {claim['equals']}"
