import type {
  CandidateEvidence,
  ResumeProjection,
  ResumeStatement,
} from "./career-contracts.js";

export interface ResumeTruthGateIssue {
  code:
    | "no-confirmed-evidence"
    | "missing-evidence"
    | "unconfirmed-evidence"
    | "deterministic-text-drift";
  statementId: string | null;
  evidenceIds: string[];
  message: string;
}

export interface ResumeTruthGateResult {
  passed: boolean;
  blockingIssues: ResumeTruthGateIssue[];
  checkedStatementCount: number;
  checkedEvidenceCount: number;
}

export interface ResumeProjectionBundle {
  projection: ResumeProjection;
  statements: ResumeStatement[];
  evidence: CandidateEvidence[];
  truthGate: ResumeTruthGateResult;
}

export interface CreateResumeProjectionInput {
  jobId: string;
  context?: ResumeProjection["context"];
  pageFormat?: ResumeProjection["pageFormat"];
}

export interface ReviseResumeProjectionInput {
  sourceProjectionId: string;
  selectedEvidenceIds: string[];
}
