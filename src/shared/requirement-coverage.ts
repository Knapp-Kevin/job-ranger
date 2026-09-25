import type {
  CandidateEvidence,
  JobRequirement,
  RequirementEvidenceMap,
} from "./career-contracts.js";

export interface RequirementCoverageItem {
  requirement: JobRequirement;
  mapping: RequirementEvidenceMap;
  evidence: CandidateEvidence | null;
}

export interface JobEvidenceCoverage {
  jobId: string;
  items: RequirementCoverageItem[];
  directCount: number;
  transferableCount: number;
  ambiguousCount: number;
  gapCount: number;
  supportedCount: number;
  totalCount: number;
  generatedAt: string;
}
