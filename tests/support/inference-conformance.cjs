// Shared provider conformance harness (contract Draft 0.2 "Provider
// conformance"). runInferenceConformance(createProvider) runs every case that
// applies to an in-process provider, each with networking denied.
const assert = require("node:assert/strict");

const { createInferenceBroker } = require("../../electron-runtime/electron/src/inference/broker.cjs");
const { createInferenceAdjudicator } = require("../../electron-runtime/electron/src/inference/adjudicator.cjs");
const { createInferenceRegistry } = require("../../electron-runtime/electron/src/inference/registry.cjs");
const { createMemoryReader, createTruthGate, nextRequestId, standardWorld, testHmac } = require("./inference-fixtures.cjs");
const { withNetworkDenied } = require("./inference-network-denial.cjs");
const { CASES } = require("./inference-conformance-cases.cjs");

const NOT_APPLICABLE = [
  "remote consent enforcement (no non-in-process adapter exists in Slice A)",
  "loopback consent enforcement (no non-in-process adapter exists in Slice A)",
];

/** Builds a broker around one provider; extra providers prove no hidden fallback. */
function harness(createProvider, behavior, options = {}) {
  const world = options.world ?? standardWorld();
  const reader = createMemoryReader(world);
  const provider = createProvider(behavior, { ...options.providerOptions, onInvoke: options.onInvoke?.(reader) });
  const registry = createInferenceRegistry();
  registry.register({ adapter: provider, location: options.location ?? "in-process", modelId: "synthetic-fake-model", timeoutMs: options.timeoutMs ?? 200 });
  for (const extra of options.extraProviders ?? []) {
    registry.register({ adapter: extra, location: "in-process", modelId: "synthetic-fake-model", timeoutMs: 200 });
  }
  const real = createInferenceAdjudicator({ reader, truthGate: createTruthGate() });
  const adjudications = { count: 0 };
  const adjudicator = { adjudicate: (...args) => { adjudications.count += 1; return real.adjudicate(...args); } };
  const broker = createInferenceBroker({ registry, adjudicator, reader, hmac: testHmac, clock: () => "2026-01-01T00:00:00.000Z", newRequestId: nextRequestId });
  return { world, reader, provider, registry, broker, adjudications };
}

function semanticInput(world, evidenceIds = ["evidence-scheduling"]) {
  return { task: "semantic-evidence-support", providerId: "synthetic-fake",
    input: { jobId: "job-synthetic", requirement: world.requirement, evidenceIds } };
}

function rewriteInput(statementId = "statement-scheduling") {
  return { task: "rewrite-resume-statement", providerId: "synthetic-fake",
    input: { projectionId: "projection-synthetic", statementId, jobId: "job-synthetic",
      requirements: [{ id: "requirement-scheduling", sourceText: "Experience coordinating field schedules." }] } };
}

function expectFailure(result, code, phase) {
  assert.equal(result.status, "failed", `expected failure ${code}, got ${result.status}`);
  assert.equal(result.failure.code, code);
  if (phase) assert.equal(result.failure.phase, phase);
}

async function runInferenceConformance(createProvider) {
  const tools = { harness: (behavior, options) => harness(createProvider, behavior, options), semanticInput, rewriteInput, expectFailure, createProvider };
  const results = [];
  for (const [name, run] of CASES) {
    try {
      const { attempts, value } = await withNetworkDenied(() => run(tools));
      const allowed = value?.expectNetworkAttempt === true;
      if (allowed) assert.ok(attempts.length > 0, "the network-denial check must catch the attempt");
      else assert.deepEqual(attempts, [], "providers must not attempt network access");
      results.push({ name, status: "pass" });
    } catch (error) {
      results.push({ name, status: "fail", error: error.stack ?? String(error) });
    }
  }
  for (const name of NOT_APPLICABLE) results.push({ name, status: "not-applicable" });
  return results;
}

module.exports = { runInferenceConformance, harness, semanticInput, rewriteInput, expectFailure };
