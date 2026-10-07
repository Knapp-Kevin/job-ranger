// Conformance cases. Each receives harness tools and asserts exact outcomes.
const assert = require("node:assert/strict");
const { PROVIDER_SENTINEL } = require("./inference-fake-provider.cjs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const HEX64 = /^[0-9a-f]{64}$/;

function assertProvenance(provenance, outcome) {
  assert.equal(provenance.outcome, outcome);
  assert.equal(provenance.contractVersion, "1");
  assert.equal(provenance.taskSchemaVersion, "1");
  assert.ok(provenance.instructionTemplateId && provenance.instructionTemplateVersion === "1");
  assert.equal(provenance.providerId, "synthetic-fake");
  assert.equal(provenance.requestedModelId, "synthetic-fake-model");
  assert.equal(provenance.providerLocation, "in-process");
  assert.equal(provenance.adapterVersion, "0.0.0-synthetic");
  assert.match(provenance.providerSettingsHash, HEX64);
  assert.match(provenance.inputContentHash, HEX64);
  assert.ok(provenance.inputRecordIds.length > 0);
}

const rejectsAs = (behavior, task, code) => async (t) => {
  const h = t.harness(behavior);
  const result = await h.broker.run(task === "semantic" ? t.semanticInput(h.world) : t.rewriteInput());
  t.expectFailure(result, code, "validation");
  assert.equal(result.provenance.outcome, "rejected");
};

const CASES = [
  ["valid response: semantic-evidence-support", async (t) => {
    const h = t.harness("valid");
    const result = await h.broker.run(t.semanticInput(h.world));
    assert.equal(result.status, "review-required");
    assertProvenance(result.provenance, "pending");
    assert.match(result.provenance.outputContentHash, HEX64);
  }],
  ["valid response: rewrite-resume-statement stays review-required, nothing written", async (t) => {
    const h = t.harness("valid");
    const before = h.reader.snapshotState();
    const result = await h.broker.run(t.rewriteInput());
    assert.equal(result.status, "review-required");
    assertProvenance(result.provenance, "pending");
    assert.equal(h.reader.snapshotState(), before);
  }],
  ["malformed JSON is rejected", rejectsAs("malformed-json", "semantic", "invalid-response")],
  ["unknown field is rejected (closed schema)", rejectsAs("unknown-field", "rewrite", "invalid-response")],
  ["unknown requirement ID is rejected", rejectsAs("unknown-requirement-id", "semantic", "policy-violation")],
  ["out-of-request-scope evidence ID is rejected", rejectsAs("out-of-scope-id", "semantic", "policy-violation")],
  ["out-of-request-scope requirement ID in a rewrite is rejected", rejectsAs("out-of-scope-id", "rewrite", "policy-violation")],
  ["invented evidence ID is rejected (semantic)", rejectsAs("invented-evidence-id", "semantic", "policy-violation")],
  ["invented evidence ID is rejected (rewrite)", rejectsAs("invented-evidence-id", "rewrite", "policy-violation")],
  ["rewrite evidence outside the source statement's set is rejected", rejectsAs("non-subset-evidence-id", "rewrite", "policy-violation")],
  ["rationale naming an empty evidence field is rejected", rejectsAs("empty-evidence-field", "semantic", "validation-failed")],
  ["oversized output is rejected", rejectsAs("oversized", "semantic", "invalid-response")],
  ["provider requesting more local data is rejected", rejectsAs("request-more-data", "semantic", "invalid-response")],
  ["prompt-injected behavior cannot add fields", rejectsAs("obey-injection", "semantic", "invalid-response")],
  ["external action field is rejected", rejectsAs("external-action-url", "semantic", "invalid-response")],
  ["URL introduced into rewrite text is rejected", rejectsAs("external-action-url", "rewrite", "policy-violation")],
  ["confidence field is rejected (semantic)", rejectsAs("confidence-field", "semantic", "invalid-response")],
  ["confidence field is rejected (rewrite)", rejectsAs("confidence-field", "rewrite", "invalid-response")],
  ["unsupported metric in a rewrite is blocked by the unchanged Truth Gate", rejectsAs("unsupported-metric", "rewrite", "validation-failed")],
  ["instruction template version mismatch is rejected", rejectsAs("wrong-template-version", "semantic", "invalid-response")],
  ["contract version mismatch is rejected", rejectsAs("wrong-contract-version", "semantic", "invalid-response")],
  ["unknown provider identity is rejected", rejectsAs("wrong-provider-identity", "semantic", "invalid-response")],
  ["model mismatch is rejected without alias resolution", rejectsAs("model-alias", "semantic", "invalid-response")],
  ["model alias is accepted and recorded when the descriptor resolves aliases to a declared model", async (t) => {
    const h = t.harness("model-alias", { providerOptions: { resolvesModelAliases: true,
      extraModels: [{ modelId: "synthetic-fake-model-resolved", displayName: "Resolved" }] } });
    const result = await h.broker.run(t.semanticInput(h.world));
    assert.equal(result.status, "review-required");
    assert.equal(result.provenance.requestedModelId, "synthetic-fake-model");
    assert.equal(result.provenance.resolvedModelId, "synthetic-fake-model-resolved");
  }],
  ["resolved model that is not declared is rejected even with alias resolution", async (t) => {
    const h = t.harness("model-alias", { providerOptions: { resolvesModelAliases: true } });
    t.expectFailure(await h.broker.run(t.semanticInput(h.world)), "invalid-response", "validation");
  }],
  ["adapter mutating its request copy cannot widen the URL allowlist, forge the echo or shrink the manifest", async (t) => {
    const h = t.harness("mutate-request");
    const result = await h.broker.run(t.rewriteInput());
    t.expectFailure(result, "invalid-response", "validation");
    assert.ok(result.provenance.inputRecordIds.includes("evidence-scheduling"), "manifest/provenance must come from the broker's copy");
  }],
  ["adapter adding a URL to its request copy cannot widen the private allowlist", rejectsAs("mutate-allowlist", "rewrite", "policy-violation")],
  ["circular object response is rejected, not thrown", rejectsAs("object-circular", "semantic", "invalid-response")],
  ["object response with toJSON cannot bypass the size bound or validation", rejectsAs("object-tojson", "semantic", "invalid-response")],
  ["usage getter cannot smuggle text into provenance", rejectsAs("usage-getter", "semantic", "invalid-response")],
  ["deeply nested response is rejected, not thrown", rejectsAs("deep-nesting", "semantic", "invalid-response")],
  ["unknown requirement ID in a rewrite is rejected", rejectsAs("unknown-requirement-id", "rewrite", "policy-violation")],
  ["stale evidence between request and adjudication is rejected (semantic)", async (t) => {
    const h = t.harness("valid", { onInvoke: (reader) => async () => reader.touchEvidence("evidence-scheduling") });
    t.expectFailure(await h.broker.run(t.semanticInput(h.world)), "validation-failed", "validation");
  }],
  ["rewrite of a statement backed by unconfirmed evidence is refused at request build", async (t) => {
    const world = require("./inference-fixtures.cjs").standardWorld();
    world.statements.push(require("./inference-fixtures.cjs").statement("statement-unconfirmed", "Imported claim awaiting review.", ["evidence-unconfirmed"]));
    const h = t.harness("valid", { world });
    t.expectFailure(await h.broker.run(t.rewriteInput("statement-unconfirmed")), "policy-violation", "pre-transmission");
    assert.equal(h.provider.state.calls, 0);
  }],
  ["timeout: hanging provider fails as timeout after one call", async (t) => {
    const h = t.harness("hang", { timeoutMs: 30 });
    const result = await h.broker.run(t.semanticInput(h.world));
    t.expectFailure(result, "timeout", "provider");
    assert.equal(h.provider.state.calls, 1);
    assert.equal(h.provider.state.lastSignal.aborted, true);
  }],
  ["cancellation: caller abort fails as cancelled after one call", async (t) => {
    const controller = new AbortController();
    const h = t.harness("hang", { timeoutMs: 1000 });
    setTimeout(() => controller.abort(), 10);
    const result = await h.broker.run({ ...t.semanticInput(h.world), signal: controller.signal });
    t.expectFailure(result, "cancelled", "provider");
    assert.equal(h.provider.state.calls, 1);
    assert.equal(h.provider.state.lastSignal.aborted, true);
  }],
  ["late response after cancellation is discarded, never adjudicated", async (t) => {
    const controller = new AbortController();
    const h = t.harness("late", { providerOptions: { lateMs: 40 }, timeoutMs: 1000 });
    setTimeout(() => controller.abort(), 5);
    const result = await h.broker.run({ ...t.semanticInput(h.world), signal: controller.signal });
    t.expectFailure(result, "cancelled", "provider");
    await wait(80);
    assert.equal(h.adjudications.count, 0);
  }],
  ["rate limit is represented with a clamped retry hint and no provider text", async (t) => {
    const h = t.harness("rate-limited");
    const result = await h.broker.run(t.semanticInput(h.world));
    t.expectFailure(result, "rate-limited", "provider");
    assert.equal(result.failure.retryAfterSeconds, 3600);
    assert.equal(h.provider.state.calls, 1, "no automatic retry");
    assert.ok(!JSON.stringify(result).includes(PROVIDER_SENTINEL));
  }],
  ["provider error carries no provider text and leaves state unchanged", async (t) => {
    const h = t.harness("provider-error");
    const before = h.reader.snapshotState();
    const result = await h.broker.run(t.rewriteInput());
    t.expectFailure(result, "provider-error", "provider");
    assert.equal(result.provenance.outcome, "failed");
    assert.ok(!JSON.stringify(result).includes(PROVIDER_SENTINEL));
    assert.equal(h.reader.snapshotState(), before);
  }],
  ["no hidden fallback: a second provider is never called", async (t) => {
    const second = t.createProvider("valid", { providerId: "synthetic-fake-second" });
    const h = t.harness("provider-error", { extraProviders: [second] });
    const result = await h.broker.run(t.semanticInput(h.world));
    t.expectFailure(result, "provider-error", "provider");
    assert.equal(second.state.calls, 0);
  }],
  ["remote-classified provider is refused before any call", async (t) => {
    const h = t.harness("valid", { location: "remote" });
    t.expectFailure(await h.broker.run(t.semanticInput(h.world)), "consent-required", "pre-transmission");
    assert.equal(h.provider.state.calls, 0);
  }],
  ["loopback-classified provider is refused before any call", async (t) => {
    const h = t.harness("valid", { location: "loopback" });
    t.expectFailure(await h.broker.run(t.semanticInput(h.world)), "consent-required", "pre-transmission");
    assert.equal(h.provider.state.calls, 0);
  }],
  ["unconfirmed evidence is refused at request build", async (t) => {
    const h = t.harness("valid");
    const result = await h.broker.run(t.semanticInput(h.world, ["evidence-scheduling", "evidence-unconfirmed"]));
    t.expectFailure(result, "policy-violation", "pre-transmission");
    assert.equal(h.provider.state.calls, 0);
  }],
  ["unregistered task and unregistered provider fail closed", async (t) => {
    const h = t.harness("valid");
    t.expectFailure(await h.broker.run({ task: "draft-career-story", providerId: "synthetic-fake", input: {} }), "unsupported-task", "pre-transmission");
    t.expectFailure(await h.broker.run({ ...t.semanticInput(h.world), providerId: "absent" }), "not-configured", "pre-transmission");
  }],
  ["stale evidence between request and adjudication is rejected", async (t) => {
    const h = t.harness("valid", { onInvoke: (reader) => async () => reader.touchEvidence("evidence-scheduling") });
    t.expectFailure(await h.broker.run(t.rewriteInput()), "validation-failed", "validation");
  }],
  ["manifest covers every transmitted field with correct classes and records", async (t) => {
    const h = t.harness("valid");
    const result = await h.broker.run(t.rewriteInput());
    const manifest = result.request.transmission;
    assert.equal(manifest.location, "in-process");
    assert.equal(manifest.containsPersonalCareerData, true);
    assert.deepEqual(manifest.items.map((item) => item.dataClass).sort(), ["career-evidence", "public-job-text", "resume-content"]);
    const recordIds = manifest.items.flatMap((item) => item.recordIds);
    for (const id of ["statement-scheduling", "evidence-scheduling", "requirement-scheduling"]) assert.ok(recordIds.includes(id), id);
  }],
  ["provenance holds versions and keyed hashes but no raw text", async (t) => {
    const h = t.harness("valid");
    const result = await h.broker.run(t.rewriteInput());
    const serialized = JSON.stringify(result.provenance);
    for (const raw of ["Coordinated scheduling", "regional field teams", "Experience coordinating"]) {
      assert.ok(!serialized.includes(raw), `provenance leaked "${raw}"`);
    }
  }],
  ["network-denial check: a valid provider makes no network attempt", async (t) => {
    const h = t.harness("valid");
    assert.equal((await h.broker.run(t.semanticInput(h.world))).status, "review-required");
  }],
  ["network-denial check catches a network attempt", async (t) => {
    const h = t.harness("network-attempt");
    await h.broker.run(t.semanticInput(h.world));
    return { expectNetworkAttempt: true };
  }],
];

module.exports = { CASES };
