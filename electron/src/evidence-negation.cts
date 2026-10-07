// Deterministic negation handling for evidence prose (G12, #167). The
// requirement mapper scores only *affirmed* text, so a requirement matched
// only inside a negated span ("Never approved the vendor budget") is not
// counted as support, while affirmed adjacent experience in the same evidence
// still counts. No model or fuzzy semantics.
//
// Rules (docs/plan-qor-phase15-mapper-negation.md, LD1):
// - A cue (whole word, not hyphen-joined) negates from the cue to the end of its
//   scope. Text before the cue stays affirmed. Output is verbatim: only the
//   negated span is replaced by one space.
// - Scope ends at . ; : ! ? or a newline, at a contrast word (but, however,
//   although, though, while, whereas, yet) unless it directly follows the cue,
//   at "and"/"or" before a past-tense verb, and at a comma followed (optionally
//   after "and") by a result/participle word or a past-tense verb.
// - Idioms such as "not only", "not limited to" and "no fewer than" are not negation.
//
// Known limitations (tested in tests/fixtures/negation-corpus.v1.json):
// - English only. Other cue words such as "none" and non-Latin text pass through.
// - Postposed or passive negation ("budgets were never approved") keeps the text
//   before the cue.
// - Gerund list items, -ed adjectives and present-tense tail clauses after a cue
//   end or extend scope imperfectly.
// - A proper noun starting with a cue word, and "." inside abbreviations or
//   names such as "Node.js", can shift a scope.

const BOUNDARY_PUNCTUATION = /^[.;:!?\n\r—…•]$/u;
const CONTRAST_WORDS = new Set(["but", "however", "although", "though", "while", "whereas", "yet"]);
const VERB_CUE = /^(not|never|cannot|[a-z]+n['’]t)$/i;
const NOUN_CUES = new Set(["no", "without", "nor", "neither", "except", "excluding"]);
const PHRASE_CUES = ["other than", "apart from", "rather than", "instead of"];
const IDIOMS = [
  "not only", "not just", "not limited to", "not to exceed", "no less than", "no more than",
  "no fewer than", "no later than", "never missed", "never lost", "never failed",
];
const HYPHENS = new Set(["-", "‑"]);
const RESULT_WORD = /^((?=[a-z]{5,}$)[a-z]+(ing|ed)|which|resulting|leading|saving)$/i;
const IRREGULAR_PAST = new Set([
  "led", "built", "ran", "cut", "grew", "won", "drove", "wrote", "taught", "made", "kept", "sold", "held",
  "began", "took", "set", "met", "oversaw", "spoke", "gave", "found", "sent", "brought", "spent", "paid",
  "undertook", "overcame",
]);

export const NEGATION_NOTE =
  'Some saved evidence states this requirement in a negated form (for example "never" or "not"); that part is not counted as support.';

interface Token {
  value: string;
  lower: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  // Unicode letters keep accented words whole ("Noël" is never the cue "No").
  for (const match of text.matchAll(/[\p{L}\p{N}$%]+(?:['’]\p{L}+)?|[.;:!?,\n\r—…•]|[-‑]/gu)) {
    const start = match.index ?? 0;
    tokens.push({ value: match[0], lower: match[0].toLowerCase(), start, end: start + match[0].length });
  }
  return tokens;
}

function isPastTense(word: string): boolean {
  const lower = word.toLowerCase();
  return (/^[a-z]+ed$/.test(lower) && lower.length >= 5) || IRREGULAR_PAST.has(lower);
}

function phraseAt(tokens: Token[], index: number, phrase: string): boolean {
  return phrase.split(" ").every((word, offset) => tokens[index + offset]?.lower === word);
}

type Cue = { kind: "idiom" | "cue"; length: number };

function cueAt(text: string, tokens: Token[], index: number): Cue | null {
  const token = tokens[index];
  if (HYPHENS.has(text[token.start - 1]) || HYPHENS.has(text[token.end])) return null;
  const idiom = IDIOMS.find((phrase) => phraseAt(tokens, index, phrase));
  if (idiom) return { kind: "idiom", length: idiom.split(" ").length };
  if (PHRASE_CUES.some((phrase) => phraseAt(tokens, index, phrase))) return { kind: "cue", length: 2 };
  if (NOUN_CUES.has(token.lower) || VERB_CUE.test(token.value)) return { kind: "cue", length: 1 };
  return null;
}

function commaEndsScope(tokens: Token[], commaIndex: number): boolean {
  let next = commaIndex + 1;
  if (tokens[next]?.lower === "and") next += 1;
  const word = tokens[next]?.value;
  return Boolean(word) && (RESULT_WORD.test(word!) || isPastTense(word!));
}

/** Character offset where the scope of a cue at `index` ends (exclusive). */
function scopeEnd(tokens: Token[], index: number, cueLength: number, textLength: number): number {
  for (let next = index + cueLength; next < tokens.length; next += 1) {
    const token = tokens[next];
    const directlyAfterCue = next === index + cueLength;
    if (BOUNDARY_PUNCTUATION.test(token.lower)) return token.start;
    if (CONTRAST_WORDS.has(token.lower) && !directlyAfterCue) return token.start;
    if ((token.lower === "and" || token.lower === "or") && tokens[next + 1] && isPastTense(tokens[next + 1].value)) return token.start;
    if (token.lower === "," && commaEndsScope(tokens, next)) return token.start;
  }
  return textLength;
}

function negatedSpans(text: string): Array<[number, number]> {
  const tokens = tokenize(text);
  const spans: Array<[number, number]> = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const cue = cueAt(text, tokens, index);
    if (!cue) continue;
    if (cue.kind === "idiom") {
      index += cue.length - 1;
      continue;
    }
    const end = scopeEnd(tokens, index, cue.length, text.length);
    spans.push([tokens[index].start, end]);
    while (index + 1 < tokens.length && tokens[index + 1].start < end) index += 1;
  }
  return spans;
}

/** The text with every negated span replaced by a single space; all else verbatim. */
export function affirmedText(text: string): string {
  let output = "";
  let position = 0;
  for (const [start, end] of negatedSpans(text)) {
    output += `${text.slice(position, start)} `;
    position = end;
  }
  return output + text.slice(position);
}

export type CoverageStrength = "direct" | "transferable" | "ambiguous" | "gap";

const STRENGTH: Record<CoverageStrength, number> = { direct: 3, transferable: 2, ambiguous: 1, gap: 0 };

/**
 * True only when negation itself weakened the outcome: the mapper's result on
 * raw evidence text (the counterfactual without negation handling) is strictly
 * stronger than its result on affirmed text. Credential standing, confirmation
 * and ranking all apply identically to both runs.
 */
export function negationChangedOutcome(
  rawClassification: CoverageStrength,
  finalClassification: CoverageStrength,
): boolean {
  return STRENGTH[rawClassification] > STRENGTH[finalClassification];
}
