// G13 (#168): claim-action cap. Unit checks for claimVerb, hasRecipientMarker
// and activelySatisfies; the versioned phrasing corpus through the real mapper;
// and the G12 negation corpus, which must keep its classifications and notes.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  claimVerb, hasRecipientMarker, activelySatisfies, claimActionNote, CLAIM_ACTION_NOTE_PREFIX,
} = require("../electron-runtime/electron/src/claim-action.cjs");
const { buildJobEvidenceCoverage } = require("../electron-runtime/electron/src/requirement-mapper.cjs");
const { NEGATION_NOTE } = require("../electron-runtime/electron/src/evidence-negation.cjs");

const NOW = "2026-01-01T00:00:00.000Z";
const CORPUS_PATH = path.join(__dirname, "fixtures", "action-corpus.v1.json");
const CORPUS_SHA256 = "8fee380c1ff771235b07f401d0d231b43c7c0aa074f82f20f366963643b44c66";
const G12_CORPUS_PATH = path.join(__dirname, "fixtures", "negation-corpus.v1.json");
const G12_EXPECTED = require("./fixtures/negation-corpus.v1.json");

function units() {
  const verb = (text) => claimVerb(text) && [claimVerb(text).word, claimVerb(text).family];
  assert.deepEqual(verb("Managed payroll for a large workforce."), ["managed", "lead"]);
  assert.deepEqual(verb("Train new hires on safety procedures."), ["train", "train"]);
  assert.deepEqual(verb("Managed payroll training for a large workforce."), ["managed", "lead"], "non-initial gerund skipped");
  assert.equal(claimVerb("Payroll training for staff."), null);
  assert.equal(claimVerb("Payroll processing for a large workforce."), null);
  assert.deepEqual(verb("Training new hires on safety."), ["training", "train"], "a leading gerund counts");
  assert.deepEqual(verb("Experience managing payroll for a large workforce."), ["managing", "lead"]);

  for (const [text, family] of [
    ["Led payroll for a large workforce.", "lead"], ["Taught Excel workshops.", "train"], ["Personally managed payroll.", "lead"],
    ["Was responsible for and managed payroll.", "lead"], ["Have been managing payroll.", "lead"],
    ["Responsible for training new hires.", "train"], ["Shift supervisor for a team.", "lead"], ["Payroll Manager", "lead"],
  ]) assert.equal(activelySatisfies(text, family), true, `active: ${text}`);
  for (const [text, family] of [
    ["Was trained on safety.", "train"], ["Got trained on Excel.", "train"], ["Was supervised by the operations manager.", "lead"],
    ["Was paid through payroll.", "lead"], ["Completed safety procedures training with new hires.", "train"],
    ["Was paid via direct deposit.", "lead"],
  ]) assert.equal(activelySatisfies(text, family), false, `not active: ${text}`);

  for (const text of ["Was paid through payroll.", "Received payroll reports.", "Attended payroll training.", "Participated in payroll audits.", "Completed safety training."]) {
    assert.equal(hasRecipientMarker(text), true, `marker: ${text}`);
  }
  for (const text of ["Completed payroll migration.", "Handled payroll.", "Have been managing payroll.", "Received and processed customer orders.", "Payroll errors were reduced by 30%."]) {
    assert.equal(hasRecipientMarker(text), false, `no marker: ${text}`);
  }
  assert.equal(hasRecipientMarker("Handled payroll. Received a spot award for accuracy.", "Managed payroll for a large workforce."), false, "gated: the marker clause shares no requirement word");
  assert.ok(claimActionNote("managed").startsWith(CLAIM_ACTION_NOTE_PREFIX));
  assert.match(claimActionNote("managed"), /\("managed"\)/);
}

function requirement(item, index) {
  const kind = item.kind ?? "must-have";
  return { id: `req-${index}`, jobId: "job-claim", kind, text: item.requirement, normalizedTerm: null, importance: 1, sourceText: item.requirement, createdAt: NOW };
}

function evidence(item) {
  return {
    id: "evidence-claim", subjectType: item.subjectType ?? "achievement", organization: null, titleOrName: item.titleOrName ?? null,
    startDate: null, endDate: null, statement: item.evidence, action: null, context: null, skills: item.skills ?? [], methodsOrTools: [],
    scope: [], outcomes: item.outcomes ?? [], metrics: [], credential: null, verificationState: "user-confirmed", confidence: null,
    createdAt: NOW, updatedAt: NOW,
  };
}

function mapping(item, index) {
  return buildJobEvidenceCoverage("job-claim", [requirement(item, index)], [evidence(item)], NOW).items[0].mapping;
}

function corpus() {
  const raw = fs.readFileSync(CORPUS_PATH, "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(raw).digest("hex"), CORPUS_SHA256, "action corpus changed; version it deliberately");
  const data = JSON.parse(raw);
  data.affirmative.forEach((item, index) => {
    const result = mapping(item, index);
    assert.equal(result.classification, item.expected, `affirmative keeps its pre-change class: ${item.evidence}`);
    assert.ok(!result.explanation.includes(CLAIM_ACTION_NOTE_PREFIX), `no claim note: ${item.evidence}`);
  });
  data.capped.forEach((item, index) => {
    const result = mapping(item, 100 + index);
    assert.equal(result.classification, item.expected, `capped: ${item.evidence}`);
    assert.ok(result.explanation.includes(CLAIM_ACTION_NOTE_PREFIX), `claim note expected: ${item.evidence}`);
  });
  data.limitations.forEach((item, index) => {
    assert.equal(mapping(item, 200 + index).classification, item.observed, `limitation: ${item.evidence}`);
  });
  return data;
}

function g12Unchanged() {
  assert.ok(fs.existsSync(G12_CORPUS_PATH));
  G12_EXPECTED.affirmative.forEach((item, index) => {
    const result = mapping(item, 300 + index);
    assert.equal(result.classification, item.expected, `G12 affirmative unchanged: ${item.evidence}`);
    assert.ok(!result.explanation.includes(NEGATION_NOTE), `G12 affirmative has no negation note: ${item.evidence}`);
    assert.ok(!result.explanation.includes(CLAIM_ACTION_NOTE_PREFIX), `G12 affirmative not capped: ${item.evidence}`);
  });
  G12_EXPECTED.negated.forEach((item, index) => {
    const result = mapping(item, 400 + index);
    assert.equal(result.classification, item.expected, `G12 negated unchanged: ${item.evidence}`);
    assert.ok(result.explanation.includes(NEGATION_NOTE), `G12 negated keeps its negation note: ${item.evidence}`);
  });
}

units();
const data = corpus();
g12Unchanged();
console.log(`claim-action tests passed (corpus: ${data.affirmative.length} affirmative, ${data.capped.length} capped, ${data.limitations.length} limitations; G12 corpus unchanged)`);
