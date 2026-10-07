// Inference Slice A conformance (contract Draft 0.2). Runs the shared provider
// conformance harness against the synthetic fake provider, then checks the
// manifest, text policy, capability reporting and rewrite acceptance directly.
const assert = require("node:assert/strict");

const { createFakeProvider } = require("./support/inference-fake-provider.cjs");
const { harness, rewriteInput, runInferenceConformance } = require("./support/inference-conformance.cjs");
const { createTruthGate, testHmac } = require("./support/inference-fixtures.cjs");
const { computeTransmissionManifest } = require("../electron-runtime/electron/src/inference/manifest.cjs");
const { findExternalReferences } = require("../electron-runtime/electron/src/inference/text-policy.cjs");
const { acceptRewrite } = require("../electron-runtime/electron/src/inference/acceptance.cjs");
const {
  createInferenceRegistry,
  createProductionInferenceRegistry,
  reportInferenceCapability,
} = require("../electron-runtime/electron/src/inference/registry.cjs");

async function conformance() {
  const results = await runInferenceConformance(createFakeProvider);
  const failed = results.filter((item) => item.status === "fail");
  for (const item of failed) console.error(`FAIL ${item.name}\n${item.error}`);
  assert.equal(failed.length, 0, `${failed.length} conformance case(s) failed`);
  const passed = results.filter((item) => item.status === "pass").length;
  const notApplicable = results.filter((item) => item.status === "not-applicable").map((item) => item.name);
  console.log(`inference conformance: ${passed} passed; not applicable: ${notApplicable.join("; ")}`);
}

function manifestCoverage() {
  const rules = [{ prefix: "payload.covered", dataClass: "public-job-text", purpose: "test" }];
  assert.throws(
    () => computeTransmissionManifest({ payload: { covered: "a", uncovered: "b" }, context: {} }, rules, "in-process"),
    /not covered/,
  );
  assert.throws(
    () => computeTransmissionManifest({ payload: { covered: "a" }, context: { applicationId: "app-1" } }, rules, "in-process"),
    /not covered/,
    "context is part of what is transmitted",
  );
}

function textPolicy() {
  assert.deepEqual(findExternalReferences("Built CI/CD pipelines and ran A/B testing for regional teams."), []);
  assert.deepEqual(findExternalReferences("Coordinated scheduling for 12 field teams in 2023."), []);
  for (const text of ["See https://synthetic.invalid/x", "Email someone@example.org", "Call +1 (555) 010-0199", "Saved to C:\\Users\\x\\file.txt", "Read ~/notes/plan.md"]) {
    assert.ok(findExternalReferences(text).length > 0, text);
  }
}

function capability() {
  const production = createProductionInferenceRegistry();
  assert.equal(production.list().length, 0, "the production registry must be empty");
  for (const runtime of ["electron", "pwa"]) {
    assert.deepEqual(reportInferenceCapability(production, runtime), { available: false, reason: "not-configured" });
  }
  const remoteOnly = createInferenceRegistry();
  remoteOnly.register({ adapter: createFakeProvider("valid"), location: "remote", modelId: "m", timeoutMs: 10 });
  assert.deepEqual(reportInferenceCapability(remoteOnly, "electron"), { available: false, reason: "consent-required" });
}

async function reviewed(behavior = "valid") {
  const h = harness(createFakeProvider, behavior);
  const result = await h.broker.run(rewriteInput());
  assert.equal(result.status, "review-required");
  return { h, reviewed: { snapshot: result.snapshot, proposal: result.proposal, provenance: result.provenance, reviewToken: result.reviewToken } };
}

function writeSpy() {
  const writes = [];
  return { writes, updateStatement: async (id, update) => { writes.push({ id, update }); return { id, text: update.text }; } };
}

async function bindingChecks(truthGate) {
  const { h, reviewed: item } = await reviewed();
  const spy = writeSpy();
  const deps = { reader: h.reader, truthGate, hmac: testHmac, ...spy };
  const tampered = { ...item, proposal: { ...item.proposal, proposedText: `${item.proposal.proposedText} Visit https://synthetic.invalid` } };
  const forgedSnapshot = { ...item, snapshot: { ...item.snapshot, allowedText: ["https://synthetic.invalid"] } };
  const notPending = { ...item, provenance: { ...item.provenance, outcome: "accepted" } };
  for (const [label, candidate] of [["tampered proposal", tampered], ["forged snapshot", forgedSnapshot], ["non-pending record", notPending]]) {
    const result = await acceptRewrite(candidate, { userApproved: true }, deps);
    assert.equal(result.status, "failed", label);
    assert.deepEqual([result.failure.code, result.failure.phase], ["policy-violation", "acceptance"], label);
  }
  assert.equal(spy.writes.length, 0, "no binding failure may write");
  const throwing = await acceptRewrite(item, { userApproved: true },
    { ...deps, updateStatement: async () => { throw new Error("synthetic write failure"); } });
  assert.equal(throwing.status, "failed");
  assert.equal(throwing.provenance.outcome, "failed", "a failed domain write records a failed outcome");
}

async function acceptance() {
  const truthGate = createTruthGate();
  await bindingChecks(truthGate);
  let { h, reviewed: item } = await reviewed();
  let spy = writeSpy();
  const denied = await acceptRewrite(item, { userApproved: false }, { reader: h.reader, truthGate, hmac: testHmac, ...spy });
  assert.equal(denied.status, "failed");
  assert.equal(denied.failure.code, "policy-violation");
  assert.equal(spy.writes.length, 0);

  const accepted = await acceptRewrite(item, { userApproved: true }, { reader: h.reader, truthGate, hmac: testHmac, ...spy });
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.provenance.outcome, "accepted");
  assert.deepEqual(spy.writes, [{ id: "statement-scheduling", update: { text: item.proposal.proposedText } }]);

  for (const mutate of [
    (reader) => reader.editStatement("statement-scheduling", "Edited by the user after the request."),
    (reader) => reader.touchEvidence("evidence-scheduling"),
    (reader) => reader.deleteStatement("statement-scheduling"),
    (reader) => reader.deleteEvidence("evidence-scheduling"),
  ]) {
    ({ h, reviewed: item } = await reviewed());
    spy = writeSpy();
    mutate(h.reader);
    const stale = await acceptRewrite(item, { userApproved: true }, { reader: h.reader, truthGate, hmac: testHmac, ...spy });
    assert.equal(stale.status, "failed");
    assert.deepEqual([stale.failure.code, stale.failure.phase], ["validation-failed", "acceptance"]);
    assert.equal(stale.provenance.outcome, "failed");
    assert.equal(spy.writes.length, 0, "a stale proposal must never overwrite canonical state");
  }
}

async function run() {
  await conformance();
  manifestCoverage();
  textPolicy();
  capability();
  await acceptance();
  console.log("inference conformance tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
