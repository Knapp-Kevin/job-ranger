// Detects URLs, email addresses, phone numbers and filesystem paths in
// provider text. Patterns are deliberately narrow so ordinary terms such as
// "CI/CD" or "A/B testing" never match.

const PATTERNS: readonly RegExp[] = [
  /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, // scheme://...
  /\bwww\.[a-z0-9-]+\.[a-z]{2,}\S*/gi,
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, // email
  /\+?\d[\d\s().-]{5,}\d/g, // phone-like: at least 7 digits with separators
  /\b[a-z]:[\\/][^\s]*/gi, // drive-letter path
  /(?:^|\s)~?\/(?:[\w.-]+\/){1,}[\w.-]+/g, // /a/b or ~/a/b (two or more segments)
  /\b[\w.-]+\\[\w.-]+(?:\\[\w.-]+)*/g, // backslash path
];

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export function findExternalReferences(text: string): string[] {
  const found: string[] = [];
  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim();
      if (pattern.source.startsWith("\\+?\\d") && digitCount(value) < 7) continue;
      found.push(value);
    }
  }
  return Array.from(new Set(found));
}

/** References in `text` that do not appear verbatim in any allowed source text. */
export function unsupportedExternalReferences(text: string, allowedSources: readonly string[]): string[] {
  const haystack = allowedSources.join("\n");
  return findExternalReferences(text).filter((reference) => !haystack.includes(reference));
}
