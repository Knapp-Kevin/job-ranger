// Tests the actual provider-neutral inference broker and adjudicator.
// These are synthetic candidate hypotheses, NOT a real provider evaluation.
const assert = require("node:assert/strict");

const { createInferenceBroker } = require("../electron-runtime/electron/src/inference/broker.cjs");
const { createInferenceAdjudicator } = require("../electron-runtime/electron/src/inference/adjudicator.cjs");
const { createInferenceRegistry, createProductionInferenceRegistry } = require("../electron-runtime/electron/src/inference/registry.cjs");
const { createMemoryReader, createTruthGate, standardWorld, testHmac } = require("./support/inference-fixtures.cjs");

function validProposal(ids = []) {
  return {
    directions: [
      {
        direction: "Community program design",
        explorationRationale: "Explore whether coordination skills translate to community programs; this remains a hypothesis.",
        supportingEvidenceIds: ids,
        tradeoffs: ["Compensation and schedule may differ from current work."],
        validationQuestions: ["Would community-facing work fit your priorities?", "What requirements do real positions list?"],
        lowRiskNextStep: "Review three representative role descriptions before committing.",
      },
      {
        direction: "Independent service operations",
        explorationRationale: "A less conventional path could emphasize autonomy, if that is appealing.",
        supportingEvidenceIds: [],
        tradeoffs: ["Variable income and self-directed work require consideration."],
        validationQuestions: ["Does independence outweigh the need for predictable hours?"],
        lowRiskNextStep: "Talk to one practitioner and document actual constraints.",
      },
    ],
    openQuestions: ["Which responsibilities energize you?", "What matters more than role title?"],
  };
}

function harness(mutator = (proposal) => proposal, options = {}) {
  const reader = createMemoryReader(standardWorld());
  const registry = createInferenceRegistry();
  const state = { calls: 0, lastRequest: null };
  const provider = {
    descriptor: {
      providerId: "synthetic-exploration",
      adapterVersion: "1-test-only",
      declaredLocation: "in-process",
      displayName: "Synthetic exploratory proposal",
      supportedContractVersions: ["1"],
      supportedTasks: [{ task: "explore-career-paths", taskSchemaVersion: "1" }],
      models: [{ modelId: "fixture", displayName: "Scripted fixture" }],
      resolvesModelAliases: false,
      supportsCancellation: true,
      reportsUsage: false,
      reportsCost: false,
    },
    async invoke(request) {
      state.calls += 1;
      state.lastRequest = request;
      if (options.touchDuringInvoke) reader.touchEvidence(options.touchDuringInvoke);
      const proposed = validProposal(request.payload.evidence.map((item) => item.id));
      const proposal = mutator(proposed);
      return JSON.stringify({
        contractVersion: "1",
        requestId: request.requestId,
        task: request.task,
        taskSchemaVersion: request.taskSchemaVersion,
        instructionTemplate: { ...request.instructionTemplate },
        provider: { providerId: "synthetic-exploration", modelId: request.provider.modelId, adapterVersion: "1-test-only" },
        completedAt: "2026-01-01T00:00:01.000Z",
        proposal,
        warnings: [],
      });
    },
  };
  registry.register({ adapter: provider, location: "in-process", modelId: "fixture", timeoutMs: 1000 });
  const broker = createInferenceBroker({
    registry,
    adjudicator: createInferenceAdjudicator({ reader, truthGate: createTruthGate() }),
    reader, hmac: testHmac,
    clock: () => "2026-01-01T00:00:00.000Z",
    newRequestId: () => "path-exploration-1",
  });
  return { broker, reader, state };
}

const run = (h, input) => h.broker.run({ task: "explore-career-paths", providerId: "synthetic-exploration", input });

function failure(result, code, phase) {
  assert.equal(result.status, "failed");
  assert.deepEqual([result.failure.code, result.failure.phase], [code, phase]);
}

async function main() {
  assert.deepEqual(createProductionInferenceRegistry().list(), [],
    "the production registry must not gain an inference provider");

  {
    const h = harness();
    const before = h.reader.snapshotState();
    const result = await run(h, {
      goal: "Explore meaningful work outside the usual job-title labels.",
      preferences: ["Autonomy and supportive environments"],
      constraints: ["No mandatory overnight shifts"],
      evidenceIds: [],
    });
    assert.equal(result.status, "review-required", "goal-first users can explore without a resume");
    assert.equal(result.proposal.directions.length, 2, "multiple distinct paths may be proposed");
    assert.deepEqual(result.proposal.directions[0].supportingEvidenceIds, []);
    assert.equal(h.reader.snapshotState(), before, "exploration must never write canonical state");
    assert.deepEqual(h.state.lastRequest.payload.evidence, []);
    assert.deepEqual(h.state.lastRequest.policy, {
      proposalOnly: true, mayCreateFacts: false, mayWriteCanonicalState: false, mayPerformExternalActions: false,
    });
    assert.equal(h.state.lastRequest.transmission.containsPersonalCareerData, true,
      "user-supplied private career goals must be classified before transmission");
    assert.ok(h.state.lastRequest.transmission.items.some((i) => i.dataClass === "career-preferences"));
    assert.equal(result.provenance.outcome, "pending");
  }

  {
    const h = harness();
    const before = h.reader.snapshotState();
    const result = await run(h, {
      goal: "I want to change careers without recreating my entire background.",
      evidenceIds: ["evidence-scheduling"],
    });
    assert.equal(result.status, "review-required");
    assert.deepEqual(result.proposal.directions[0].supportingEvidenceIds, ["evidence-scheduling"]);
    assert.deepEqual(result.snapshot.requestIds.evidenceIds, ["evidence-scheduling"]);
    assert.equal(h.state.lastRequest.payload.evidence.length, 1);
    assert.equal(h.reader.snapshotState(), before);
    assert.ok(result.reviewToken && result.provenance.inputContentHash, "hypotheses retain provenance");
  }

  for (const [label, input, code] of [
    ["unconfirmed record", { goal: "Explore opportunities", evidenceIds: ["evidence-unconfirmed"] }, "policy-violation"],
    ["missing record", { goal: "Explore opportunities", evidenceIds: ["missing"] }, "validation-failed"],
    ["duplicate selection", { goal: "Explore opportunities", evidenceIds: ["evidence-scheduling", "evidence-scheduling"] }, "validation-failed"],
    ["extraneous input", { goal: "Explore opportunities", evidenceIds: [], additionalPrivateData: "secret" }, "validation-failed"],
    ["oversized goal", { goal: "X".repeat(601), evidenceIds: [] }, "validation-failed"],
    ["blank goal", { goal: "   ", evidenceIds: [] }, "validation-failed"],
  ]) {
    const h = harness();
    const result = await run(h, input);
    failure(result, code, "pre-transmission");
    assert.equal(h.state.calls, 0, `${label} must not be transmitted`);
  }

  for (const [label, mutator, code] of [
    ["invented supporting evidence", (p) => { p.directions[0].supportingEvidenceIds = ["invented"]; return p; }, "policy-violation"],
    ["attempted write/action", (p) => { p.actions = [{ operation: "save-track", id: "x" }]; return p; }, "invalid-response"],
    ["introduced URL", (p) => { p.directions[0].lowRiskNextStep = "Visit https://synthetic.invalid/apply"; return p; }, "policy-violation"],
    ["introduced email", (p) => { p.openQuestions.push("Email person@example.org"); return p; }, "policy-violation"],
    ["fabricated confidence", (p) => { p.directions[0].confidence = 0.99; return p; }, "invalid-response"],
    ["oversized rationale", (p) => { p.directions[0].explorationRationale = "x".repeat(801); return p; }, "invalid-response"],
    ["no validation question", (p) => { p.directions[0].validationQuestions = []; return p; }, "invalid-response"],
    ["empty list of choices", (p) => { p.directions = []; return p; }, "invalid-response"],
  ]) {
    const h = harness(mutator);
    const before = h.reader.snapshotState();
    const result = await run(h, { goal: "Explore career pathways", evidenceIds: ["evidence-scheduling"] });
    failure(result, code, "validation");
    assert.equal(h.reader.snapshotState(), before, `${label}: no canonical writes`);
  }

  {
    const h = harness((p) => p, { touchDuringInvoke: "evidence-scheduling" });
    const result = await run(h, { goal: "Explore career pathways", evidenceIds: ["evidence-scheduling"] });
    failure(result, "validation-failed", "validation");
  }

  {
    const h = harness((p) => {
      p.directions[0].direction = "Invent a new category combining community service and operations";
      p.directions[0].validationQuestions = ["Does this uncommon work configuration exist locally?"];
      return p;
    });
    const result = await run(h, { goal: "Invent an unconventional career direction", evidenceIds: [] });
    assert.equal(result.status, "review-required", "role vocabulary is not a closed taxonomy");
    assert.equal(result.proposal.directions[0].direction,
      "Invent a new category combining community service and operations");
  }

  console.log("inference career-path exploration tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
