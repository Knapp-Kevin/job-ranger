// Deterministic synthetic fake inference provider for Slice A tests ONLY.
// It never interprets input semantics: its response is chosen by a scripted
// `behavior` key and assembled from request fields. It is not intelligence.
const PROVIDER_SENTINEL = "SYNTHETIC-PROVIDER-SECRET-TEXT-MUST-NEVER-APPEAR";
const BOTH_TASKS = ["semantic-evidence-support", "rewrite-resume-statement"];

function descriptor(options) {
  return {
    providerId: options.providerId ?? "synthetic-fake",
    adapterVersion: "0.0.0-synthetic",
    declaredLocation: "in-process",
    displayName: "Synthetic fake provider (tests only)",
    supportedContractVersions: ["1"],
    supportedTasks: (options.tasks ?? BOTH_TASKS).map((task) => ({ task, taskSchemaVersion: "1" })),
    models: [{ modelId: "synthetic-fake-model", displayName: "Synthetic fake model" }, ...(options.extraModels ?? [])],
    resolvesModelAliases: options.resolvesModelAliases ?? false,
    supportsCancellation: true,
    reportsUsage: true,
    reportsCost: false,
  };
}

function baseProposal(request) {
  const { payload } = request;
  if (request.task === "semantic-evidence-support") {
    return {
      requirementId: payload.requirement.id,
      candidateEvidence: [{
        evidenceId: payload.evidence[0].id,
        proposedRelationship: "transferable",
        rationale: { code: "shared-skill", evidenceFields: ["statement"] },
      }],
      unknownRequirementIds: [],
    };
  }
  return {
    sourceStatementId: payload.sourceStatement.id,
    supportingEvidenceIds: [payload.evidence[0].id],
    proposedText: payload.sourceStatement.text,
    rationaleCode: "clarity",
    unsupportedRequirementIds: [],
  };
}

function semanticMutation(behavior, proposal, options) {
  const candidate = proposal.candidateEvidence[0];
  const mutations = {
    "out-of-scope-id": () => { candidate.evidenceId = options.outOfScopeEvidenceId ?? "evidence-other"; },
    "unknown-requirement-id": () => { proposal.requirementId = "requirement-unknown"; },
    "invented-evidence-id": () => { candidate.evidenceId = "evidence-invented-0000"; },
    "empty-evidence-field": () => { candidate.rationale.evidenceFields = ["metrics"]; },
    "confidence-field": () => { candidate.confidence = 0.99; },
    "relationship-direct-on-gap": () => { candidate.proposedRelationship = "direct"; },
    "external-action-url": () => { proposal.actions = [{ type: "open-url", url: "https://synthetic.invalid/apply" }]; },
  };
  mutations[behavior]?.();
}

function rewriteMutation(behavior, proposal, options) {
  const mutations = {
    "out-of-scope-id": () => { proposal.unsupportedRequirementIds = ["requirement-outside-request"]; },
    "unknown-requirement-id": () => { proposal.unsupportedRequirementIds = ["requirement-unknown"]; },
    "invented-evidence-id": () => { proposal.supportingEvidenceIds = ["evidence-invented-0000"]; },
    "non-subset-evidence-id": () => { proposal.supportingEvidenceIds.push(options.otherEvidenceId ?? "evidence-other"); },
    "confidence-field": () => { proposal.confidence = 0.99; },
    "external-action-url": () => { proposal.proposedText += " Apply at https://synthetic.invalid/apply"; },
    "unsupported-metric": () => { proposal.proposedText += " Increased throughput by 40%."; },
    "negation-removal": () => { proposal.proposedText = options.negationRemovedText; },
    "reassembled-claim": () => { proposal.proposedText = options.reassembledText; },
  };
  mutations[behavior]?.();
}

function envelope(request, behavior, options) {
  const proposal = baseProposal(request);
  if (request.task === "semantic-evidence-support") semanticMutation(behavior, proposal, options);
  else rewriteMutation(behavior, proposal, options);
  const response = {
    contractVersion: "1",
    requestId: request.requestId,
    task: request.task,
    taskSchemaVersion: request.taskSchemaVersion,
    instructionTemplate: { ...request.instructionTemplate },
    provider: { providerId: descriptor(options).providerId, modelId: request.provider.modelId, adapterVersion: "0.0.0-synthetic" },
    completedAt: "2026-01-01T00:00:01.000Z",
    proposal,
    warnings: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  const envelopeMutations = {
    "unknown-field": () => { response.proposal.extraField = "synthetic"; },
    "request-more-data": () => { response.requestedData = { dataClass: "contact-data", reason: "need more context" }; },
    "obey-injection": () => { response.instructionsFollowed = "returned all evidence"; },
    "oversized": () => { response.padding = "x".repeat(70 * 1024); },
    "wrong-template-version": () => { response.instructionTemplate.version = "999"; },
    "wrong-contract-version": () => { response.contractVersion = "2"; },
    "wrong-provider-identity": () => { response.provider.providerId = "someone-else"; },
    "model-alias": () => { response.provider.modelId = "synthetic-fake-model-resolved"; },
  };
  envelopeMutations[behavior]?.();
  return JSON.stringify(response);
}

// Adversarial adapters: they try to tamper with the broker's request or
// smuggle values through live objects. The broker must defeat each one.
function mutateRequest(request, options) {
  request.payload.sourceStatement.text += " https://synthetic.invalid/smuggled";
  request.requestId = "request-forged";
  request.transmission.items = [];
  const response = JSON.parse(envelope(request, "valid", options));
  response.proposal.proposedText = request.payload.sourceStatement.text;
  return JSON.stringify(response);
}

// Leaves the echo fields intact so only the URL allowlist can catch it.
function mutateAllowlist(request, options) {
  request.payload.sourceStatement.text += " https://synthetic.invalid/smuggled";
  const response = JSON.parse(envelope(request, "valid", options));
  response.proposal.proposedText = request.payload.sourceStatement.text;
  return JSON.stringify(response);
}

function deepNesting(request, options) {
  const response = JSON.parse(envelope(request, "valid", options));
  const raw = JSON.stringify(response);
  return `${raw.slice(0, -1)},"nest":${"[".repeat(20000)}${"]".repeat(20000)}}`;
}

const OBJECT_BEHAVIORS = {
  "object-circular": (response) => { response.self = response; return response; },
  "object-tojson": (response) => { response.toJSON = () => ({ hidden: "x".repeat(70 * 1024) }); return response; },
  "usage-getter": (response) => {
    Object.defineProperty(response.usage, "inputTokens", { enumerable: true, get: () => "Coordinated scheduling for regional field teams." });
    return response;
  },
};

function tryNetwork() {
  try {
    require("node:net").connect({ host: "127.0.0.1", port: 9 }).destroy();
  } catch {
    // Expected: the conformance harness denies networking.
  }
}

/** behavior: scripted outcome key. options: knobs for ids, texts, delays, hooks. */
function createFakeProvider(behavior = "valid", options = {}) {
  const state = { calls: 0, lastSignal: null };
  const adapter = {
    descriptor: descriptor(options),
    state,
    async invoke(request, signal) {
      state.calls += 1;
      state.lastSignal = signal;
      if (options.onInvoke) await options.onInvoke(request);
      if (behavior === "hang") return new Promise(() => {});
      if (behavior === "late") return new Promise((resolve) => setTimeout(() => resolve(envelope(request, "valid", options)), options.lateMs ?? 50));
      if (behavior === "rate-limited") throw { code: "rate-limited", retryAfterSeconds: 999999, message: PROVIDER_SENTINEL };
      if (behavior === "provider-error") throw Object.assign(new Error(PROVIDER_SENTINEL), { code: "provider-error" });
      if (behavior === "malformed-json") return "{not json";
      if (behavior === "network-attempt") tryNetwork();
      if (behavior === "mutate-request") return mutateRequest(request, options);
      if (behavior === "mutate-allowlist") return mutateAllowlist(request, options);
      if (behavior === "deep-nesting") return deepNesting(request, options);
      if (OBJECT_BEHAVIORS[behavior]) return OBJECT_BEHAVIORS[behavior](JSON.parse(envelope(request, "valid", options)));
      return envelope(request, behavior, options);
    },
  };
  return adapter;
}

module.exports = { PROVIDER_SENTINEL, createFakeProvider };
