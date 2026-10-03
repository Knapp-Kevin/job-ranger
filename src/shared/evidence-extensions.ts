import type { CandidateEvidence, EvidenceSubjectType } from "./career-contracts.js";

export type EvidenceReferenceKind = "url" | "local";

/**
 * A bounded pointer to work that supports or demonstrates Career Evidence.
 * URL references are user-approved http/https links. Local references are
 * inert text pointers and are never executed or opened automatically.
 */
export interface EvidenceReferenceInput {
  kind: EvidenceReferenceKind;
  label?: string | null;
  value: string;
}

export interface EvidenceReference {
  id: string;
  evidenceId: string;
  kind: EvidenceReferenceKind;
  label: string | null;
  value: string;
  createdAt: string;
}

export type EvidenceLineageRelation = "supersedes";

export interface EvidenceLineage {
  id: string;
  predecessorEvidenceId: string;
  successorEvidenceId: string;
  relation: EvidenceLineageRelation;
  createdAt: string;
}

export interface EvidenceMetadata {
  evidenceId: string;
  references: EvidenceReference[];
  lineage: EvidenceLineage[];
}

export interface EvidenceSupersedeInput {
  subjectType: EvidenceSubjectType;
  statement: string;
}

export interface EvidenceExtensionDesktopApi {
  careerEvidence: {
    listMetadata: () => Promise<EvidenceMetadata[]>;
    setReferences: (
      evidenceId: string,
      references: EvidenceReferenceInput[],
    ) => Promise<EvidenceReference[]>;
    supersedeEvidence: (
      evidenceId: string,
      input: EvidenceSupersedeInput,
    ) => Promise<CandidateEvidence>;
  };
}
