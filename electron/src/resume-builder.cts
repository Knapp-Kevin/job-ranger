import type {
  CandidateEvidence,
  ResumeProjection,
  ResumeStatement,
} from "../../src/shared/contracts.js";
import type {
  ResumeProjectionBundle,
  ResumeTruthGateIssue,
  ResumeTruthGateResult,
} from "../../src/shared/resume-workspace.js";
import type { JobEvidenceCoverage } from "../../src/shared/requirement-coverage.js";
import { canEvidenceSupportFactualClaim } from "../../src/shared/career-contracts.js";

const SECTION_ORDER = [
  "Experience",
  "Skills",
  "Credentials",
  "Education",
  "Projects",
  "Publications",
  "Additional Evidence",
] as const;

function sectionForEvidence(evidence: CandidateEvidence): string {
  switch (evidence.subjectType) {
    case "role":
    case "achievement":
      return "Experience";
    case "skill":
      return "Skills";
    case "credential":
      return "Credentials";
    case "education":
      return "Education";
    case "project":
      return "Projects";
    case "publication":
      return "Publications";
    case "other":
      return "Additional Evidence";
  }
}

function evidencePriority(
  evidence: CandidateEvidence,
  targetedIds: ReadonlyMap<string, number>,
): number {
  const targetRank = targetedIds.get(evidence.id);
  if (targetRank !== undefined) return 10000 - targetRank;

  switch (evidence.subjectType) {
    case "role":
      return 900;
    case "achievement":
      return 850;
    case "credential":
      return 800;
    case "skill":
      return 700;
    case "project":
      return 650;
    case "education":
      return 600;
    case "publication":
      return 500;
    case "other":
      return 400;
  }
}

export function chooseEvidenceForProjection(
  evidence: readonly CandidateEvidence[],
  coverage: JobEvidenceCoverage,
  maxItems = 14,
): CandidateEvidence[] {
  const targeted = new Map<string, number>();
  let rank = 0;
  for (const item of coverage.items) {
    if (
      item.evidence &&
      (item.mapping.classification === "direct" ||
        item.mapping.classification === "transferable") &&
      !targeted.has(item.evidence.id)
    ) {
      targeted.set(item.evidence.id, rank++);
    }
  }

  return evidence
    .filter((item) => canEvidenceSupportFactualClaim(item))
    .sort((left, right) => {
      const priority = evidencePriority(right, targeted) - evidencePriority(left, targeted);
      if (priority !== 0) return priority;
      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, maxItems);
}

export function buildStatements(
  projectionId: string,
  selectedEvidence: readonly CandidateEvidence[],
  makeStatementId: () => string,
): ResumeStatement[] {
  const sectionRank = new Map(SECTION_ORDER.map((section, index) => [section, index]));

  return selectedEvidence
    .map((evidence) => ({ evidence, section: sectionForEvidence(evidence) }))
    .sort((left, right) => {
      const sectionDelta =
        (sectionRank.get(left.section) ?? 999) - (sectionRank.get(right.section) ?? 999);
      if (sectionDelta !== 0) return sectionDelta;
      return right.evidence.updatedAt.localeCompare(left.evidence.updatedAt);
    })
    .map(({ evidence, section }, index) => ({
      id: makeStatementId(),
      projectionId,
      section,
      order: index,
      text: evidence.statement.trim(),
      evidenceIds: [evidence.id],
      generationMode: "deterministic" as const,
      userEdited: false,
    }));
}

export function sectionsForStatements(statements: readonly ResumeStatement[]): string[] {
  const used = new Set(statements.map((statement) => statement.section));
  return SECTION_ORDER.filter((section) => used.has(section));
}

export function evaluateProjectionTruth(
  statements: readonly ResumeStatement[],
  evidence: readonly CandidateEvidence[],
): ResumeTruthGateResult {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const blockingIssues: ResumeTruthGateIssue[] = [];

  if (statements.length === 0) {
    blockingIssues.push({
      code: "no-confirmed-evidence",
      statementId: null,
      evidenceIds: [],
      message: "No confirmed Career Evidence is available for this resume yet.",
    });
  }

  for (const statement of statements) {
    const linked = statement.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is CandidateEvidence => Boolean(item));
    const missing = statement.evidenceIds.filter((id) => !evidenceById.has(id));

    if (missing.length > 0 || statement.evidenceIds.length === 0) {
      blockingIssues.push({
        code: "missing-evidence",
        statementId: statement.id,
        evidenceIds: missing,
        message: "A factual resume statement is missing its supporting Career Evidence.",
      });
      continue;
    }

    const unconfirmed = linked.filter((item) => !canEvidenceSupportFactualClaim(item));
    if (unconfirmed.length > 0) {
      blockingIssues.push({
        code: "unconfirmed-evidence",
        statementId: statement.id,
        evidenceIds: unconfirmed.map((item) => item.id),
        message: "A factual resume statement relies on evidence that has not been confirmed.",
      });
    }

    if (statement.generationMode === "deterministic" && linked.length === 1) {
      if (statement.text.trim() !== linked[0].statement.trim()) {
        blockingIssues.push({
          code: "deterministic-text-drift",
          statementId: statement.id,
          evidenceIds: [linked[0].id],
          message: "Deterministic resume text must match its confirmed Career Evidence exactly.",
        });
      }
    }
  }

  return {
    passed: blockingIssues.length === 0,
    blockingIssues,
    checkedStatementCount: statements.length,
    checkedEvidenceCount: evidenceById.size,
  };
}

export function bundleProjection(
  projection: ResumeProjection,
  statements: ResumeStatement[],
  evidence: CandidateEvidence[],
): ResumeProjectionBundle {
  return {
    projection,
    statements,
    evidence,
    truthGate: evaluateProjectionTruth(statements, evidence),
  };
}
