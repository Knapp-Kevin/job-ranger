// semantic-evidence-support (contract Draft 0.2). Requests carry only
// confirmed evidence; relationship labels are unreviewed proposals that never
// change deterministic coverage, assessment, gaps or unknowns.

import {
  canEvidenceSupportFactualClaim,
  type CandidateEvidence,
  type JobRequirement,
} from "../../../src/shared/career-contracts.js";
import type { SemanticEvidenceSupportProposal } from "./contract.cjs";
import { validateSemanticProposal } from "./schemas-tasks.cjs";
import {
  evidenceChanged,
  RequestBuildError,
  subsetOf,
  type BuiltRequest,
  type CanonicalReader,
  type RequestSnapshot,
  type TaskCheckDeps,
  type TaskCheckResult,
  type TaskSpec,
} from "./task-spec.cjs";

export interface SemanticSupportInput {
  jobId: string;
  requirement: Pick<JobRequirement, "id" | "kind" | "sourceText">;
  evidenceIds: string[];
}

function evidencePayload(item: CandidateEvidence) {
  return {
    id: item.id,
    statement: item.statement,
    skills: item.skills,
    methodsOrTools: item.methodsOrTools,
    scope: item.scope,
    outcomes: item.outcomes,
    metrics: item.metrics,
  };
}

async function confirmedEvidence(ids: readonly string[], reader: CanonicalReader): Promise<CandidateEvidence[]> {
  const evidence = await reader.readEvidence(ids);
  if (evidence.length !== ids.length) {
    throw new RequestBuildError("validation-failed", "A requested evidence record does not exist.");
  }
  if (!evidence.every(canEvidenceSupportFactualClaim)) {
    throw new RequestBuildError("policy-violation", "Semantic requests may include only confirmed evidence.");
  }
  return evidence;
}

async function buildRequest(input: SemanticSupportInput, reader: CanonicalReader): Promise<BuiltRequest> {
  const evidence = await confirmedEvidence(input.evidenceIds, reader);
  const requirement = { id: input.requirement.id, kind: input.requirement.kind, sourceText: input.requirement.sourceText };
  return {
    payload: { requirement, evidence: evidence.map(evidencePayload) },
    context: { jobId: input.jobId, evidenceIds: evidence.map((item) => item.id) },
    snapshot: {
      evidenceUpdatedAt: Object.fromEntries(evidence.map((item) => [item.id, item.updatedAt])),
      requestIds: { requirementIds: [requirement.id], evidenceIds: evidence.map((item) => item.id) },
    },
  };
}

function checkScope(proposal: SemanticEvidenceSupportProposal, snapshot: RequestSnapshot): TaskCheckResult {
  const { requirementIds, evidenceIds } = snapshot.requestIds;
  const referenced = proposal.candidateEvidence.map((item) => item.evidenceId);
  if (!requirementIds.includes(proposal.requirementId) || !subsetOf(proposal.unknownRequirementIds, requirementIds)) {
    return { code: "policy-violation", message: "The proposal references a requirement outside the request." };
  }
  if (!subsetOf(referenced, evidenceIds)) {
    return { code: "policy-violation", message: "The proposal references evidence outside the request." };
  }
  return null;
}

function fieldIsEmpty(item: CandidateEvidence, field: string): boolean {
  const value = (item as unknown as Record<string, unknown>)[field];
  if (Array.isArray(value)) return value.every((entry) => typeof entry !== "string" || entry.trim() === "");
  return typeof value !== "string" || value.trim() === "";
}

async function checkTask(
  proposal: SemanticEvidenceSupportProposal,
  snapshot: RequestSnapshot,
  deps: TaskCheckDeps,
): Promise<TaskCheckResult> {
  const fresh = await deps.reader.readEvidence(snapshot.requestIds.evidenceIds);
  if (evidenceChanged(snapshot, fresh)) {
    return { code: "validation-failed", message: "Evidence changed after the request was created." };
  }
  const byId = new Map(fresh.map((item) => [item.id, item]));
  const emptyField = proposal.candidateEvidence.some((candidate) =>
    candidate.rationale.evidenceFields.some((field) => fieldIsEmpty(byId.get(candidate.evidenceId)!, field)),
  );
  if (emptyField) {
    return { code: "validation-failed", message: "A rationale names an evidence field that is empty." };
  }
  return null;
}

export const semanticEvidenceSupportSpec: TaskSpec<SemanticSupportInput, SemanticEvidenceSupportProposal> = {
  task: "semantic-evidence-support",
  taskSchemaVersion: "1",
  instructionTemplate: { id: "semantic-evidence-support", version: "1" },
  manifestRules: [
    { prefix: "payload.requirement.", dataClass: "public-job-text", purpose: "The job requirement to relate evidence to." },
    { prefix: "payload.evidence[].", dataClass: "career-evidence", purpose: "Confirmed evidence candidates." },
    { prefix: "context.jobId", dataClass: "public-job-text", purpose: "Saved job reference." },
    { prefix: "context.evidenceIds", dataClass: "career-evidence", purpose: "Evidence references." },
  ],
  redactions: ["organization", "titleOrName", "dates"],
  buildRequest,
  validateProposal: validateSemanticProposal,
  checkScope: (proposal, snapshot) => checkScope(proposal, snapshot),
  checkTask,
};
