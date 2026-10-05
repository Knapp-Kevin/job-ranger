// Unicode-aware text primitives (normalization and script classification) used
// by the Truth Gate tokenizer in `truth-gate-tokens.cts`. The Parseability
// Gate has its own extraction-level tokenizer in `parseability-text.cts`.

export const englishStopWords = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of",
  "on", "or", "the", "to", "with", "using", "through", "across", "within",
  "while", "that", "this", "these", "those", "is", "are", "was", "were",
]);

export type CharClass =
  | "alpha"
  | "han"
  | "hiragana"
  | "katakana"
  | "hangul"
  | "southeast-asian";

// Letters, marks and numbers plus the legacy `+#.-` joiners and the katakana
// prolonged sound mark (Script=Common, so not covered by \p{L}).
export const tokenRunPattern = /[\p{L}\p{M}\p{N}+#.\-ー]+/gu;
export const asciiTokenPattern = /^[a-z0-9+#.-]+$/;

export function normalizeUnicodeText(value: string): string {
  // NFKC folds full-width/half-width forms and ligatures (ﬁ → fi); the
  // katakana middle dot separates compound parts and is dropped.
  return value.normalize("NFKC").toLowerCase().replace(/[・]/g, "");
}

function classify(char: string, previous: CharClass | undefined): CharClass {
  if (/\p{Script=Han}/u.test(char)) return "han";
  if (/\p{Script=Hiragana}/u.test(char)) return "hiragana";
  if (/\p{Script=Katakana}/u.test(char) || char === "ー") return "katakana";
  if (/\p{Script=Hangul}/u.test(char)) return "hangul";
  if (/[\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(char)) {
    return "southeast-asian";
  }
  if (/\p{M}/u.test(char) && previous) return previous;
  return "alpha";
}

export function splitByScript(run: string): Array<{ cls: CharClass; text: string }> {
  const parts: Array<{ cls: CharClass; text: string }> = [];
  for (const char of run) {
    const last = parts.at(-1);
    const cls = classify(char, last?.cls);
    if (last && last.cls === cls) last.text += char;
    else parts.push({ cls, text: char });
  }
  return parts;
}
