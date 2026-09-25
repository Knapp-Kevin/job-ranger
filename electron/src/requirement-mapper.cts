import { createHash } from "node:crypto";
import type {
  CandidateEvidence,
  EvidenceVerificationState,
  Job,
  JobRequirement,
  JobRequirementKind,
  RequirementEvidenceMap,
  RequirementEvidenceClassification,
} from "../../src/shared/contracts.js";
import type { JobEvidenceCoverage } from "../../src/shared/requirement-coverage.js";

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "that", "this", "from", "your", "you", "our",
  "are", "will", "have", "has", "into", "their", "they", "job", "role", "work",
  "years", "year", "experience", "required", "preferred", "minimum", "ability",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function commonPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

/**
 * Deliberately conservative morphological equivalence for deterministic
 * matching. It catches ordinary inflections such as maintain/maintained,
 * coordinate/coordinated, record/records, and schedule/scheduling without
 * introducing a fuzzy semantic matcher that could invent support.
 */
function tokenEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.length < 5 || right.length < 5) return false;
  if (left.startsWith(right) || right.startsWith(left)) {
    return Math.abs(left.length - right.length) <= 4;
  }
  const prefix = commonPrefixLength(left, right);
  const shorter = Math.min(left.length, right.length);
  return prefix >= 5 && prefix / shorter >= 0.75 && Math.abs(left.length - right.length) <= 4;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
}

function classifyRequirement(text: string): JobRequirementKind | null {
  const value = normalize(text);
  if (!value || value.length < 8) return null;

  if (/\b(certif|license|licence|credential|registration|degree|diploma)\w*/.test(value)) {
    return "credential";
  }
  if (/\b(remote|hybrid|onsite|on site|travel|shift|schedule|weekend|evening|night|on-call|on call|location|relocat)\w*/.test(value)) {
    return "logistics";
  }
  if (/\b(prefer|preferred|nice to have|plus|bonus|desirable)\b/.test(value)) {
    return "preferred";
  }
  if (/\b(required|requirement|must|minimum|at least|need to|needs to)\b/.test(value)) {
    return "must-have";
  }
  if (/\b(responsib|duties|will |manage|maintain|perform|support|lead|coordinate|develop|build|operate|install|repair|service|troubleshoot|communicate|deliver|administer)\w*/.test(value)) {
    return "responsibility";
  }
  return null;
}

function requirementImportance(kind: JobRequirementKind): number {
  switch (kind) {
    case "must-have":
    case "credential":
      return 1;
    case "preferred":
      return 0.7;
    case "responsibility":
      return 0.6;
    case "logistics":
      return 0.5;
  }
}

function requirementTerm(text: string): string | null {
  const tokens = significantTokens(text);
  return tokens.length > 0 ? tokens.slice(0, 6).join(" ") : null;
}

function splitRequirementText(value: string): string[] {
  return value
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=[.!?;])\s+/)
    .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((item) => item.length >= 8 && item.length <= 500);
}

export function extractJobRequirements(
  job: Pick<Job, "id" | "title" | "descriptionSnippet" | "location" | "employmentType">,
  now = new Date().toISOString(),
): JobRequirement[] {
  const sourceText = `${job.title}\n${job.descriptionSnippet}\n${job.location}\n${job.employmentType ?? ""}`;
  const candidates = splitRequirementText(sourceText);
  const seen = new Set<string>();
  const requirements: JobRequirement[] = [];

  for (const text of candidates) {
    const kind = classifyRequirement(text);
    if (!kind) continue;
    const normalized = normalize(text);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    requirements.push({
      id: stableId("requirement", `${job.id}\n${normalized}`),
      jobId: job.id,
      kind,
      text,
      normalizedTerm: requirementTerm(text),
      importance: requirementImportance(kind),
      sourceText: text,
      createdAt: now,
    });
    if (requirements.length >= 12) break;
  }

  return requirements;
}

function evidenceSearchText(evidence: CandidateEvidence): string {
  return [
    evidence.statement,
    evidence.organization,
    evidence.titleOrName,
    evidence.action,
    evidence.context,
    ...evidence.skills,
    ...evidence.methodsOrTools,
    ...evidence.scope,
    ...evidence.outcomes,
    ...evidence.metrics,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function overlapScore(requirement: JobRequirement, evidence: CandidateEvidence): number {
  const requirementTokens = significantTokens(requirement.text);
  if (requirementTokens.length === 0) return 0;
  const evidenceTokens = significantTokens(evidenceSearchText(evidence));
  const matched = requirementTokens.filter((token) =>
    evidenceTokens.some((candidate) => tokenEquivalent(token, candidate)),
  );
  return matched.length / requirementTokens.length;
}

function isConfirmed(state: EvidenceVerificationState): boolean {
  return state === "user-confirmed" || state === "user-authored";
}

function makeMapping(
  requirement: JobRequirement,
  evidence: CandidateEvidence | null,
  classification: RequirementEvidenceClassification,
  explanation: string,
  now: string,
): RequirementEvidenceMap {
  return {
    id: stableId(
      "mapping",
      `${requirement.id}\n${evidence?.id ?? "gap"}\n${classification}`,
    ),
    jobRequirementId: requirement.id,
    evidenceId: evidence?.id ?? null,
    classification,
    explanation,
    createdBy: "deterministic",
    userConfirmed: classification === "direct" || classification === "transferable",
    createdAt: now,
    updatedAt: now,
  };
}

function bestEvidence(
  requirement: JobRequirement,
  evidence: readonly CandidateEvidence[],
): { evidence: CandidateEvidence; score: number } | null {
  const ranked = evidence
    .filter((item) => item.verificationState !== "rejected")
    .map((item) => ({ evidence: item, score: overlapScore(requirement, item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0] ?? null;
}

export function mapRequirementToEvidence(
  requirement: JobRequirement,
  evidence: readonly CandidateEvidence[],
  now = new Date().toISOString(),
): { mapping: RequirementEvidenceMap; evidence: CandidateEvidence | null } {
  const best = bestEvidence(requirement, evidence);
  if (!best) {
    return {
      mapping: makeMapping(
        requirement,
        null,
        "gap",
        "No saved Career Evidence currently supports this requirement.",
        now,
      ),
      evidence: null,
    };
  }

  if (!isConfirmed(best.evidence.verificationState)) {
    if (best.score >= 0.6) {
      return {
        mapping: makeMapping(
          requirement,
          best.evidence,
          "ambiguous",
          "Imported evidence appears relevant, but it has not been confirmed by you yet.",
          now,
        ),
        evidence: best.evidence,
      };
    }
    return {
      mapping: makeMapping(
        requirement,
        null,
        "gap",
        "No confirmed Career Evidence currently supports this requirement.",
        now,
      ),
      evidence: null,
    };
  }

  if (best.score >= 0.7) {
    return {
      mapping: makeMapping(
        requirement,
        best.evidence,
        "direct",
        "Confirmed Career Evidence closely matches the language of this requirement.",
        now,
      ),
      evidence: best.evidence,
    };
  }

  if (best.score >= 0.35) {
    return {
      mapping: makeMapping(
        requirement,
        best.evidence,
        "transferable",
        "Confirmed Career Evidence overlaps with this requirement and may transfer to this context.",
        now,
      ),
      evidence: best.evidence,
    };
  }

  return {
    mapping: makeMapping(
      requirement,
      null,
      "gap",
      "The available evidence is too weak to claim support for this requirement.",
      now,
    ),
    evidence: null,
  };
}

export function buildJobEvidenceCoverage(
  jobId: string,
  requirements: readonly JobRequirement[],
  evidence: readonly CandidateEvidence[],
  now = new Date().toISOString(),
): JobEvidenceCoverage {
  const items = requirements.map((requirement) => {
    const mapped = mapRequirementToEvidence(requirement, evidence, now);
    return { requirement, mapping: mapped.mapping, evidence: mapped.evidence };
  });

  const directCount = items.filter((item) => item.mapping.classification === "direct").length;
  const transferableCount = items.filter((item) => item.mapping.classification === "transferable").length;
  const ambiguousCount = items.filter((item) => item.mapping.classification === "ambiguous").length;
  const gapCount = items.filter((item) => item.mapping.classification === "gap").length;

  return {
    jobId,
    items,
    directCount,
    transferableCount,
    ambiguousCount,
    gapCount,
    supportedCount: directCount + transferableCount,
    totalCount: items.length,
    generatedAt: now,
  };
}
