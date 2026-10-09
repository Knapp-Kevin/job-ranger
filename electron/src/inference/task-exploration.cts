// Free-form, proposal-only career direction exploration. Structure, scope,
// provenance and authority are deterministic; exploration language is not.
// The resulting hypotheses are never factual claims or changes to Target Tracks.

import {
  canEvidenceSupportFactualClaim,
  type CandidateEvidence,
} from "../../../src/shared/career-contracts.js";
import type { CareerPathExplorationProposal } from "./contract.cjs";
import { fail, list, record, text } from "./schemas-envelope.cjs";
import { unsupportedExternalReferences } from "./text-policy.cjs";
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

export interface CareerPathExplorationInput {
  goal: string;
  /** User-supplied preferences are not deterministic requirements. */
  preferences?: string[];
  /** User-supplied constraints are not automatically verified. */
  constraints?: string[];
  /** Specific records explicitly selected for this request, not a database dump. */
  evidenceIds?: string[];
}

function boundedText(value: unknown, label: string, maxLength: number): string {
  const result = text(value, label, maxLength);
  if (result.trim().length === 0) fail(`${label} must not be blank`);
  return result;
}

function boundedLines(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  return list(value, label, maxItems, (item, at) => boundedText(item, at, maxLength));
}

function direction(value: unknown, label: string): CareerPathExplorationProposal["directions"][number] {
  const entry = record(value, label, [
    "direction", "explorationRationale", "supportingEvidenceIds", "tradeoffs",
    "validationQuestions", "lowRiskNextStep",
  ]);
  const supportingEvidenceIds = list(entry.supportingEvidenceIds, `${label}.supportingEvidenceIds`, 12,
    (item, at) => boundedText(item, at, 200));
  if (new Set(supportingEvidenceIds).size !== supportingEvidenceIds.length) {
    fail(`${label}.supportingEvidenceIds contains duplicates`);
  }
  const validationQuestions = boundedLines(entry.validationQuestions, `${label}.validationQuestions`, 4, 250);
  if (validationQuestions.length < 1) fail(`${label}.validationQuestions must include a question`);
  return {
    direction: boundedText(entry.direction, `${label}.direction`, 160),
    explorationRationale: boundedText(entry.explorationRationale, `${label}.explorationRationale`, 800),
    supportingEvidenceIds,
    tradeoffs: boundedLines(entry.tradeoffs, `${label}.tradeoffs`, 4, 300),
    validationQuestions,
    lowRiskNextStep: boundedText(entry.lowRiskNextStep, `${label}.lowRiskNextStep`, 350),
  };
}

/** Fixed schema; the role hypotheses and advisory prose are deliberately open-ended. */
export function validateCareerPathExploration(value: unknown): CareerPathExplorationProposal {
  const proposal = record(value, "proposal", ["directions", "openQuestions"]);
  const directions = list(proposal.directions, "proposal.directions", 5, direction);
  if (directions.length === 0) fail("proposal.directions must include a direction");
  return {
    directions,
    openQuestions: boundedLines(proposal.openQuestions, "proposal.openQuestions", 6, 250),
  };
}

function userInput(value: unknown): Required<CareerPathExplorationInput> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some((key) => !["goal", "preferences", "constraints", "evidenceIds"].includes(key))) {
    throw new RequestBuildError("validation-failed", "The exploration request has unsupported fields.");
  }
  const item = value as CareerPathExplorationInput;
  if (typeof item.goal !== "string" || item.goal.trim().length === 0 || item.goal.length > 600) {
    throw new RequestBuildError("validation-failed", "A bounded career goal is required.");
  }
  const lines = (values: unknown, label: string): string[] => {
    if (!Array.isArray(values) || values.length > 6 ||
        !values.every((text) => typeof text === "string" && text.trim().length > 0 && text.length <= 250)) {
      throw new RequestBuildError("validation-failed", `Invalid ${label} for exploration.`);
    }
    return values;
  };
  const evidenceIds = item.evidenceIds ?? [];
  if (!Array.isArray(evidenceIds) || evidenceIds.length > 12 ||
      !evidenceIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200) ||
      new Set(evidenceIds).size !== evidenceIds.length) {
    throw new RequestBuildError("validation-failed", "Invalid evidence selection for exploration.");
  }
  return {
    goal: item.goal,
    preferences: lines(item.preferences ?? [], "preferences"),
    constraints: lines(item.constraints ?? [], "constraints"),
    evidenceIds,
  };
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

function textLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textLeaves);
  if (value && typeof value === "object") return Object.values(value).flatMap(textLeaves);
  return [];
}

async function buildRequest(value: CareerPathExplorationInput, reader: CanonicalReader): Promise<BuiltRequest> {
  const input = userInput(value);
  const evidence = await reader.readEvidence(input.evidenceIds);
  if (evidence.length !== input.evidenceIds.length ||
      !evidence.every((item) => input.evidenceIds.includes(item.id))) {
    throw new RequestBuildError("validation-failed", "Selected career evidence is not available.");
  }
  if (!evidence.every(canEvidenceSupportFactualClaim)) {
    throw new RequestBuildError("policy-violation", "Exploration may receive only confirmed Career Evidence.");
  }
  const selected = evidence.map(evidencePayload);
  return {
    payload: {
      goal: input.goal,
      preferences: [...input.preferences],
      constraints: [...input.constraints],
      evidence: selected,
    },
    context: { evidenceIds: [...input.evidenceIds] },
    snapshot: {
      evidenceUpdatedAt: Object.fromEntries(evidence.map((item) => [item.id, item.updatedAt])),
      requestIds: { requirementIds: [], evidenceIds: [...input.evidenceIds] },
      allowedText: [input.goal, ...input.preferences, ...input.constraints, ...selected.flatMap(textLeaves)],
    },
  };
}

function checkScope(proposal: CareerPathExplorationProposal, snapshot: RequestSnapshot): TaskCheckResult {
  const referenced = proposal.directions.flatMap((item) => item.supportingEvidenceIds);
  if (!subsetOf(referenced, snapshot.requestIds.evidenceIds)) {
    return { code: "policy-violation", message: "A career hypothesis references evidence outside the selected set." };
  }
  const proposedProse = [
    ...proposal.openQuestions,
    ...proposal.directions.flatMap((item) => [
      item.direction, item.explorationRationale, ...item.tradeoffs,
      ...item.validationQuestions, item.lowRiskNextStep,
    ]),
  ];
  if (proposedProse.some((text) =>
    unsupportedExternalReferences(text, snapshot.allowedText ?? []).length > 0)) {
    return { code: "policy-violation", message: "Exploration introduced an unauthorized external reference." };
  }
  return null;
}

async function checkTask(
  _proposal: CareerPathExplorationProposal,
  snapshot: RequestSnapshot,
  deps: TaskCheckDeps,
): Promise<TaskCheckResult> {
  const fresh = await deps.reader.readEvidence(snapshot.requestIds.evidenceIds);
  if (fresh.length !== snapshot.requestIds.evidenceIds.length ||
      fresh.some((item) => !canEvidenceSupportFactualClaim(item)) ||
      evidenceChanged(snapshot, fresh)) {
    return { code: "validation-failed", message: "Selected evidence changed during exploration." };
  }
  return null;
}

export const careerPathExplorationSpec: TaskSpec<CareerPathExplorationInput, CareerPathExplorationProposal> = {
  task: "explore-career-paths",
  taskSchemaVersion: "1",
  instructionTemplate: { id: "explore-career-paths", version: "1" },
  manifestRules: [
    { prefix: "payload.goal", dataClass: "career-preferences", purpose: "Explicitly supplied direction to explore." },
    { prefix: "payload.preferences", dataClass: "career-preferences", purpose: "User-supplied preferences." },
    { prefix: "payload.constraints", dataClass: "career-preferences", purpose: "User-supplied constraints, not verified blockers." },
    { prefix: "payload.evidence[].", dataClass: "career-evidence", purpose: "Selected confirmed experience signals." },
    { prefix: "context.evidenceIds", dataClass: "career-evidence", purpose: "Selected evidence identities." },
  ],
  redactions: ["organization", "titleOrName", "dates", "contact-details"],
  buildRequest,
  validateProposal: validateCareerPathExploration,
  checkScope,
  checkTask,
};
