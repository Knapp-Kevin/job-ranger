import type { CandidateEvidence } from "../../src/shared/contracts.js";
import type { JobEvidenceCoverage } from "../../src/shared/requirement-coverage.js";
import type {
  ResumeProjectionRecord,
  ResumeTailoringCandidate,
  ResumeTailoringPlan,
} from "../../src/shared/resume-contracts.js";
import { canEvidenceSupportFactualClaim } from "../../src/shared/career-contracts.js";

const sectionOrder = [
  "Experience",
  "Skills",
  "Certifications",
  "Education",
  "Projects",
  "Publications",
  "Additional",
];

export function resumeSectionForEvidence(evidence: CandidateEvidence): string {
  switch (evidence.subjectType) {
    case "role":
    case "achievement":
      return "Experience";
    case "skill":
      return "Skills";
    case "credential":
      return "Certifications";
    case "education":
      return "Education";
    case "project":
      return "Projects";
    case "publication":
      return "Publications";
    default:
      return "Additional";
  }
}

export function resumeSectionRank(section: string): number {
  const index = sectionOrder.indexOf(section);
  return index === -1 ? sectionOrder.length : index;
}

type CandidateAccumulator = {
  evidence: CandidateEvidence;
  direct: boolean;
  transferable: boolean;
  source: boolean;
  score: number;
  requirementIds: Set<string>;
  reasons: Set<string>;
};

function weightedRequirementScore(
  classification: "direct" | "transferable",
  importance: number | null,
): number {
  const normalizedImportance = Math.max(0, Math.min(1, importance ?? 0.5));
  const base = classification === "direct" ? 100 : 60;
  return base + normalizedImportance * 20;
}

function supportFor(candidate: CandidateAccumulator): ResumeTailoringCandidate["support"] {
  if (candidate.direct) return "direct";
  if (candidate.transferable) return "transferable";
  return "source-only";
}

export function buildResumeTailoringPlan(
  source: ResumeProjectionRecord,
  evidence: readonly CandidateEvidence[],
  coverage: JobEvidenceCoverage,
  now = new Date().toISOString(),
): ResumeTailoringPlan {
  if (coverage.jobId !== source.jobId && !coverage.jobId) {
    throw new Error("Target job coverage is missing a job id.");
  }

  const confirmed = evidence.filter(canEvidenceSupportFactualClaim);
  const byId = new Map(confirmed.map((item) => [item.id, item]));
  const sourceIds = new Set(source.selectedEvidenceIds);
  const candidates = new Map<string, CandidateAccumulator>();

  const getCandidate = (item: CandidateEvidence): CandidateAccumulator => {
    const existing = candidates.get(item.id);
    if (existing) return existing;
    const created: CandidateAccumulator = {
      evidence: item,
      direct: false,
      transferable: false,
      source: false,
      score: 0,
      requirementIds: new Set<string>(),
      reasons: new Set<string>(),
    };
    candidates.set(item.id, created);
    return created;
  };

  for (const evidenceId of source.selectedEvidenceIds) {
    const item = byId.get(evidenceId);
    if (!item) continue;
    const candidate = getCandidate(item);
    candidate.source = true;
    candidate.score += 15;
    candidate.reasons.add("Already present in the source resume.");
  }

  for (const item of coverage.items) {
    const classification = item.mapping.classification;
    if (
      (classification !== "direct" && classification !== "transferable") ||
      !item.evidence ||
      !canEvidenceSupportFactualClaim(item.evidence)
    ) {
      continue;
    }

    const candidate = getCandidate(item.evidence);
    candidate.direct ||= classification === "direct";
    candidate.transferable ||= classification === "transferable";
    candidate.score += weightedRequirementScore(
      classification,
      item.requirement.importance,
    );
    candidate.requirementIds.add(item.requirement.id);
    candidate.reasons.add(item.mapping.explanation);
  }

  const rankedCandidates: ResumeTailoringCandidate[] = [...candidates.values()]
    .map((candidate) => ({
      evidenceId: candidate.evidence.id,
      statement: candidate.evidence.statement,
      section: resumeSectionForEvidence(candidate.evidence),
      support: supportFor(candidate),
      score: Math.round(candidate.score * 100) / 100,
      matchedRequirementIds: [...candidate.requirementIds],
      reasons: [...candidate.reasons],
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const sectionDifference =
        resumeSectionRank(left.section) - resumeSectionRank(right.section);
      if (sectionDifference) return sectionDifference;
      return left.evidenceId.localeCompare(right.evidenceId);
    });

  let suggestedEvidenceIds = rankedCandidates
    .filter((candidate) => candidate.support !== "source-only")
    .map((candidate) => candidate.evidenceId);

  // If the deterministic mapper found no supported evidence at all, preserve
  // the source resume rather than producing an empty "tailored" document.
  if (suggestedEvidenceIds.length === 0) {
    suggestedEvidenceIds = rankedCandidates
      .filter((candidate) => sourceIds.has(candidate.evidenceId))
      .map((candidate) => candidate.evidenceId);
  }

  const suggested = new Set(suggestedEvidenceIds);
  const gaps = coverage.items
    .filter(
      (item) =>
        item.mapping.classification === "gap" ||
        item.mapping.classification === "ambiguous",
    )
    .map((item) => ({
      requirementId: item.requirement.id,
      kind: item.requirement.kind,
      text: item.requirement.text,
      importance: item.requirement.importance,
      state: item.mapping.classification as "gap" | "ambiguous",
      evidenceId: item.evidence?.id ?? null,
      explanation: item.mapping.explanation,
    }));

  return {
    sourceProjectionId: source.id,
    jobId: coverage.jobId,
    generatedAt: now,
    suggestedEvidenceIds,
    retainedSourceEvidenceIds: source.selectedEvidenceIds.filter((id) =>
      suggested.has(id),
    ),
    addedEvidenceIds: suggestedEvidenceIds.filter((id) => !sourceIds.has(id)),
    omittedSourceEvidenceIds: source.selectedEvidenceIds.filter(
      (id) => !suggested.has(id),
    ),
    candidates: rankedCandidates,
    gaps,
    directCount: coverage.directCount,
    transferableCount: coverage.transferableCount,
    ambiguousCount: coverage.ambiguousCount,
    gapCount: coverage.gapCount,
  };
}
