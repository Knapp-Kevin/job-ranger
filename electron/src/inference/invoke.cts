// One adapter call under a broker-enforced timeout and caller cancellation.
// No retry. A response that arrives after timeout or cancellation is
// discarded: the race has already settled and its value is never used.
// Provider error text is never read; only a declared failure code is. The
// adapter receives a deep copy, so it cannot alter the broker's request,
// snapshot or manifest.

import {
  inferenceFailure,
  type InferenceAdapterError,
  type InferenceFailure,
  type InferenceRequestEnvelope,
} from "./contract.cjs";
import type { InferenceRegistryEntry } from "./registry.cjs";

const PROVIDER_CODES: ReadonlyArray<InferenceAdapterError["code"]> = [
  "rate-limited",
  "provider-unavailable",
  "provider-error",
];
const MESSAGES: Record<InferenceAdapterError["code"], string> = {
  "rate-limited": "The provider is rate limiting requests.",
  "provider-unavailable": "The provider is unavailable.",
  "provider-error": "The provider returned an error.",
};

function clampRetryAfter(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(3600, Math.max(0, Math.floor(value)));
}

export function adapterFailure(error: unknown): InferenceFailure {
  const declared = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const code = PROVIDER_CODES.find((item) => item === declared) ?? "provider-error";
  const failure = inferenceFailure(code, "provider", MESSAGES[code]);
  if (code === "rate-limited") {
    const retryAfter = clampRetryAfter((error as { retryAfterSeconds?: unknown }).retryAfterSeconds);
    if (retryAfter !== undefined) failure.retryAfterSeconds = retryAfter;
  }
  return failure;
}

export async function invokeWithLimits(
  entry: InferenceRegistryEntry,
  request: InferenceRequestEnvelope,
  callerSignal?: AbortSignal,
): Promise<{ raw: unknown } | InferenceFailure> {
  if (callerSignal?.aborted) return inferenceFailure("cancelled", "pre-transmission", "The request was cancelled.");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const limits = new Promise<InferenceFailure>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(inferenceFailure("timeout", "provider", "The provider did not respond in time."));
    }, entry.timeoutMs);
    onAbort = () => {
      controller.abort();
      resolve(inferenceFailure("cancelled", "provider", "The request was cancelled."));
    };
    callerSignal?.addEventListener("abort", onAbort, { once: true });
  });
  const call = Promise.resolve()
    .then(() => entry.adapter.invoke(structuredClone(request), controller.signal))
    .then((raw) => ({ raw }), adapterFailure);
  try {
    return await Promise.race([call, limits]);
  } finally {
    clearTimeout(timer);
    if (onAbort) callerSignal?.removeEventListener("abort", onAbort);
  }
}
