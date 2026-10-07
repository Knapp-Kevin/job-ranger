// Closed validation of provider response envelopes. Unknown keys, confidence
// fields, echo mismatches and oversized output fail closed as invalid-response.

import {
  INFERENCE_CONTRACT_VERSION,
  type InferenceFailure,
  type InferenceProviderDescriptor,
  type InferenceRequestEnvelope,
  type InferenceResponseEnvelope,
  type InferenceWarningCode,
  inferenceFailure,
} from "./contract.cjs";

export const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_DEPTH = 32;
const MODEL_ID = /^[A-Za-z0-9._:/-]{1,128}$/;

const WARNING_CODES: readonly InferenceWarningCode[] = [
  "input-truncated",
  "low-information-input",
  "task-partially-supported",
];
const FORBIDDEN_KEY = /confidence|probability|score/i;

export class SchemaError extends Error {}

export function fail(message: string): never {
  throw new SchemaError(message);
}

export function record(value: unknown, label: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (!keys.includes(key)) fail(`${label} has an unknown field`);
  }
  return result;
}

export function text(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (value.length > maxLength) fail(`${label} is too long`);
  return value;
}

export function oneOf<T extends string>(value: unknown, label: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail(`${label} is not an allowed value`);
  return value as T;
}

export function list<T>(
  value: unknown,
  label: string,
  maxItems: number,
  item: (entry: unknown, label: string) => T,
): T[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (value.length > maxItems) fail(`${label} has too many items`);
  return value.map((entry, index) => item(entry, `${label}[${index}]`));
}

export const idText = (value: unknown, label: string): string => text(value, label, 200);

function rejectForbiddenKeys(value: unknown, depth = 0): void {
  if (!value || typeof value !== "object") return;
  if (depth > MAX_DEPTH) fail("response nesting exceeds the depth bound");
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) fail("a forbidden confidence, probability or score field is present");
    rejectForbiddenKeys(child, depth + 1);
  }
}

function optionalNumber(value: unknown, label: string): void {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`${label} must be a non-negative number`);
}

function validateUsage(value: unknown): void {
  if (value === undefined) return;
  const usage = record(value, "usage", ["inputTokens", "outputTokens", "estimatedCost", "currency"]);
  optionalNumber(usage.inputTokens, "usage.inputTokens");
  optionalNumber(usage.outputTokens, "usage.outputTokens");
  optionalNumber(usage.estimatedCost, "usage.estimatedCost");
  if (usage.currency !== undefined && (typeof usage.currency !== "string" || !/^[A-Z]{3}$/.test(usage.currency))) {
    fail("usage.currency must be a three-letter code");
  }
}

/** Serializes once and validates only the parsed copy, never a live provider object. */
function parseRaw(raw: unknown): unknown {
  let serialized: string;
  try {
    serialized = typeof raw === "string" ? raw : JSON.stringify(raw ?? null);
  } catch {
    return fail("response could not be serialized");
  }
  if (typeof serialized !== "string") fail("response could not be serialized");
  if (new TextEncoder().encode(serialized).length > MAX_RESPONSE_BYTES) fail("response exceeds the output size bound");
  try {
    return JSON.parse(serialized);
  } catch {
    return fail("response is not valid JSON");
  }
}

function checkEcho(
  response: Record<string, unknown>,
  request: InferenceRequestEnvelope,
): void {
  if (response.contractVersion !== INFERENCE_CONTRACT_VERSION) fail("contract version mismatch");
  if (response.requestId !== request.requestId) fail("request id mismatch");
  if (response.task !== request.task) fail("task mismatch");
  if (response.taskSchemaVersion !== request.taskSchemaVersion) fail("task schema version mismatch");
  const template = record(response.instructionTemplate, "instructionTemplate", ["id", "version"]);
  if (template.id !== request.instructionTemplate.id || template.version !== request.instructionTemplate.version) {
    fail("instruction template mismatch");
  }
}

function checkProvider(
  response: Record<string, unknown>,
  request: InferenceRequestEnvelope,
  descriptor: InferenceProviderDescriptor,
): string {
  const provider = record(response.provider, "provider", ["providerId", "modelId", "adapterVersion"]);
  if (provider.providerId !== descriptor.providerId) fail("unknown provider identity");
  if (provider.adapterVersion !== descriptor.adapterVersion) fail("unknown adapter version");
  const modelId = text(provider.modelId, "provider.modelId", 128);
  if (modelId === request.provider.modelId) return modelId;
  if (!descriptor.resolvesModelAliases) fail("model mismatch");
  const known = descriptor.models.some((model) => model.modelId === modelId);
  if (!known || !MODEL_ID.test(modelId)) fail("resolved model is not a declared model");
  return modelId;
}

export interface ValidatedEnvelope {
  envelope: InferenceResponseEnvelope<unknown>;
  resolvedModelId: string;
}

/** Returns the validated envelope or an invalid-response failure; never throws. */
export function validateResponseEnvelope(
  raw: unknown,
  request: InferenceRequestEnvelope,
  descriptor: InferenceProviderDescriptor,
): ValidatedEnvelope | InferenceFailure {
  try {
    const parsed = parseRaw(raw);
    rejectForbiddenKeys(parsed);
    const response = record(parsed, "response", [
      "contractVersion", "requestId", "task", "taskSchemaVersion", "instructionTemplate",
      "provider", "completedAt", "proposal", "warnings", "usage",
    ]);
    checkEcho(response, request);
    const resolvedModelId = checkProvider(response, request, descriptor);
    text(response.completedAt, "completedAt", 64);
    list(response.warnings, "warnings", 10, (entry, label) =>
      oneOf(record(entry, label, ["code"]).code, `${label}.code`, WARNING_CODES),
    );
    validateUsage(response.usage);
    return { envelope: response as unknown as InferenceResponseEnvelope<unknown>, resolvedModelId };
  } catch (error) {
    if (error instanceof SchemaError) {
      return inferenceFailure("invalid-response", "validation", `Response rejected: ${error.message}.`);
    }
    throw error;
  }
}

export function isFailure(value: unknown): value is InferenceFailure {
  return Boolean(value && typeof value === "object" && "code" in value && "phase" in value);
}
