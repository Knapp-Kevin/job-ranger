/**
 * Text comparison for the Parseability Gate: does the text an ATS-style parser
 * extracts from a generated PDF still contain the resume's content, in order?
 *
 * Tokens are Unicode-aware so non-Latin resumes are actually verified:
 * - letters, marks, and digits of every script form tokens (NFKC, lower case);
 * - scripts written without spaces between words (Han, Kana, Thai, Lao, Khmer,
 *   Myanmar) are compared one grapheme at a time, because line wrapping may
 *   break anywhere inside them;
 * - right-to-left and Indic scripts are reported separately as unverifiable:
 *   PDF text extraction of shaped and bidirectional text differs between
 *   parsers (visual vs. logical order, ligature mapping), so a mismatch there
 *   says more about the parser than about the document.
 *
 * For ASCII text the tokens are identical to the gate's original
 * `[a-z0-9+#.-]` tokenizer.
 */

const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of",
  "on", "or", "the", "to", "with", "using", "through", "across", "within",
  "while", "that", "this", "these", "those", "is", "are", "was", "were",
]);

const TOKEN_RUN = /[\p{L}\p{M}\p{N}+#.-]+/gu;
const NON_TOKEN = /[^\p{L}\p{M}\p{N}+#.-]+/gu;
const PER_GRAPHEME_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const PER_GRAPHEME_RUN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}ー][\p{M}]*/gu;
const UNVERIFIABLE_SCRIPT =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Tibetan}]/u;

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(value: string): string[] {
  if (graphemes) return Array.from(graphemes.segment(value), (part) => part.segment);
  return value.match(/\P{M}\p{M}*/gu) ?? [];
}

function fold(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

/** Splits a token run so per-grapheme scripts become one token per grapheme. */
function splitRun(run: string): string[] {
  if (!PER_GRAPHEME_SCRIPT.test(run)) return [run];
  const parts: string[] = [];
  let buffer = "";
  for (const grapheme of splitGraphemes(run)) {
    if (PER_GRAPHEME_SCRIPT.test(grapheme) || grapheme === "ー") {
      if (buffer) parts.push(buffer);
      buffer = "";
      parts.push(grapheme);
    } else {
      buffer += grapheme;
    }
  }
  if (buffer) parts.push(buffer);
  return parts;
}

function trimPunctuation(token: string): string {
  return token.replace(/^[.-]+|[.-]+$/g, "");
}

export interface ParseabilityTokens {
  /** Tokens that must be found in the extracted text. */
  tokens: string[];
  /** True when the text contains right-to-left or Indic script content. */
  containsUnverifiableScript: boolean;
}

export function parseabilityTokens(value: string): ParseabilityTokens {
  const tokens: string[] = [];
  let containsUnverifiableScript = false;
  for (const run of fold(value).match(TOKEN_RUN) ?? []) {
    if (UNVERIFIABLE_SCRIPT.test(run)) {
      containsUnverifiableScript = true;
      continue;
    }
    for (const part of splitRun(run)) {
      const token = trimPunctuation(part);
      const singleGrapheme = PER_GRAPHEME_SCRIPT.test(token);
      if ((token.length > 1 || singleGrapheme) && !STOP_WORDS.has(token)) tokens.push(token);
    }
  }
  return { tokens, containsUnverifiableScript };
}

/** Extracted text normalized so that every token above can be found with `includes`. */
export function normalizedParseabilityText(value: string): string {
  return fold(value)
    .replace(NON_TOKEN, " ")
    .replace(PER_GRAPHEME_RUN, (grapheme) => ` ${grapheme} `)
    .replace(/\s+/g, " ")
    .trim();
}
