import type { CandidateEvidence, SourceArtifact } from "./contracts.js";

export interface JsonResumeImportResult {
  artifact: SourceArtifact;
  proposedEvidence: CandidateEvidence[];
  duplicate: boolean;
  warnings: string[];
  profileNameProposal: string | null;
}

export interface JsonResumeExportResult {
  filePath: string;
  exportedEvidenceCount: number;
  omittedEvidenceCount: number;
  warnings: string[];
}

export interface JsonResumeDesktopApi {
  jsonResume: {
    importFile: () => Promise<JsonResumeImportResult | null>;
    exportFile: () => Promise<JsonResumeExportResult | null>;
  };
}
