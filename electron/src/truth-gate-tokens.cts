// Script-aware content tokens for the Truth Gate `unsupported-edit` check.
//
// The check asks: does a user-edited resume statement introduce content-bearing
// terms that the linked Career Evidence does not contain? Each script needs a
// different notion of "term":
//
// - Pure-ASCII words keep the original behaviour exactly (same character class,
//   same edge trimming, same length filter, same English stoplist, exact match).
// - Other alphabetic words (accented Latin, Cyrillic, Greek, Arabic, Hebrew,
//   Devanagari, ...) are whole-word tokens matched exactly, with a small
//   function-word stoplist. Latin/Greek/Cyrillic also match accent-folded, and
//   Arabic/Hebrew also match with common attached proclitics removed.
// - Han characters are checked one by one against the evidence, minus a
//   stoplist of grammatical characters, because word segmentation of Chinese
//   and Japanese is not stable enough to compare edit and evidence segments.
// - Hiragana is treated as grammar (particles, okurigana) and ignored.
// - Katakana runs, Hangul words (after stripping attached particles/endings)
//   and Thai/Lao/Khmer/Myanmar words must appear as a substring of the
//   evidence text, so reflowed compounds and conjugations still match.
//
// Trade-off: this flags new content-bearing material (new characters, words,
// loanwords, Latin terms, numbers) and tolerates particles and rewording, but it
// cannot detect a new claim assembled only from characters already present in
// the evidence. That residual risk is documented in the functional design.

const englishStopWords = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of",
  "on", "or", "the", "to", "with", "using", "through", "across", "within",
  "while", "that", "this", "these", "those", "is", "are", "was", "were",
]);

// Function words for non-ASCII alphabetic tokens only, so English behaviour is
// untouched. Single-letter words are already dropped by the length filter.
const unicodeWordStopWords = new Set([
  // Latin-script languages (non-ASCII forms)
  "für", "über", "während", "à", "où", "dès", "não", "através", "também",
  "após", "según", "además", "así", "più", "perché",
  // Cyrillic
  "во", "на", "со", "по", "об", "от", "до", "за", "для", "из", "при", "не",
  "но", "что", "как", "или", "это", "был", "была", "были", "те", "то",
  "ли", "же", "та", "що", "які",
  // Greek
  "και", "το", "τη", "την", "της", "των", "του", "στο", "στη", "στην",
  "στον", "με", "για", "από", "σε", "οι", "τα", "ως",
  // Arabic
  "في", "من", "على", "إلى", "الى", "عن", "مع", "أو", "او", "ثم", "التي",
  "الذي", "هذا", "هذه", "ذلك", "تلك", "كما", "بين",
  // Hebrew
  "של", "את", "עם", "על", "אל", "גם", "או", "כי", "זה", "זו", "אשר",
  // Devanagari (Hindi/Marathi)
  "का", "की", "के", "में", "से", "और", "को", "पर", "है", "हैं", "था", "थे",
  "ने", "एक", "यह", "वह", "तथा", "एवं", "लिए", "किया", "किए", "गया", "गए",
]);

// Grammatical Han characters (Chinese function words and particles).
const hanStopCharacters = new Set(Array.from(
  "的了和与及并在是等也对为于之其而或以把被将从向着过地得所这那个我们有",
));

// Korean particles and common verb endings attached to a word stem.
const hangulSuffixes = [
  "하였습니다", "했습니다", "하였으며", "하였고", "하였다", "했으며", "합니다",
  "으로서", "으로써", "에서는", "에서도", "에게서", "했고", "했다", "했던",
  "하여", "해서", "하고", "하며", "하는", "한다", "으로", "에서", "에게",
  "께서", "까지", "부터", "처럼", "보다", "이며", "이고", "은", "는", "이",
  "가", "을", "를", "에", "의", "와", "과", "로", "도", "만", "한", "된",
  "함", "됨",
].sort((a, b) => b.length - a.length);

const hangulStopWords = new Set([
  "및", "등", "또는", "그리고", "위한", "위해", "통해", "통한", "대한", "있는",
  "있다", "하는", "했다", "수", "것", "더",
]);

const southeastAsianStopWords = new Set([
  // Thai
  "และ", "ที่", "ใน", "ของ", "การ", "ได้", "เป็น", "มี", "ให้", "กับ", "โดย",
  "จาก", "ความ", "ซึ่ง", "แล้ว", "ไป", "มา", "จะ", "ว่า", "นี้", "นั้น",
  "หรือ", "เพื่อ", "ด้วย", "ทั้ง", "อย่าง", "ต่อ", "แก่", "ถึง", "ไว้", "ก็",
  "ยัง", "ผ่าน",
]);

type CharClass =
  | "alpha"
  | "han"
  | "hiragana"
  | "katakana"
  | "hangul"
  | "southeast-asian";

interface TruthToken {
  value: string;
  // exact: any variant must be an evidence token; substring: the value must
  // occur somewhere in the normalized evidence text.
  mode: "exact" | "substring";
  variants: string[];
}

export interface TruthEvidenceIndex {
  tokens: Set<string>;
  text: string;
}

const tokenRunPattern = /[\p{L}\p{M}\p{N}+#.\-ー]+/gu;
const asciiTokenPattern = /^[a-z0-9+#.-]+$/;
const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("th", { granularity: "word" })
    : undefined;

function normalize(value: string): string {
  // NFKC folds full-width/half-width forms; the katakana middle dot is a word
  // separator inside compounds and is dropped so compounds compare equal.
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

function splitByScript(run: string): Array<{ cls: CharClass; text: string }> {
  const parts: Array<{ cls: CharClass; text: string }> = [];
  for (const char of run) {
    const last = parts.at(-1);
    const cls = classify(char, last?.cls);
    if (last && last.cls === cls) last.text += char;
    else parts.push({ cls, text: char });
  }
  return parts;
}

function stripMarks(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

function wordVariants(word: string): string[] {
  const variants = new Set([word]);
  if (/[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u.test(word)) {
    variants.add(stripMarks(word));
  }
  if (/\p{Script=Arabic}/u.test(word)) {
    for (const prefix of ["وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ل", "ك"]) {
      if (word.startsWith(prefix) && word.length - prefix.length >= 2) {
        variants.add(word.slice(prefix.length));
      }
    }
  }
  if (/\p{Script=Hebrew}/u.test(word)) {
    const prefixes = "והבכלמש";
    let stem = word;
    for (let i = 0; i < 2 && stem.length > 3 && prefixes.includes(stem[0]); i += 1) {
      stem = stem.slice(1);
      variants.add(stem);
    }
  }
  return Array.from(variants);
}

function alphaTokens(text: string): TruthToken[] {
  if (asciiTokenPattern.test(text)) {
    const token = text.replace(/^[.-]+|[.-]+$/g, "");
    return token.length > 1 && !englishStopWords.has(token)
      ? [{ value: token, mode: "exact", variants: [token] }]
      : [];
  }
  return text
    .split(/[.\-]+/)
    .map((part) => part.replace(/^[+#]+|[+#]+$/g, ""))
    .filter(
      (part) =>
        Array.from(part).length > 1 &&
        !englishStopWords.has(part) &&
        !unicodeWordStopWords.has(part),
    )
    .map((part) => ({ value: part, mode: "exact", variants: wordVariants(part) }));
}

function hangulTokens(text: string): TruthToken[] {
  let stem = text;
  for (let i = 0; i < 2; i += 1) {
    const suffix = hangulSuffixes.find(
      (item) => stem.endsWith(item) && stem.length > item.length,
    );
    if (!suffix) break;
    stem = stem.slice(0, -suffix.length);
  }
  if (hangulStopWords.has(text) || hangulStopWords.has(stem)) return [];
  return [{ value: stem, mode: "substring", variants: [stem] }];
}

function southeastAsianTokens(text: string): TruthToken[] {
  const words = segmenter
    ? Array.from(segmenter.segment(text))
        .filter((segment) => segment.isWordLike)
        .map((segment) => segment.segment)
    : [text];
  return words
    .filter((word) => !southeastAsianStopWords.has(word))
    .map((word) => ({ value: word, mode: "substring", variants: [word] }));
}

function truthTokens(normalized: string): TruthToken[] {
  const tokens: TruthToken[] = [];
  for (const run of normalized.match(tokenRunPattern) ?? []) {
    for (const part of splitByScript(run)) {
      switch (part.cls) {
        case "alpha":
          tokens.push(...alphaTokens(part.text));
          break;
        case "han":
          for (const char of part.text) {
            if (!hanStopCharacters.has(char)) {
              tokens.push({ value: char, mode: "substring", variants: [char] });
            }
          }
          break;
        case "hiragana":
          break;
        case "katakana":
          if (part.text.replace(/ー/g, "").length > 1) {
            tokens.push({ value: part.text, mode: "substring", variants: [part.text] });
          }
          break;
        case "hangul":
          tokens.push(...hangulTokens(part.text));
          break;
        case "southeast-asian":
          tokens.push(...southeastAsianTokens(part.text));
          break;
      }
    }
  }
  return tokens;
}

export function buildTruthEvidenceIndex(value: string): TruthEvidenceIndex {
  const text = normalize(value);
  const tokens = new Set<string>();
  for (const token of truthTokens(text)) {
    if (token.mode === "exact") token.variants.forEach((item) => tokens.add(item));
  }
  return { tokens, text };
}

export function unsupportedTruthTokens(
  editedText: string,
  evidence: TruthEvidenceIndex,
): string[] {
  const unsupported = truthTokens(normalize(editedText))
    .filter((token) =>
      token.mode === "exact"
        ? !token.variants.some((item) => evidence.tokens.has(item))
        : !evidence.text.includes(token.value),
    )
    .map((token) => token.value);
  return Array.from(new Set(unsupported));
}
