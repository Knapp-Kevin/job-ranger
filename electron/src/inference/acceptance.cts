// User acceptance of a reviewed rewrite proposal. It verifies the proposal and
// snapshot are exactly what was adjudicated (review token), re-runs the scope
// policy, re-reads canonical state, rejects a changed statement or
// changed/superseded evidence, re-runs the injected Truth Gate, and writes text
// only through the existing ResumeService.updateStatement.
//
// Replay: Slice A persists nothing, so a provenance record cannot be marked
// spent. A second acceptance of the same proposal fails the snapshot check,
// because the first write changed the statement text.

import type { ResumeStatement } from "../../../src/shared/career-contracts.js";
import {
  inferenceFailure,
  type InferenceFailure,
  type InferenceHmac,
  type InferenceProvenance,
  type ResumeStatementRewriteProposal,
} from "./contract.cjs";
import { reviewToken } from "./broker.cjs";
import { withOutcome } from "./provenance.cjs";
import { checkRewriteScope, currentStatementAndEvidence, gateCandidate } from "./task-rewrite.cjs";
import type { CanonicalReader, RequestSnapshot, TruthGate } from "./task-spec.cjs";

export interface RewriteAcceptanceDeps {
  reader: CanonicalReader;
  truthGate: TruthGate;
  hmac: InferenceHmac;
  /** The existing write path, e.g. ResumeService.updateStatement. */
  updateStatement(id: string, update: { text: string }): Promise<ResumeStatement>;
  clock?: () => string;
}

export interface ReviewedRewrite {
  snapshot: RequestSnapshot;
  proposal: ResumeStatementRewriteProposal;
  provenance: InferenceProvenance;
  reviewToken: string;
}

export type RewriteAcceptanceResult =
  | { status: "accepted"; statement: ResumeStatement; provenance: InferenceProvenance }
  | { status: "failed"; failure: InferenceFailure; provenance: InferenceProvenance };

function bindingFailure(reviewed: ReviewedRewrite, hmac: InferenceHmac): InferenceFailure | null {
  const { provenance } = reviewed;
  if (provenance.task !== "rewrite-resume-statement" || provenance.outcome !== "pending") {
    return inferenceFailure("policy-violation", "acceptance", "Only a pending rewrite proposal can be accepted.");
  }
  const expected = reviewToken(hmac, provenance.requestId, provenance.task, reviewed.snapshot, reviewed.proposal);
  if (expected !== reviewed.reviewToken || hmac(JSON.stringify(reviewed.proposal)) !== provenance.outputContentHash) {
    return inferenceFailure("policy-violation", "acceptance", "The proposal differs from what was reviewed.");
  }
  const scope = checkRewriteScope(reviewed.proposal, reviewed.snapshot);
  return scope ? inferenceFailure(scope.code, "acceptance", scope.message) : null;
}

export async function acceptRewrite(
  reviewed: ReviewedRewrite,
  decision: { userApproved: boolean },
  deps: RewriteAcceptanceDeps,
): Promise<RewriteAcceptanceResult> {
  const now = (deps.clock ?? (() => new Date().toISOString()))();
  const reject = (failure: InferenceFailure): RewriteAcceptanceResult => ({
    status: "failed",
    failure,
    provenance: withOutcome(reviewed.provenance, "failed", now, failure.code),
  });
  if (decision.userApproved !== true) {
    return reject(inferenceFailure("policy-violation", "acceptance", "Inference wording requires explicit user approval."));
  }
  const binding = bindingFailure(reviewed, deps.hmac);
  if (binding) return reject(binding);
  const current = await currentStatementAndEvidence(reviewed.snapshot, deps.reader);
  if (!current) {
    return reject(inferenceFailure("validation-failed", "acceptance", "The statement or its evidence changed after the request."));
  }
  const gate = gateCandidate(reviewed.proposal, current, deps);
  if (gate) return reject(inferenceFailure(gate.code, "acceptance", gate.message));
  try {
    const statement = await deps.updateStatement(current.statement.id, { text: reviewed.proposal.proposedText });
    return { status: "accepted", statement, provenance: withOutcome(reviewed.provenance, "accepted", now) };
  } catch {
    return reject(inferenceFailure("validation-failed", "acceptance", "The existing write path rejected the update."));
  }
}
