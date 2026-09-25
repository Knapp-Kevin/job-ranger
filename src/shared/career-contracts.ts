export type OnCallPreference = "yes" | "no" | "either";
export type PayBasis = "hourly" | "annual";
export type ApplicationStatus =
  | "interested"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface CareerProfile {
  version: 2;
  fullName: string;
  homeLocation: string;
  radiusMiles: number | null;
  minimumPay: number | null;
  payBasis: PayBasis;
  targetTitles: string[];
  skills: string[];
  certifications: string[];
  sectors: string[];
  onCallPreference: OnCallPreference;
  fullTimeOnly: boolean;
  updatedAt: string | null;
}

export interface TrackedApplication {
  id: string;
  jobId: string;
  title: string;
  companyName: string;
  url: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationUpdate = Partial<
  Pick<TrackedApplication, "status" | "notes">
>;

/**
 * One-time migration payload from the v1.1 renderer-local persistence boundary.
 * The backend treats this as untrusted IPC input and imports it idempotently.
 */
export interface LegacyCareerMigration {
  profile: CareerProfile | null;
  applications: TrackedApplication[];
}

export type SourceArtifactKind =
  | "resume"
  | "certificate"
  | "transcript"
  | "note"
  | "other";

export type SourceArtifactExtractionState =
  | "pending"
  | "extracted"
  | "review-required"
  | "needs-ocr"
  | "encrypted"
  | "malformed"
  | "unsupported"
  | "resource-limited"
  | "failed";

export interface SourceArtifact {
  id: string;
  kind: SourceArtifactKind;
  originalName: string;
  mediaType: string;
  detectedFormat: string | null;
  contentHash: string;
  managedPath: string;
  byteSize: number;
  importedAt: string;
  parserId: string | null;
  parserVersion: string | null;
  extractionState: SourceArtifactExtractionState;
  warnings: string[];
}

export interface ExtractionSnapshot {
  id: string;
  sourceArtifactId: string;
  parserId: string;
  parserVersion: string;
  rawText: string;
  structuredPayload: unknown | null;
  warnings: string[];
  createdAt: string;
}

export type ResumeImportFailureCode =
  | "ocr-required"
  | "encrypted"
  | "malformed"
  | "unsupported"
  | "resource-limit"
  | "parser-failure";

export interface PastedResumeInput {
  label: string;
  text: string;
}

export interface ResumeImportResult {
  artifact: SourceArtifact;
  extractionSnapshot: ExtractionSnapshot | null;
  proposedEvidence: CandidateEvidence[];
  duplicate: boolean;
  failureCode: ResumeImportFailureCode | null;
  message: string | null;
}

export type EvidenceSubjectType =
  | "role"
  | "skill"
  | "credential"
  | "education"
  | "project"
  | "achievement"
  | "publication"
  | "other";

export type EvidenceVerificationState =
  | "imported"
  | "user-confirmed"
  | "user-authored"
  | "inferred-pending"
  | "rejected";

export interface CandidateEvidence {
  id: string;
  subjectType: EvidenceSubjectType;
  organization: string | null;
  titleOrName: string | null;
  startDate: string | null;
  endDate: string | null;
  statement: string;
  action: string | null;
  context: string | null;
  skills: string[];
  methodsOrTools: string[];
  scope: string[];
  outcomes: string[];
  metrics: string[];
  verificationState: EvidenceVerificationState;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceSourceRelation =
  | "extracted"
  | "supports"
  | "contradicts"
  | "supersedes";

export interface EvidenceSourceLink {
  id: string;
  evidenceId: string;
  sourceArtifactId: string;
  extractionSnapshotId: string | null;
  sourceLocator: string | null;
  sourceText: string | null;
  relation: EvidenceSourceRelation;
  createdAt: string;
}

export interface EvidenceReviewSource {
  sourceArtifactId: string;
  originalName: string;
  extractionSnapshotId: string | null;
  sourceLocator: string | null;
  sourceText: string | null;
  relation: EvidenceSourceRelation;
}

export interface CandidateEvidenceReviewItem {
  evidence: CandidateEvidence;
  sources: EvidenceReviewSource[];
}

export type EvidenceReviewAction = "confirm" | "edit" | "reject";

export interface EvidenceReviewUpdate {
  action: EvidenceReviewAction;
  statement?: string;
  subjectType?: EvidenceSubjectType;
}

export type JobRequirementKind =
  | "must-have"
  | "preferred"
  | "responsibility"
  | "credential"
  | "logistics";

export interface JobRequirement {
  id: string;
  jobId: string;
  kind: JobRequirementKind;
  text: string;
  normalizedTerm: string | null;
  importance: number | null;
  sourceText: string;
  createdAt: string;
}

export type RequirementEvidenceClassification =
  | "direct"
  | "transferable"
  | "ambiguous"
  | "gap";

export type EvidenceMappingAuthority =
  | "deterministic"
  | "inference"
  | "user";

export interface RequirementEvidenceMap {
  id: string;
  jobRequirementId: string;
  evidenceId: string | null;
  classification: RequirementEvidenceClassification;
  explanation: string;
  createdBy: EvidenceMappingAuthority;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ResumeContext =
  | "private-sector"
  | "hybrid"
  | "federal"
  | "academic";

export type ResumePageFormat = "letter" | "a4";
export type ResumeProjectionStatus = "draft" | "reviewed" | "finalized";

export interface ResumeProjection {
  id: string;
  jobId: string | null;
  context: ResumeContext;
  pageFormat: ResumePageFormat;
  sourceProjectionId: string | null;
  status: ResumeProjectionStatus;
  sections: string[];
  selectedEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResumeGenerationMode =
  | "deterministic"
  | "assisted"
  | "user-authored";

export interface ResumeStatement {
  id: string;
  projectionId: string;
  section: string;
  order: number;
  text: string;
  evidenceIds: string[];
  generationMode: ResumeGenerationMode;
  userEdited: boolean;
}

export type ResumeArtifactFormat = "pdf" | "html" | "docx";

export interface ResumeArtifact {
  id: string;
  projectionId: string;
  version: number;
  format: ResumeArtifactFormat;
  managedPath: string;
  contentHash: string;
  pageCount: number | null;
  truthGateResult: string | null;
  parseabilityResult: string | null;
  relevanceReviewResult: string | null;
  createdAt: string;
}

export type ApplicationArtifactPurpose =
  | "submitted"
  | "recruiter-copy"
  | "interview-copy"
  | "other";

export interface ApplicationArtifactLink {
  id: string;
  applicationId: string;
  resumeArtifactId: string;
  purpose: ApplicationArtifactPurpose;
  recordedAt: string;
}

export function canEvidenceSupportFactualClaim(
  evidence: Pick<CandidateEvidence, "verificationState">,
): boolean {
  return (
    evidence.verificationState === "user-confirmed" ||
    evidence.verificationState === "user-authored"
  );
}

export interface ResumeStatementTruthResult {
  supported: boolean;
  missingEvidenceIds: string[];
  unconfirmedEvidenceIds: string[];
}

export function evaluateResumeStatementTruth(
  statement: Pick<ResumeStatement, "evidenceIds" | "generationMode">,
  evidence: readonly Pick<CandidateEvidence, "id" | "verificationState">[],
): ResumeStatementTruthResult {
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const missingEvidenceIds = statement.evidenceIds.filter((id) => !byId.has(id));
  const unconfirmedEvidenceIds = statement.evidenceIds.filter((id) => {
    const item = byId.get(id);
    return item ? !canEvidenceSupportFactualClaim(item) : false;
  });

  const requiresEvidence = statement.generationMode !== "user-authored";
  const supported =
    missingEvidenceIds.length === 0 &&
    unconfirmedEvidenceIds.length === 0 &&
    (!requiresEvidence || statement.evidenceIds.length > 0);

  return { supported, missingEvidenceIds, unconfirmedEvidenceIds };
}