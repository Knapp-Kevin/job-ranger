import type {
  ApplicationArtifactPurpose,
  CandidateEvidence,
  JobRequirementKind,
  ResumeArtifact,
  ResumeContext,
  ResumePageFormat,
  ResumeProjection,
  ResumeStatement,
} from "./career-contracts.js";

export type ResumeTemplateId = "ats-standard-v1" | "ats-compact-v1";

export interface ResumeContactSnapshot {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ResumeCreateInput {
  jobId: string | null;
  context: ResumeContext;
  pageFormat: ResumePageFormat;
  templateId: ResumeTemplateId;
  contact: ResumeContactSnapshot;
  selectedEvidenceIds: string[];
}

export interface ResumeProjectionRecord extends ResumeProjection {
  templateId: ResumeTemplateId;
  contact: ResumeContactSnapshot;
}

export interface ResumeStatementUpdate {
  text: string;
}

export interface ResumeTruthIssue {
  statementId: string;
  code: "missing-evidence" | "unconfirmed-evidence" | "unsupported-edit";
  message: string;
  evidenceIds: string[];
}

export interface ResumeTruthGateReport {
  passed: boolean;
  checkedAt: string;
  issues: ResumeTruthIssue[];
}

export interface ResumeParseabilityIssue {
  code:
    | "pdf-unreadable"
    | "contact-missing"
    | "statement-missing"
    | "reading-order"
    | "hidden-content"
    | "page-count";
  severity: "critical" | "advisory";
  message: string;
}

export interface ResumeParseabilityGateReport {
  passed: boolean;
  checkedAt: string;
  pageCount: number | null;
  parserId: string;
  parserVersion: string;
  issues: ResumeParseabilityIssue[];
}

export interface ResumeArtifactSnapshot {
  projection: ResumeProjectionRecord;
  statements: ResumeStatement[];
}

export interface ResumeArtifactRecord extends ResumeArtifact {
  projectionSnapshot: ResumeArtifactSnapshot;
}

export interface ResumeProjectionDetail {
  projection: ResumeProjectionRecord;
  statements: ResumeStatement[];
  evidence: CandidateEvidence[];
  truthGate: ResumeTruthGateReport;
  artifacts: ResumeArtifactRecord[];
}

export interface ResumeExportRequest {
  projectionId: string;
  applicationId?: string | null;
  purpose?: ApplicationArtifactPurpose;
}

export interface ResumeExportResult {
  artifact: ResumeArtifactRecord | null;
  truthGate: ResumeTruthGateReport;
  parseabilityGate: ResumeParseabilityGateReport | null;
  linkedApplicationId: string | null;
}

export interface ResumeVersionDiff {
  fromArtifactId: string;
  toArtifactId: string;
  addedStatements: string[];
  removedStatements: string[];
  unchangedStatements: string[];
}

export type ResumeTailoringSupport = "direct" | "transferable" | "source-only";

export interface ResumeTailoringCandidate {
  evidenceId: string;
  statement: string;
  section: string;
  support: ResumeTailoringSupport;
  score: number;
  matchedRequirementIds: string[];
  reasons: string[];
}

export interface ResumeTailoringGap {
  requirementId: string;
  kind: JobRequirementKind;
  text: string;
  importance: number | null;
  state: "gap" | "ambiguous";
  evidenceId: string | null;
  explanation: string;
}

export interface ResumeTailoringPlan {
  sourceProjectionId: string;
  jobId: string;
  generatedAt: string;
  suggestedEvidenceIds: string[];
  retainedSourceEvidenceIds: string[];
  addedEvidenceIds: string[];
  omittedSourceEvidenceIds: string[];
  candidates: ResumeTailoringCandidate[];
  gaps: ResumeTailoringGap[];
  directCount: number;
  transferableCount: number;
  ambiguousCount: number;
  gapCount: number;
}

export interface ResumeTailoringPreviewRequest {
  sourceProjectionId: string;
  jobId: string;
}

export interface ResumeTailoringApplyRequest extends ResumeTailoringPreviewRequest {
  selectedEvidenceIds: string[];
}
