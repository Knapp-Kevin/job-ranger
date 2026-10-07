// InferenceAdjudicator: inference-specific checks around provider output,
// followed by the existing deterministic gates received by injection. It never
// re-implements, copies or modifies a deterministic gate, and never writes.

import {
  inferenceFailure,
  type InferenceFailure,
  type InferenceProviderDescriptor,
  type InferenceRequestEnvelope,
  type InferenceUsage,
} from "./contract.cjs";
import { isFailure, SchemaError, validateResponseEnvelope } from "./schemas-envelope.cjs";
import type { RequestSnapshot, TaskCheckDeps, TaskSpec } from "./task-spec.cjs";

export type AdjudicationResult<TProposal> =
  | { ok: true; proposal: TProposal; resolvedModelId: string; usage?: InferenceUsage }
  | { ok: false; failure: InferenceFailure; resolvedModelId?: string };

export interface InferenceAdjudicator {
  adjudicate<TProposal>(
    spec: TaskSpec<unknown, TProposal>,
    request: InferenceRequestEnvelope,
    snapshot: RequestSnapshot,
    raw: unknown,
    descriptor: InferenceProviderDescriptor,
  ): Promise<AdjudicationResult<TProposal>>;
}

function validateProposal<TProposal>(
  spec: TaskSpec<unknown, TProposal>,
  value: unknown,
): TProposal | InferenceFailure {
  try {
    return spec.validateProposal(value);
  } catch (error) {
    if (error instanceof SchemaError) {
      return inferenceFailure("invalid-response", "validation", `Proposal rejected: ${error.message}.`);
    }
    throw error;
  }
}

export function createInferenceAdjudicator(deps: TaskCheckDeps): InferenceAdjudicator {
  return {
    async adjudicate(spec, request, snapshot, raw, descriptor) {
      const envelope = validateResponseEnvelope(raw, request, descriptor);
      if (isFailure(envelope)) return { ok: false, failure: envelope };
      const { resolvedModelId } = envelope;
      const proposal = validateProposal(spec, envelope.envelope.proposal);
      if (isFailure(proposal)) return { ok: false, failure: proposal, resolvedModelId };
      const scope = spec.checkScope(proposal, snapshot);
      if (scope) return { ok: false, failure: inferenceFailure(scope.code, "validation", scope.message), resolvedModelId };
      const task = await spec.checkTask(proposal, snapshot, deps);
      if (task) return { ok: false, failure: inferenceFailure(task.code, "validation", task.message), resolvedModelId };
      return { ok: true, proposal, resolvedModelId, usage: envelope.envelope.usage };
    },
  };
}
