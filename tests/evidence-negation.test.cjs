// G12 (#167): deterministic negation handling for evidence text. Exact
// affirmedText outputs, the negation note rule, and the versioned phrasing
// corpus run through the real requirement mapper.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { affirmedText, negationChangedOutcome, NEGATION_NOTE } = require("../electron-runtime/electron/src/evidence-negation.cjs");
const { buildJobEvidenceCoverage } = require("../electron-runtime/electron/src/requirement-mapper.cjs");

const NOW = "2026-01-01T00:00:00.000Z";
const CORPUS_PATH = path.join(__dirname, "fixtures", "negation-corpus.v1.json");
const CORPUS_SHA256 = "beac71b653df4b6946f6090f3b55e5fa464d4c9ce548efe905e78d8476a1f8ab";
const collapse = (value) => value.replace(/\s+/g, " ").trim();

const TABLE = [
  ["Never approved the vendor budget; reviewed vendor budget drafts.", "; reviewed vendor budget drafts."],
  ["Approved budgets, not invoices.", "Approved budgets, ."],
  ["Did not manage payroll but supported payroll audits.", "Did but supported payroll audits."],
  ["No experience with Python", ""],
  ["Handled incident response without escalation", "Handled incident response"],
  ["Did not handle budgets, payroll, or invoices.", "Did ."],
  ["Did not manage payroll, approved budgets.", "Did , approved budgets."],
  ["Migrated ERP with no downtime, reducing operational costs by 20%.", "Migrated ERP with , reducing operational costs by 20%."],
  ["No prior SQL experience, taught myself SQL and built dashboards.", ", taught myself SQL and built dashboards."],
  ["Built pipelines instead of manual reports, cutting reporting time 50%.", "Built pipelines , cutting reporting time 50%."],
  ["Handled all HR functions except payroll.", "Handled all HR functions ."],
  ["Reviewed vendor budgets rather than approving them.", "Reviewed vendor budgets ."],
  ["Built SQL. Did not manage payroll.", "Built SQL. Did ."],
  ["Not yet PMP certified; exam scheduled for March.", "; exam scheduled for March."],
  ["Didn't approve vendor budgets.", "."],
  ["Didn’t approve vendor budgets.", "."],
  ["Worked not without supervision.", "Worked ."],
  ["Migrated 40 servers to AWS with no downtime and reduced hosting costs 30%.", "Migrated 40 servers to AWS with and reduced hosting costs 30%."],
  ["No experience with SQL, Python, or Tableau.", "."],
];

const UNCHANGED = [
  "Managed operations including but not limited to payroll, budgets, and vendor contracts.",
  "Managed no fewer than 12 engineers.",
  "Not only led the team but also hired staff.",
  "Built no-code automation tools.",
  "Led a not-for-profit fundraising program.",
  "Never missed a deadline, and reduced cycle time 15%.",
  "Notably reduced claim processing time by 30%.",
  "Coordinated scheduling for regional field teams.",
  "Gestionó presupuestos de proveedores.",
  "Supported Noëlle's payroll team and budgets.",
  "Hired a Notário for contract review.",
  "Built no‑code tools with a non-breaking hyphen.",
];

function exactOutputs() {
  for (const [input, expected] of TABLE) assert.equal(collapse(affirmedText(input)), expected, input);
  for (const input of UNCHANGED) assert.equal(affirmedText(input), input, `${input} must be unchanged`);
  assert.equal(affirmedText("Built SQL. Did not manage payroll."), "Built SQL. Did  .", "verbatim: punctuation outside negated spans is kept");
}

function noteRule() {
  assert.equal(negationChangedOutcome("direct", "transferable"), true);
  assert.equal(negationChangedOutcome("direct", "ambiguous"), true);
  assert.equal(negationChangedOutcome("ambiguous", "ambiguous"), false, "same outcome either way");
  assert.equal(negationChangedOutcome("gap", "gap"), false);
  assert.equal(negationChangedOutcome("transferable", "direct"), false);
  assert.match(NEGATION_NOTE, /negated form/);
  assert.ok(!NEGATION_NOTE.includes("only"), "the note must not overstate: adjacent affirmed text can still count");
}

function requirement(id, text) {
  // Built directly: corpus requirements are short and need not pass extractJobRequirements.
  return { id, jobId: "job-corpus", kind: "must-have", text, normalizedTerm: null, importance: 1, sourceText: text, createdAt: NOW };
}

function evidence(statement) {
  return {
    id: "evidence-corpus", subjectType: "achievement", organization: null, titleOrName: null, startDate: null, endDate: null,
    statement, action: null, context: null, skills: [], methodsOrTools: [], scope: [], outcomes: [], metrics: [], credential: null,
    verificationState: "user-confirmed", confidence: null, createdAt: NOW, updatedAt: NOW,
  };
}

function classify(item, index) {
  const coverage = buildJobEvidenceCoverage("job-corpus", [requirement(`req-${index}`, item.requirement)], [evidence(item.evidence)], NOW);
  return coverage.items[0].mapping;
}

function corpus() {
  const raw = fs.readFileSync(CORPUS_PATH, "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(raw).digest("hex"), CORPUS_SHA256, "negation corpus changed; version it deliberately");
  const data = JSON.parse(raw);
  data.affirmative.forEach((item, index) => {
    const mapping = classify(item, index);
    assert.equal(mapping.classification, item.expected, `affirmative must keep its pre-change class: ${item.evidence}`);
    assert.ok(!mapping.explanation.includes(NEGATION_NOTE), `no negation note: ${item.evidence}`);
  });
  data.negated.forEach((item, index) => {
    const mapping = classify(item, 100 + index);
    assert.equal(mapping.classification, item.expected, `negated must lose support: ${item.evidence}`);
    assert.ok(mapping.explanation.includes(NEGATION_NOTE), `negation note expected: ${item.evidence}`);
  });
  for (const item of data.limitations) assert.equal(collapse(affirmedText(item.evidence)), item.affirmed, `limitation: ${item.evidence}`);
  return data;
}

exactOutputs();
noteRule();
const data = corpus();
console.log(`evidence negation tests passed (corpus: ${data.affirmative.length} affirmative, ${data.negated.length} negated, ${data.limitations.length} limitations)`);
