// Shared Unicode-aware text primitives for resume gates.
//
// `truth-gate-tokens.cts` builds semantic tokens on top of the script
// classification here. The Parseability Gate uses the extraction-level helpers
// below: they answer "did this text survive PDF rendering and extraction?",
// not "is this a supported claim", so every character is content and no
// stoplists beyond the legacy English one apply.

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

// Scripts written without spaces between words. PDF line wrapping can split
// them anywhere, and extraction may or may not insert whitespace there.
const unspacedChar =
  "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}";
const unspacedGap = new RegExp(`(?<=[${unspacedChar}])\\s+(?=[${unspacedChar}])`, "gu");
const unspacedChunkLength = 4;

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

function isUnspaced(cls: CharClass): boolean {
  return cls !== "alpha" && cls !== "hangul";
}

// Normalized text for substring checks against extracted PDF text. Pure-ASCII
// input yields the same characters as the legacy `[^a-z0-9+#.-]` scrub; other
// letters are kept instead of being blanked, and whitespace between two
// unspaced-script characters is removed so wrapped CJK/Thai lines compare equal.
export function extractionText(value: string): string {
  return normalizeUnicodeText(value)
    .replace(/[^\p{L}\p{M}\p{N}+#.\-ー]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(unspacedGap, "")
    .trim();
}

interface ExtractionToken {
  value: string;
  unspaced: boolean;
  rtl: boolean;
}

// Right-to-left scripts. The bundled PDF extractor returns these in visual,
// partly scrambled order, so they are compared as letters rather than words.
const rtlPattern =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;

function extractionTokenList(value: string): ExtractionToken[] {
  const tokens: ExtractionToken[] = [];
  for (const run of extractionText(value).match(tokenRunPattern) ?? []) {
    // Merge adjacent unspaced parts (e.g. kanji + hiragana): spacing, not
    // script, is what matters for extraction.
    const parts: Array<{ unspaced: boolean; text: string }> = [];
    for (const part of splitByScript(run)) {
      const unspaced = isUnspaced(part.cls);
      const last = parts.at(-1);
      if (last && last.unspaced && unspaced) last.text += part.text;
      else parts.push({ unspaced, text: part.text });
    }
    for (const part of parts) {
      if (part.unspaced) {
        const chars = Array.from(part.text);
        for (let i = 0; i < chars.length; i += unspacedChunkLength) {
          tokens.push({
            value: chars.slice(i, i + unspacedChunkLength).join(""),
            unspaced: true,
            rtl: false,
          });
        }
        continue;
      }
      const token = part.text.replace(/^[.-]+|[.-]+$/g, "");
      if (Array.from(token).length > 1 && !englishStopWords.has(token)) {
        tokens.push({ value: token, unspaced: false, rtl: rtlPattern.test(token) });
      }
    }
  }
  return tokens;
}

// Tokens that must appear in the extracted text. Pure-ASCII input yields the
// legacy tokens; unspaced-script runs yield fixed-size character chunks so
// coverage degrades proportionally when part of a CJK/Thai line is lost.
export function extractionTokens(value: string): string[] {
  return extractionTokenList(value).map((token) => token.value);
}

// Short string used to compare statement order in the extracted text.
export function extractionAnchor(value: string): string {
  const tokens = extractionTokenList(value);
  if (tokens.length === 0) return "";
  if (tokens[0].rtl) return "";
  if (tokens[0].unspaced) return tokens[0].value;
  // Legacy anchor: up to three leading spaced tokens joined by a space. Stop at
  // an unspaced chunk (not space-separated when extracted) or an RTL word.
  const leading = tokens.slice(0, 3);
  const end = leading.findIndex((token) => token.unspaced || token.rtl);
  return (end === -1 ? leading : leading.slice(0, end))
    .map((token) => token.value)
    .join(" ");
}

// Share of `value`'s extraction tokens found in already-normalized extracted
// text (see `extractionText`). Text without tokens counts as fully covered.
// RTL words are covered when all of their letters can be drawn from the
// extracted text's remaining RTL letters, which proves the glyphs survived
// without depending on the extractor's visual ordering.
export function extractionCoverage(value: string, extracted: string): number {
  const tokens = extractionTokenList(value);
  if (tokens.length === 0) return 1;
  let rtlLetters: Map<string, number> | undefined;
  const covered = tokens.filter((token) => {
    if (!token.rtl) return extracted.includes(token.value);
    rtlLetters ??= letterCounts(extracted);
    return consumeLetters(rtlLetters, token.value);
  });
  return covered.length / tokens.length;
}

function letterCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of text) {
    if (/[\p{L}\p{M}\p{N}]/u.test(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return counts;
}

function consumeLetters(counts: Map<string, number>, word: string): boolean {
  const needed = letterCounts(word);
  for (const [char, count] of needed) {
    if ((counts.get(char) ?? 0) < count) return false;
  }
  for (const [char, count] of needed) counts.set(char, (counts.get(char) ?? 0) - count);
  return true;
}
