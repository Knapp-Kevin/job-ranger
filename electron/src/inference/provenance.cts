// In-memory provenance records (Slice A persists nothing). Content hashes are
// keyed with an injected per-install HMAC; no raw prompt, payload, proposal or
// provider text is ever stored in a record.

import type {
  InferenceFailureCode,
  InferenceHmac,
  InferenceLocation,
  InferenceProvenance,
  InferenceProvenanceOutcome,
  InferenceRequestEnvelope,
  InferenceUsage,
} from "./contract.cjs";

export interface ProvenanceSource {
  request: InferenceRequestEnvelope;
  adapterVersion: string;
  location: InferenceLocation;
  settings: Record<string, string | number>;
  resolvedModelId?: string;
  proposal?: unknown;
  usage?: InferenceUsage;
  completedAt: string;
}

function inputRecordIds(request: InferenceRequestEnvelope): string[] {
  return Array.from(new Set(request.transmission.items.flatMap((item) => item.recordIds)));
}

export function buildProvenance(
  source: ProvenanceSource,
  outcome: InferenceProvenanceOutcome,
  hmac: InferenceHmac,
  failureCode?: InferenceFailureCode,
): InferenceProvenance {
  const { request } = source;
  const record: InferenceProvenance = {
    requestId: request.requestId,
    task: request.task,
    contractVersion: request.contractVersion,
    taskSchemaVersion: request.taskSchemaVersion,
    instructionTemplateId: request.instructionTemplate.id,
    instructionTemplateVersion: request.instructionTemplate.version,
    providerId: request.provider.providerId,
    requestedModelId: request.provider.modelId,
    resolvedModelId: source.resolvedModelId ?? request.provider.modelId,
    providerLocation: source.location,
    adapterVersion: source.adapterVersion,
    providerSettingsHash: hmac(JSON.stringify(source.settings)),
    inputRecordIds: inputRecordIds(request),
    inputContentHash: hmac(JSON.stringify({ payload: request.payload, context: request.context })),
    outputContentHash: source.proposal === undefined ? "" : hmac(JSON.stringify(source.proposal)),
    createdAt: request.createdAt,
    completedAt: source.completedAt,
    outcome,
  };
  if (failureCode) record.failureCode = failureCode;
  if (source.usage) record.usage = { ...source.usage };
  return record;
}

/** Acceptance transitions: pending -> accepted, or pending -> failed. */
export function withOutcome(
  record: InferenceProvenance,
  outcome: InferenceProvenanceOutcome,
  completedAt: string,
  failureCode?: InferenceFailureCode,
): InferenceProvenance {
  const next: InferenceProvenance = { ...record, outcome, completedAt };
  if (failureCode) next.failureCode = failureCode;
  else delete next.failureCode;
  return next;
}
