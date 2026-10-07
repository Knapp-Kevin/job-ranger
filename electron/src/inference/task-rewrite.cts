// rewrite-resume-statement (contract Draft 0.2). The candidate text is
// evaluated by the unchanged, injected Truth Gate as an edited statement bound
// to the source statement's own evidence; acceptance always needs user review.

import {
  canEvidenceSupportFactualClaim,
  type CandidateEvidence,
  type ResumeStatement,
} from "../../../src/shared/career-contracts.js";
import type { ResumeStatementRewriteProposal } from "./contract.cjs";
import { validateRewriteProposal } from "./schemas-tasks.cjs";
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
import { unsupportedExternalReferences } from "./text-policy.cjs";

export interface RewriteInput {
  projectionId: string;
  statementId: string;
  jobId?: string;
  requirements?: Array<{ id: string; sourceText: string }>;
}

export async function readSourceStatement(
  reader: CanonicalReader,
  projectionId: string,
  statementId: string,
): Promise<ResumeStatement | undefined> {
  const statements = await reader.readStatements(projectionId);
  return statements.find((statement) => statement.id === statementId);
}

function evidencePayload(item: CandidateEvidence) {
  return { id: item.id, statement: item.statement, skills: item.skills, methodsOrTools: item.methodsOrTools,
    scope: item.scope, outcomes: item.outcomes, metrics: item.metrics };
}

async function buildRequest(input: RewriteInput, reader: CanonicalReader): Promise<BuiltRequest> {
  const statement = await readSourceStatement(reader, input.projectionId, input.statementId);
  if (!statement) throw new RequestBuildError("validation-failed", "The source statement does not exist.");
  const evidence = await reader.readEvidence(statement.evidenceIds);
  if (evidence.length !== statement.evidenceIds.length) {
    throw new RequestBuildError("validation-failed", "The source statement's evidence is missing.");
  }
  if (!evidence.every(canEvidenceSupportFactualClaim)) {
    throw new RequestBuildError("policy-violation", "Rewrite requests may include only confirmed evidence.");
  }
  const requirements = input.requirements ?? [];
  const context = input.jobId ? { jobId: input.jobId, evidenceIds: statement.evidenceIds } : { evidenceIds: statement.evidenceIds };
  return {
    payload: { sourceStatement: { id: statement.id, text: statement.text }, evidence: evidence.map(evidencePayload), requirements },
    context,
    snapshot: {
      projectionId: input.projectionId,
      statementId: statement.id,
      statementText: statement.text,
      statementEvidenceIds: [...statement.evidenceIds],
      evidenceUpdatedAt: Object.fromEntries(evidence.map((item) => [item.id, item.updatedAt])),
      requestIds: { requirementIds: requirements.map((item) => item.id), evidenceIds: [...statement.evidenceIds] },
      allowedText: [statement.text, ...evidence.flatMap(textLeaves)],
    },
  };
}

function textLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textLeaves);
  if (value && typeof value === "object") return Object.values(value).flatMap(textLeaves);
  return [];
}

export function checkRewriteScope(proposal: ResumeStatementRewriteProposal, snapshot: RequestSnapshot): TaskCheckResult {
  if (proposal.sourceStatementId !== snapshot.statementId) {
    return { code: "policy-violation", message: "The proposal targets a different statement." };
  }
  if (!subsetOf(proposal.supportingEvidenceIds, snapshot.statementEvidenceIds ?? [])) {
    return { code: "policy-violation", message: "Supporting evidence must belong to the source statement." };
  }
  if (!subsetOf(proposal.unsupportedRequirementIds, snapshot.requestIds.requirementIds)) {
    return { code: "policy-violation", message: "The proposal references a requirement outside the request." };
  }
  if (unsupportedExternalReferences(proposal.proposedText, snapshot.allowedText ?? []).length > 0) {
    return { code: "policy-violation", message: "The proposed text introduces a link, contact detail or path." };
  }
  return null;
}

/** Fresh-read staleness check shared by adjudication and acceptance. */
export async function currentStatementAndEvidence(
  snapshot: RequestSnapshot,
  reader: CanonicalReader,
): Promise<{ statement: ResumeStatement; evidence: CandidateEvidence[] } | null> {
  const statement = await readSourceStatement(reader, snapshot.projectionId!, snapshot.statementId!);
  if (!statement || statement.text !== snapshot.statementText) return null;
  if (JSON.stringify(statement.evidenceIds) !== JSON.stringify(snapshot.statementEvidenceIds)) return null;
  const evidence = await reader.readEvidence(statement.evidenceIds);
  if (evidence.length !== statement.evidenceIds.length || evidenceChanged(snapshot, evidence)) return null;
  return { statement, evidence };
}

/** Runs the unchanged Truth Gate on the candidate text as an edited statement. */
export function gateCandidate(
  proposal: ResumeStatementRewriteProposal,
  current: { statement: ResumeStatement; evidence: CandidateEvidence[] },
  deps: Pick<TaskCheckDeps, "truthGate">,
): TaskCheckResult {
  const candidate: ResumeStatement = { ...current.statement, text: proposal.proposedText, userEdited: true };
  const report = deps.truthGate([candidate], current.evidence);
  if (report.issues.length > 0) {
    return { code: "validation-failed", message: "The proposed text did not pass the Truth Gate." };
  }
  return null;
}

async function checkTask(
  proposal: ResumeStatementRewriteProposal,
  snapshot: RequestSnapshot,
  deps: TaskCheckDeps,
): Promise<TaskCheckResult> {
  const current = await currentStatementAndEvidence(snapshot, deps.reader);
  if (!current) return { code: "validation-failed", message: "The statement or its evidence changed after the request." };
  return gateCandidate(proposal, current, deps);
}

export const rewriteResumeStatementSpec: TaskSpec<RewriteInput, ResumeStatementRewriteProposal> = {
  task: "rewrite-resume-statement",
  taskSchemaVersion: "1",
  instructionTemplate: { id: "rewrite-resume-statement", version: "1" },
  manifestRules: [
    { prefix: "payload.sourceStatement.", dataClass: "resume-content", purpose: "The statement to rephrase." },
    { prefix: "payload.evidence[].", dataClass: "career-evidence", purpose: "The statement's own supporting evidence." },
    { prefix: "payload.requirements[].", dataClass: "public-job-text", purpose: "Requirements the wording may address." },
    { prefix: "context.jobId", dataClass: "public-job-text", purpose: "Saved job reference." },
    { prefix: "context.evidenceIds", dataClass: "career-evidence", purpose: "Evidence references." },
  ],
  redactions: ["organization", "titleOrName", "dates"],
  buildRequest,
  validateProposal: validateRewriteProposal,
  checkScope: checkRewriteScope,
  checkTask,
};

