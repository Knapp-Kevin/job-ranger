// Runs the deterministic baseline and the inference path over the SAME
// synthetic adversarial fixtures and asserts seam invariants: proposals never
// change deterministic coverage or assessment, unknowns stay unknown, injected
// text cannot widen scope, and unsupported or stale wording never passes.
// This measures no semantic lift; it is not benchmark evidence for adoption.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { buildJobEvidenceCoverage } = require("../electron-runtime/electron/src/requirement-mapper.cjs");
const { buildOpportunityAssessment } = require("../electron-runtime/src/shared/opportunity-assessment.js");
const { createFakeProvider } = require("./support/inference-fake-provider.cjs");
const { harness } = require("./support/inference-conformance.cjs");
const { FIXED, evidence, statement } = require("./support/inference-fixtures.cjs");

const FIXTURE_PATH = path.join(__dirname, "fixtures", "inference", "adversarial.json");
const EXPECTED_SHA256 = "6e499ddd34c905f6d66491c49d488f020bbc3bc7e3c3f63a69c728f6a1457427";
const NOW = FIXED;

function loadFixtures() {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8").replace(/\r\n/g, "\n");
  assert.equal(crypto.createHash("sha256").update(raw).digest("hex"), EXPECTED_SHA256, "fixture set changed; version it deliberately");
  return JSON.parse(raw);
}

const track = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "inference", "baseline-track.json"), "utf8"));

function world(fixture) {
  const records = fixture.evidence.map((item) => evidence(item.id, item));
  const requirement = { ...fixture.requirement, jobId: "job-synthetic", normalizedTerm: null, importance: 1, createdAt: NOW };
  const statements = [statement(`statement-${records[0].id}`, records[0].statement, [records[0].id])];
  return { records, statements, requirement };
}

function deterministic(w, records = w.records) {
  const coverage = buildJobEvidenceCoverage("job-synthetic", [w.requirement], records, NOW);
  const job = { id: "job-synthetic", title: "Coordinator", location: "Remote", employmentType: "Full-time",
    descriptionSnippet: w.requirement.sourceText, salaryMin: null, salaryText: null, sourceType: "greenhouse" };
  return JSON.stringify({ coverage, assessment: buildOpportunityAssessment(job, track, coverage, NOW) });
}

async function semanticInvariant(fixture, w, baseline) {
  const behavior = fixture.injection ? "valid" : "relationship-direct-on-gap";
  const h = harness(createFakeProvider, behavior, { world: w });
  const ids = w.records.map((item) => item.id);
  const canonicalBefore = h.reader.snapshotState();
  const result = await h.broker.run({ task: "semantic-evidence-support", providerId: "synthetic-fake",
    input: { jobId: "job-synthetic", requirement: w.requirement, evidenceIds: ids } });
  assert.equal(result.status, "review-required", `${fixture.category}: semantic proposal`);
  assert.ok(result.proposal.candidateEvidence.every((item) => ids.includes(item.evidenceId)));
  assert.equal(h.reader.snapshotState(), canonicalBefore, `${fixture.category}: the run wrote canonical state`);
  const after = deterministic(w, await h.reader.readEvidence(ids));
  assert.equal(after, baseline, `${fixture.category}: deterministic coverage/assessment changed after the proposal`);
  const unknownBefore = JSON.parse(baseline).coverage.items.filter((item) => item.mapping.classification === "gap").length;
  assert.equal(JSON.parse(after).coverage.items.filter((item) => item.mapping.classification === "gap").length, unknownBefore,
    `${fixture.category}: unknown/gap requirements must stay unknown`);
  if (fixture.injection) {
    const obey = harness(createFakeProvider, "obey-injection", { world: w });
    const rejected = await obey.broker.run({ task: "semantic-evidence-support", providerId: "synthetic-fake",
      input: { jobId: "job-synthetic", requirement: w.requirement, evidenceIds: ids } });
    assert.equal(rejected.failure.code, "invalid-response");
  }
}

async function rewriteInvariant(fixture, w) {
  const spec = fixture.rewrite;
  const options = { world: w, providerOptions: { negationRemovedText: spec.text, reassembledText: spec.text } };
  if (spec.staleDuringRequest) options.onInvoke = (reader) => async () => reader.touchEvidence(w.records[0].id);
  const h = harness(createFakeProvider, spec.behavior, options);
  const before = spec.staleDuringRequest ? null : h.reader.snapshotState();
  const result = await h.broker.run({ task: "rewrite-resume-statement", providerId: "synthetic-fake",
    input: { projectionId: "projection-synthetic", statementId: w.statements[0].id } });
  if (spec.behavior === "unsupported-metric" || spec.staleDuringRequest) {
    assert.equal(result.failure.code, "validation-failed", `${fixture.category}: must be rejected`);
    return "rejected";
  }
  // The deterministic gate cannot prove meaning: these pass it but stay review-required, never applied.
  assert.equal(result.status, "review-required", `${fixture.category}: must stay behind user review`);
  assert.equal(h.reader.snapshotState(), before, `${fixture.category}: nothing may be written before review`);
  return "review-required";
}

async function run() {
  const { fixtures } = loadFixtures();
  assert.equal(new Set(fixtures.map((item) => item.category)).size, 10, "all ten adversarial categories");
  const report = [];
  for (const fixture of fixtures) {
    const w = world(fixture);
    const baseline = deterministic(w);
    const classification = JSON.parse(baseline).coverage.items[0].mapping.classification;
    await semanticInvariant(fixture, w, baseline);
    const rewrite = fixture.rewrite ? await rewriteInvariant(fixture, w) : "n/a";
    report.push(`${fixture.category}: deterministic=${classification} rewrite=${rewrite}`);
  }
  console.log(report.join("\n"));
  console.log("inference adversarial fixture tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
