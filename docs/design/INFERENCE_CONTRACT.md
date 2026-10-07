# Inference Contract

Status: **Draft 0.1 — architecture contract only; no provider implementation authorized**  
Owner: #162  
Prior constraints: #59, #64

## Purpose

Job Ranger is deliberately useful without probabilistic inference. Its canonical career state, requirement/evidence model, opportunity assessment, document gates, application lifecycle, and portability model are deterministic and local-first.

Optional inference may improve semantic interpretation, drafting, explanation, and prioritization. It must not become a second authority for career truth or a hidden prerequisite for the product.

This document defines the provider-neutral boundary between Job Ranger's deterministic core and any future local or remote inference provider.

The governing rule is:

> **Inference returns proposals. Job Ranger validates, explains, and decides what may enter product state.**

A model response is never Career Evidence, eligibility truth, an application action, or an approved factual claim merely because a provider returned it.

## Goals

The inference boundary must:

1. allow useful semantic and language assistance without provider lock-in;
2. preserve Career Evidence and user authority;
3. preserve a deterministic no-inference path for every enhanced workflow;
4. make data leaving the device explicit before remote transmission;
5. keep provider responses schema-bounded and provenance-linked;
6. prevent model output from directly mutating canonical state;
7. work across Job Ranger runtimes only where the runtime can satisfy the same security contract;
8. make failure degrade to deterministic behavior rather than product failure;
9. preserve enough local provenance to explain how inference-assisted output was produced;
10. allow future providers to be tested through one conformance contract.

## Non-goals

This contract does not:

- choose OpenAI, Anthropic, Gemini, Ollama, or any other provider;
- add a generic agent runtime;
- grant models arbitrary tools, filesystem access, browser control, or application-write authority;
- make inference required for Job Ranger;
- permit autonomous application submission;
- permit inference to establish factual Career Evidence;
- permit inference to override the Truth Gate, Parseability Gate, source approval, network policy, or user confirmation;
- permit an opaque hiring-probability score;
- authorize remote inference implementation merely because this document exists.

Any remote implementation remains a security/privacy boundary change under `GOVERNANCE.md`.

## Authority model

The existing Job Ranger authority hierarchy does not change.

```text
Canonical local state
  Career Evidence / Target Tracks / Jobs / Applications
                  |
                  v
       deterministic preparation
  requirements / coverage / context / allowed facts
                  |
                  v
        InferenceBroker (shared core)
  policy + minimization + consent + schema contract
                  |
                  v
     InferenceProviderAdapter (replaceable)
       local model OR governed remote provider
                  |
                  v
        schema-bounded proposal only
                  |
                  v
       deterministic adjudication
  IDs / provenance / claim support / policy / gates
                  |
                  v
           user review where required
                  |
                  v
       canonical write through existing service
```

### What remains authoritative

- **Career Evidence** remains the factual career authority.
- **Target Tracks** remain the user's intent/preferences authority.
- **preserved job/source text** remains the authority for what Job Ranger actually observed in a listing.
- **Applications** remain lifecycle authority.
- **deterministic gates** remain blocking controls.
- **the user** remains the authority for confirming imported/proposed career facts and consequential external actions.

### What inference may be

Inference may be:

- an extractor that proposes structure from untrusted text;
- a semantic assistant that proposes likely relationships;
- a drafting assistant that proposes evidence-linked wording;
- an explainer that translates deterministic state into clearer language;
- a prioritization assistant that proposes ordering while exposing its inputs;
- a practice assistant for interview or reflection workflows.

Inference is not canonical storage and is not a permission boundary.

## Architectural components

### InferenceBroker

A shared-core `InferenceBroker` owns the product contract.

It is responsible for:

- accepting only registered inference task types;
- constructing the minimum request payload from canonical state;
- producing the pre-transmission manifest;
- enforcing runtime/provider policy;
- requiring remote-data consent when applicable;
- invoking a provider adapter;
- validating the returned envelope and task schema;
- rejecting references outside the request scope;
- applying deterministic output validators;
- returning an `InferenceProposalResult` to the calling domain service.

The broker does **not** write Career Evidence, applications, resumes, target tracks, sources, or settings.

### InferenceProviderAdapter

A provider adapter is narrow and replaceable.

It may:

- report capabilities;
- report whether it is local or remote;
- receive one versioned request envelope;
- return one versioned response envelope;
- expose bounded usage/cost metadata when the provider supplies it;
- support cancellation.

It may not:

- read arbitrary application state;
- read arbitrary files;
- choose additional data to send;
- call Job Ranger domain services;
- perform browser automation;
- write canonical state;
- silently invoke another provider;
- silently retain credentials in Job Ranger content stores.

Provider-specific prompt construction belongs behind this adapter boundary. Provider-specific concepts must not leak into domain contracts.

### Runtime support

Inference capability is runtime-gated.

A runtime must not advertise inference merely because another runtime can support it.

Examples:

- Electron may eventually support a local model or a remote provider through a governed secret store and transport.
- A PWA must not store long-lived provider API keys in ordinary application state or in a portable `.jobranger` archive.
- A PWA remote-provider path requires a separately approved credential/transport design before it can claim parity.
- A local browser-accessible inference endpoint must still satisfy browser origin/CORS/network policy and explicit provider configuration.

Runtime capability reporting remains an environment fact, not product truth.

## Capability handshake

Every adapter exposes a versioned descriptor.

```ts
type InferenceLocation = "local" | "remote";

type InferenceTask =
  | "extract-career-evidence"
  | "extract-job-requirements"
  | "semantic-evidence-support"
  | "rewrite-resume-statement"
  | "draft-application-material"
  | "draft-career-story"
  | "draft-interview-practice"
  | "explain-opportunity"
  | "prioritize-opportunities"
  | "interpret-search-insight";

interface InferenceProviderDescriptor {
  providerId: string;
  adapterVersion: string;
  location: InferenceLocation;
  displayName: string;
  supportedContractVersions: string[];
  supportedTasks: InferenceTask[];
  models: Array<{
    modelId: string;
    displayName: string;
    contextLimit?: number;
  }>;
  supportsCancellation: boolean;
  reportsUsage: boolean;
  reportsCost: boolean;
}
```

Task support is explicit. There is no `"generic-agent"` or unrestricted `"chat-with-all-my-data"` task in this contract.

Adding a new task type is an architecture change because it defines a new data and authority boundary.

## Request envelope

All providers receive the same logical request envelope after task-specific minimization.

```ts
interface InferenceRequestEnvelope<TTask extends InferenceTask, TPayload> {
  contractVersion: "1";
  requestId: string;
  task: TTask;
  createdAt: string;

  provider: {
    providerId: string;
    modelId: string;
    location: InferenceLocation;
  };

  policy: {
    proposalOnly: true;
    mayCreateFacts: false;
    mayWriteCanonicalState: false;
    mayPerformExternalActions: false;
  };

  transmission: InferenceTransmissionManifest;

  context: {
    locale?: string;
    targetTrackId?: string;
    jobId?: string;
    applicationId?: string;
    sourceArtifactIds?: string[];
    evidenceIds?: string[];
  };

  payload: TPayload;
}
```

The task payload must contain only data needed for that task. The provider never receives a database-shaped dump.

## Data classes and transmission manifest

Job Ranger records what a request contains **before** a remote call is made.

```ts
type InferenceDataClass =
  | "public-job-text"
  | "career-evidence"
  | "career-preferences"
  | "resume-content"
  | "application-material"
  | "application-history"
  | "interview-content"
  | "contact-data"
  | "credential-identifiers";

interface InferenceTransmissionItem {
  dataClass: InferenceDataClass;
  purpose: string;
  recordIds: string[];
  fields: string[];
  redactions: string[];
}

interface InferenceTransmissionManifest {
  location: InferenceLocation;
  items: InferenceTransmissionItem[];
  containsPersonalCareerData: boolean;
  consentReceiptId: string | null;
}
```

### Minimization rules

- Send canonical IDs plus the minimum text/fields required for the task.
- Do not send the full Career Evidence store when three evidence records are sufficient.
- Do not send phone, email, street address, credential ID, contact names, notes, or unrelated application history by default.
- Provider prompts must not embed secrets.
- Provider configuration does not imply permission to transmit every data class.
- A task contract may prohibit a data class even if the user has configured a remote provider.

### Remote consent

Remote inference requires disclosure that clearly identifies:

- provider;
- model when known;
- whether the provider is remote;
- data classes that will leave the device;
- why each class is required;
- whether raw content is expected to be retained by Job Ranger after completion;
- known provider-side retention/training status when Job Ranger can state it from configured provider policy.

Consent must be specific enough to distinguish, for example, sending a public job description from sending private Career Evidence.

A future UI may allow remembered consent per provider + capability + data-class set. Broad "AI enabled" consent is insufficient.

Revoking consent prevents future calls. It does not rewrite already accepted local artifacts.

## Untrusted input and prompt injection

Resume text, job descriptions, employer pages, imported documents, application notes, and model output are all untrusted input.

Provider instructions must treat user/source text as **data**, not instructions.

No inference task may allow untrusted content to:

- change system/provider policy;
- request more local data;
- select files;
- retrieve URLs;
- invoke tools;
- change provider/model configuration;
- write canonical state;
- submit applications;
- weaken deterministic gates.

If a provider response requests another action or more data, the broker ignores that request unless the product has an independently defined task contract for it.

## Response envelope

A provider returns a typed envelope, not free-form product state.

```ts
interface InferenceResponseEnvelope<TProposal> {
  contractVersion: "1";
  requestId: string;
  task: InferenceTask;

  provider: {
    providerId: string;
    modelId: string;
    adapterVersion: string;
  };

  completedAt: string;

  proposal: TProposal;

  warnings: Array<{
    code: string;
    message: string;
  }>;

  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
    currency?: string;
  };
}
```

Provider-returned numeric confidence is not a hiring probability and must not become product truth. If retained, it is provider metadata only.

Product-facing uncertainty must be represented through explicit support, gaps, unknowns, warnings, and provenance.

## Proposal contracts

### Career Evidence extraction

Inference may propose Candidate Evidence from a preserved source artifact.

Every proposal must include:

- proposed fields;
- source artifact ID;
- source snapshot/hash;
- source span or quoted fragment sufficient to review provenance;
- no invented facts.

The result enters the same review path as deterministic extraction. It is not factual Career Evidence until user-confirmed.

### Job requirement extraction

Inference may propose additional or differently segmented requirements.

Every proposed requirement must:

- reference the saved job/source record;
- point to observed source text;
- identify its proposed kind;
- remain a proposal until accepted by the domain path defined for requirements.

Inference may not infer a missing employer requirement from general occupational knowledge and present it as though the listing stated it.

### Semantic evidence support

Inference may propose that one or more Career Evidence records are semantically relevant to a job requirement.

A semantic support proposal contains:

```ts
interface SemanticEvidenceSupportProposal {
  requirementId: string;
  candidateEvidence: Array<{
    evidenceId: string;
    proposedRelationship: "direct" | "transferable" | "ambiguous";
    rationale: string;
  }>;
  unknowns: string[];
}
```

The provider may reference only requirement/evidence IDs supplied in the request.

Draft v1 does **not** allow a semantic proposal to overwrite the canonical deterministic `RequirementEvidenceMap`. A later promotion design may add reviewed inferential mappings, but that requires an explicit schema/authority extension rather than silently changing the meaning of the current mapper.

### Resume statement rewrite

Inference may propose wording for an existing evidence-backed statement.

```ts
interface ResumeStatementRewriteProposal {
  sourceStatementId: string;
  supportingEvidenceIds: string[];
  proposedText: string;
  rationale: string;
  unsupportedRequirementsAcknowledged: string[];
}
```

Rules:

- supporting evidence IDs must be a subset of the request;
- the rewrite must pass the existing Truth Gate before it can replace draft text;
- acceptance is explicit;
- deterministic fallback is the canonical evidence statement;
- the provider may improve phrasing but may not manufacture metrics, ownership, tools, titles, dates, credentials, employers, scope, or outcomes.

### Application materials and Career Stories

Inference may draft narrative text from confirmed evidence and application/job context.

Factual sections must carry supporting evidence IDs.

Before use:

- evidence IDs must resolve and remain current;
- generated factual claims must pass deterministic support validation;
- stale evidence invalidates the draft under the existing staleness model;
- user review remains required before consequential use.

Deterministic templates remain the fallback.

### Interview practice

Inference may propose:

- practice questions;
- evidence-grounded answer outlines;
- follow-up questions;
- communication feedback.

It may not claim to know what an employer will ask or how an employer will evaluate the user.

When answer content includes factual career claims, those claims remain bound to Career Evidence.

### Opportunity explanation and prioritization

Inference may explain deterministic assessment state or propose an ordering of opportunities.

It may not:

- convert a ranking into hiring probability;
- hide blockers, gaps, or unknowns;
- replace explicit user constraints;
- mutate Target Tracks;
- treat provider confidence as eligibility.

A deterministic ordering/filter remains available without inference.

### Search insight interpretation

Inference may propose interpretations or strategy ideas from already-computed observations.

It must preserve the distinction among:

- observation;
- recommendation;
- caveat.

It may not silently mutate search strategy, filters, Target Tracks, monitored sources, or application state.

## Deterministic adjudication

Every inference response passes through deterministic checks before the calling feature can display it as an actionable proposal.

At minimum:

1. envelope version matches;
2. request ID/task match;
3. JSON/schema validation passes;
4. provider/model identity is known;
5. all referenced IDs were present in the request scope;
6. forbidden fields/actions are absent;
7. output size/resource bounds pass;
8. task-specific provenance requirements pass;
9. factual language is evaluated against supporting evidence where applicable;
10. current canonical records have not been invalidated/superseded since request creation.

A response that fails adjudication is rejected as `invalid-response` or `validation-failed`. Partial silent salvage is prohibited unless the task schema explicitly defines item-level validation and exposes rejected items.

## User review and state promotion

Inference output has three states:

```text
provider response
   |
   v
validated proposal
   |
   +--> rejected / discarded
   |
   +--> user-reviewed proposal (when required)
              |
              v
   canonical write through existing domain service
```

The inference layer itself never performs the canonical write.

Examples:

- inferred Career Evidence enters the existing Candidate Evidence review path;
- a resume rewrite uses the existing resume update path only after validation/review;
- a proposed strategy change requires the same explicit user action as a manually entered change.

## Failure contract

Inference is optional. Failure must be boring.

```ts
type InferenceFailureCode =
  | "not-configured"
  | "unsupported-task"
  | "runtime-unsupported"
  | "consent-required"
  | "credentials-missing"
  | "cancelled"
  | "timeout"
  | "rate-limited"
  | "provider-unavailable"
  | "provider-error"
  | "invalid-response"
  | "validation-failed"
  | "policy-violation";
```

Rules:

- inference failure must not corrupt or partially mutate canonical state;
- deterministic functionality remains available;
- offline/local-first workflows remain usable;
- rate limits/provider outages are not represented as empty evidence or a negative assessment;
- errors identify whether the failure occurred before transmission, during provider execution, or during local validation;
- retries are bounded and explicit in the adapter policy;
- Job Ranger must not silently switch to a different remote provider because one failed.

## Credentials and secrets

Provider credentials are not Career Ops data.

They must:

- live behind a runtime-specific secret/configuration boundary;
- never appear in prompts;
- never be written to logs;
- never be included in backup/portable `.jobranger` archives;
- never be exposed to renderer/UI code beyond bounded configuration state such as "configured";
- be independently removable.

The PWA may not claim support for long-lived remote-provider credentials until a credential design appropriate to the browser threat model is approved.

## Local provenance and retention

Job Ranger should retain enough local metadata to explain inference-assisted state without turning the database into a raw prompt archive.

A durable provenance record should include:

```ts
interface InferenceProvenance {
  requestId: string;
  task: InferenceTask;
  contractVersion: string;
  providerId: string;
  modelId: string;
  providerLocation: InferenceLocation;
  adapterVersion: string;
  inputRecordIds: string[];
  inputContentHash: string;
  outputContentHash: string;
  createdAt: string;
  completedAt: string;
  outcome: "accepted" | "rejected" | "discarded" | "failed";
  failureCode?: InferenceFailureCode;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
    currency?: string;
  };
}
```

Default retention rule:

- do not persist raw provider prompts/responses merely for debugging;
- persist accepted product artifacts through their normal domain store;
- persist compact provenance/hashes needed for auditability;
- any opt-in diagnostic retention must be separately disclosed and bounded.

No telemetry is implied by local provenance.

## Cost and usage

If a provider reports usage/cost:

- preserve it locally as advisory metadata;
- never require it for correctness;
- do not transmit it to MythologIQ or another telemetry service by default;
- do not claim exact cost when the provider exposes only token counts or incomplete pricing information.

Future provider configuration may support user-defined budgets, but budget enforcement is outside draft v1.

## Provider conformance

A provider implementation must pass a shared conformance suite before it can be enabled.

Minimum conformance cases:

- valid response for every advertised task;
- malformed JSON/schema rejection;
- unknown ID rejection;
- invented evidence ID rejection;
- oversized output rejection;
- cancellation;
- timeout;
- rate-limit/provider failure;
- no mutation after failure;
- no hidden fallback to another provider;
- remote consent enforcement;
- transmission manifest correctness;
- deterministic fallback availability;
- prompt-injection fixture where job/resume text attempts to override instructions;
- factual rewrite fixture that introduces an unsupported metric and is blocked;
- stale/superseded evidence between request and acceptance;
- provider/model provenance recorded correctly.

Conformance tests use synthetic data only.

## Security review requirements

Before the first implementation PR can merge, review must explicitly cover:

- data minimization;
- remote consent UX;
- provider retention/training disclosures;
- secret storage;
- PWA credential exposure;
- CSP/connect-src changes;
- SSRF/network implications of local endpoints;
- prompt injection and data exfiltration;
- schema/resource exhaustion;
- log redaction;
- cancellation/timeouts;
- provider SDK dependency/licensing/supply-chain risk;
- backup/export exclusion of secrets and raw prompts;
- model response handling as untrusted input.

## Initial implementation sequence

This contract intentionally separates architecture from provider adoption.

### Slice A — contract types and fake provider

Implement only:

- shared request/response/failure/provenance types;
- `InferenceBroker` policy shell;
- schema validators;
- synthetic fake provider;
- conformance tests;
- no network;
- no credentials;
- no user data leaves the device.

This proves the boundary before a provider exists.

### Slice B — local provider candidate

Only after Slice A review:

- evaluate one local inference adapter against measured Job Ranger tasks;
- preserve deterministic fallback;
- measure semantic lift against existing fixtures;
- do not change canonical authority rules.

Local inference is preferred for initial capability evaluation because it tests usefulness without introducing remote career-data transmission.

### Slice C — remote provider candidate

Only after explicit product/security approval:

- choose one provider based on measured capability, terms, privacy, reliability, cost, and maintenance;
- implement governed credentials and disclosure;
- add remote transport;
- run the same conformance suite plus remote privacy/security tests.

Provider choice is an implementation decision below this contract, not an architecture decision above it.

## Evaluation requirement

Inference should be adopted only where it demonstrates measurable lift over the deterministic baseline.

Each task candidate needs a benchmark that compares:

- deterministic-only output;
- inference-assisted proposal;
- factual/support violations;
- false direct/transferable mappings;
- missed relevant evidence;
- user correction rate where measurable;
- latency;
- provider failures;
- cost where applicable.

A more fluent sentence is not sufficient evidence if factual reliability or explainability regresses.

## Compatibility and versioning

The contract version is independent of provider/model version.

Breaking changes to:

- request envelope;
- response envelope;
- task semantics;
- data classes;
- authority/promotion rules;

require a new inference contract version.

Adapters declare supported versions and tasks. Job Ranger must fail closed on incompatible versions.

Model upgrades within a provider adapter must retain provenance and rerun the provider benchmark/conformance suite before promotion.

## Open questions for adversarial review

Draft 0.1 intentionally leaves these decisions open:

1. Whether accepted inferential requirement/evidence relationships should ever become a durable mapping type distinct from the deterministic mapper.
2. Whether remote consent is best remembered per capability/data-class set, per session, or per request for the first release.
3. What safe remote-credential architecture, if any, is acceptable for the PWA.
4. Whether a local model endpoint should be a first-party adapter, a generic OpenAI-compatible protocol adapter, or both.
5. Which task provides enough measurable value to justify the first implementation slice after the fake-provider boundary exists.
6. Whether provider-side retention/training policy should be a machine-readable adapter capability or configuration-time disclosure metadata.

These questions must be resolved before their corresponding implementation surface is enabled. They are not permission to let provider behavior decide by accident.
