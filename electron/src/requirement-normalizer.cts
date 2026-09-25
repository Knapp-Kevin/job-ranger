import { createHash } from "node:crypto";
import type {
  CandidateEvidence,
  JobRequirement,
  JobRequirementKind,
  RequirementEvidenceClassification,
  RequirementEvidenceMap,
} from "../../src/shared/contracts.js";

export const REQUIREMENT_NORMALIZER_VERSION = 1;

const stopWords = new Set([
  "and", "the", "for", "with", "that", "this", "from", "your", "you", "our",
  "are", "will", "have", "has", "into", "about", "their", "they", "who", "but",
  "not", "all", "any", "job", "role", "work", "working", "ability", "able", "using",
  "including", "such", "other", "within", "across", "required", "requirement", "requirements",
  "preferred", "minimum", "must", "plus", "strong", "excellent", "demonstrated", "experience",
  "years", "year", "skills", "skill", "knowledge", "responsible", "responsibility",
]);

const headingRules: Array<{ pattern: RegExp; kind: JobRequirementKind | "ignore" }> = [
  { pattern: /^(preferred qualifications?|preferred requirements?|nice to have|bonus|pluses?)$/i, kind: "preferred" },
  { pattern: /^(minimum qualifications?|minimum requirements?|requirements?|qualifications?|what you bring|what we(?:'|’)re looking for|who you are)$/i, kind: "must-have" },
  { pattern: /^(responsibilities|duties|what you(?:'|’)ll do|what you will do|day to day|the role|role responsibilities)$/i, kind: "responsibility" },
  { pattern: /^(licenses?|certifications?|credentials?|education)$/i, kind: "credential" },
  { pattern: /^(schedule|travel|location|work environment|physical requirements?|availability)$/i, kind: "logistics" },
  { pattern: /^(benefits|perks|compensation|about us|about the company|who we are|equal opportunity|eeo|why join us)$/i, kind: "ignore" },
];

export interface NormalizedRequirementDraft {
  id: string;
  jobId: string;
  kind: JobRequirementKind;
  text: string;
  normalizedTerm: string | null;
  importance: number | null;
  sourceText: string;
  createdAt: string;
}

export interface DeterministicMappingDraft {
  id: string;
  jobRequirementId: string;
  evidenceId: string | null;
  classification: RequirementEvidenceClassification;
  explanation: string;
  createdBy: "deterministic";
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9+#./'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .map((token) => token.replace(/^[./'-]+|[./'-]+$/g, ""))
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function cleanCandidateLine(value: string): string {
  return value
    .replace(/^[-*•▪◦‣–—]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function sourceLines(descriptionText: string): string[] {
  const output: string[] = [];
  for (const raw of descriptionText.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length > 300) {
      const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
      output.push(...sentences.map((item) => item.trim()).filter(Boolean));
    } else {
      output.push(line);
    }
  }
  return output;
}

function headingKind(line: string): JobRequirementKind | "ignore" | null {
  const candidate = line.replace(/[:：]\s*$/, "").trim();
  if (candidate.length > 90) return null;
  for (const rule of headingRules) {
    if (rule.pattern.test(candidate)) return rule.kind;
  }
  return null;
}

function classifyLine(line: string, section: JobRequirementKind | "ignore" | null): JobRequirementKind | null {
  const text = normalize(line);
  if (!text || section === "ignore") return null;

  if (/\b(certification|certified|license|licensed|licensure|degree|diploma|ged|bachelor|master|doctorate|cpa|rn|cdl)\b/i.test(text)) {
    return "credential";
  }
  if (/\b(travel|shift|weekend|evening|overnight|on call|on-call|remote|hybrid|onsite|on-site|location|lift|pounds|driver'?s license|work authorization|authorized to work)\b/i.test(text)) {
    return "logistics";
  }
  if (/\b(preferred|nice to have|bonus|plus)\b/i.test(text)) return "preferred";
  if (/\b(must|required|minimum|at least|need to|needs to)\b/i.test(text)) return "must-have";
  if (section && section !== "ignore") return section;
  return null;
}

function importanceFor(kind: JobRequirementKind): number {
  switch (kind) {
    case "must-have":
    case "credential":
      return 1;
    case "preferred":
      return 0.8;
    case "logistics":
      return 0.75;
    case "responsibility":
      return 0.65;
  }
}

function normalizedTerm(text: string): string | null {
  const meaningful = dedupe(tokens(text));
  return meaningful.length > 0 ? meaningful.slice(0, 12).join(" ") : null;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
}

export function requirementSourceHash(descriptionText: string): string {
  return createHash("sha256").update(descriptionText).digest("hex");
}

export function normalizeJobRequirements(
  jobId: string,
  descriptionText: string,
  now = new Date().toISOString(),
): NormalizedRequirementDraft[] {
  const result: NormalizedRequirementDraft[] = [];
  const seen = new Set<string>();
  let section: JobRequirementKind | "ignore" | null = null;

  for (const rawLine of sourceLines(descriptionText)) {
    const heading = headingKind(rawLine);
    if (heading) {
      section = heading;
      continue;
    }

    const line = cleanCandidateLine(rawLine);
    if (line.length < 4 || line.length > 1000) continue;
    const kind = classifyLine(line, section);
    if (!kind) continue;

    const fingerprint = `${kind}\n${normalize(line)}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push({
      id: stableId("requirement", `${jobId}\n${fingerprint}`),
      jobId,
      kind,
      text: line,
      normalizedTerm: normalizedTerm(line),
      importance: importanceFor(kind),
      sourceText: rawLine,
      createdAt: now,
    });
  }

  return result.slice(0, 80);
}

function evidenceSearchText(evidence: CandidateEvidence): string {
  return [
    evidence.titleOrName,
    evidence.organization,
    evidence.statement,
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

function scoreEvidence(requirement: JobRequirement, evidence: CandidateEvidence) {
  const requirementTokens = dedupe(tokens(requirement.normalizedTerm ?? requirement.text));
  const evidenceText = normalize(evidenceSearchText(evidence));
  const evidenceTokens = new Set(tokens(evidenceText));
  const overlap = requirementTokens.filter((token) => evidenceTokens.has(token));
  const ratio = requirementTokens.length > 0 ? overlap.length / requirementTokens.length : 0;
  const phrase = normalize(requirement.normalizedTerm ?? requirement.text);
  const phraseMatch = phrase.length >= 3 && evidenceText.includes(phrase);
  return { evidence, overlap, ratio, phraseMatch };
}

function mappingId(requirementId: string, evidenceId: string | null): string {
  return stableId("mapping", `${requirementId}\n${evidenceId ?? "gap"}`);
}

export function mapRequirementToEvidence(
  requirement: JobRequirement,
  evidence: readonly CandidateEvidence[],
  now = new Date().toISOString(),
): DeterministicMappingDraft {
  const eligible = evidence.filter(
    (item) => item.verificationState === "user-confirmed" || item.verificationState === "user-authored",
  );
  const scored = eligible
    .map((item) => scoreEvidence(requirement, item))
    .sort((a, b) => Number(b.phraseMatch) - Number(a.phraseMatch) || b.ratio - a.ratio || b.overlap.length - a.overlap.length);
  const best = scored[0];

  let classification: RequirementEvidenceClassification = "gap";
  let evidenceId: string | null = null;
  let explanation = "No confirmed Career Evidence currently supports this requirement.";

  if (best) {
    const credentialCompatible =
      requirement.kind !== "credential" || best.evidence.subjectType === "credential" || best.phraseMatch;

    if (credentialCompatible && (best.phraseMatch || (best.overlap.length >= 2 && best.ratio >= 0.75))) {
      classification = "direct";
      evidenceId = best.evidence.id;
      explanation = best.phraseMatch
        ? "Confirmed evidence contains the normalized requirement phrase."
        : `Confirmed evidence directly overlaps on ${best.overlap.slice(0, 5).join(", ")}.`;
    } else if (credentialCompatible && best.overlap.length >= 2 && best.ratio >= 0.4) {
      classification = "transferable";
      evidenceId = best.evidence.id;
      explanation = `Confirmed evidence shares relevant signals (${best.overlap.slice(0, 5).join(", ")}) but does not state the requirement directly.`;
    } else if (best.overlap.length >= 1 && best.ratio >= 0.2) {
      classification = "ambiguous";
      evidenceId = best.evidence.id;
      explanation = `There is partial overlap (${best.overlap.slice(0, 4).join(", ")}), but Job Ranger will not treat it as support without your confirmation.`;
    }
  }

  return {
    id: mappingId(requirement.id, evidenceId),
    jobRequirementId: requirement.id,
    evidenceId,
    classification,
    explanation,
    createdBy: "deterministic",
    userConfirmed: false,
    createdAt: now,
    updatedAt: now,
  };
}
