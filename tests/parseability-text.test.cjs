const assert = require('node:assert/strict');
const {
  normalizedParseabilityText,
  parseabilityTokens,
} = require('../electron-runtime/electron/src/parseability-text.cjs');

// The gate's original ASCII tokenizer: Unicode tokens must not change ASCII behavior.
const stopWords = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of',
  'on', 'or', 'the', 'to', 'with', 'using', 'through', 'across', 'within',
  'while', 'that', 'this', 'these', 'those', 'is', 'are', 'was', 'were',
]);
const legacyTokens = (value) =>
  value
    .toLowerCase()
    .match(/[a-z0-9+#.-]+/g)
    ?.map((token) => token.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((token) => token.length > 1 && !stopWords.has(token)) ?? [];
const legacyNormalized = (value) =>
  value.toLowerCase().replace(/[^a-z0-9+#.-]+/g, ' ').replace(/\s+/g, ' ').trim();

for (const sample of [
  'Led C++/C# migration for 12 clinics; reduced wait times by 30%.',
  'Coordinated intake across 4 sites with Epic, Excel, and HIPAA-compliant workflows.',
  'jane.doe@example.com  |  +1 (555) 010-2000  |  Portland, OR',
  '...trailing-dots... and -dashes- R&D node.js v2.1',
]) {
  assert.deepEqual(parseabilityTokens(sample).tokens, legacyTokens(sample), sample);
  assert.equal(parseabilityTokens(sample).containsUnverifiableScript, false);
  assert.equal(normalizedParseabilityText(sample), legacyNormalized(sample), sample);
}

const tokensOf = (value) => parseabilityTokens(value).tokens;

// Accented Latin, Greek, and Cyrillic words stay whole instead of being cut at every non-ASCII letter.
assert.deepEqual(tokensOf('Señora Müller, Ærøskøbing'), ['señora', 'müller', 'ærøskøbing']);
assert.deepEqual(tokensOf('Nguyễn Văn Thành'), ['nguyễn', 'văn', 'thành']);
assert.deepEqual(tokensOf('Ковальчук Олександр'), ['ковальчук', 'олександр']);
assert.deepEqual(tokensOf('Ελληνικά δεδομένα'), ['ελληνικά', 'δεδομένα']);
// Decomposed (NFD) input compares equal to composed text.
assert.deepEqual(tokensOf('Müller'), ['müller']);

// Scripts without word spaces are compared per grapheme, so line wrapping cannot break a token.
assert.deepEqual(tokensOf('项目经理'), ['项', '目', '经', '理']);
assert.deepEqual(tokensOf('プロジェクト管理'), ['プ', 'ロ', 'ジ', 'ェ', 'ク', 'ト', '管', '理']);
const thaiGraphemes = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment('ผู้จัดการ'), (part) => part.segment);
assert.deepEqual(tokensOf('ผู้จัดการ'), thaiGraphemes);
assert.ok(thaiGraphemes.includes('ผู้'), 'Thai combining marks stay with their base consonant');
assert.deepEqual(tokensOf('SAP 项目'), ['sap', '项', '目']);
// Hangul uses spaces between words, so words stay whole.
assert.deepEqual(tokensOf('프로젝트 관리자'), ['프로젝트', '관리자']);

const extracted = normalizedParseabilityText('项目\n经理 负责SAP 供应链');
for (const token of tokensOf('项目经理，负责 SAP 供应链')) {
  assert.ok(extracted.includes(token), `extracted text should contain ${token}`);
}
assert.ok(extracted.includes(tokensOf('项目经理').slice(0, 3).join(' ')), 'reading-order anchors survive line breaks');

// Right-to-left and Indic content is reported as unverifiable instead of being silently ignored.
for (const sample of ['مدير مشروع', 'מנהל פרויקטים', 'परियोजना प्रबंधक', 'திட்ட மேலாளர்']) {
  const result = parseabilityTokens(`${sample} SAP`);
  assert.equal(result.containsUnverifiableScript, true, sample);
  assert.deepEqual(result.tokens, ['sap'], sample);
}

console.log('parseability text tokens ok');
