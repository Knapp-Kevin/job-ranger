import type {
  JobRequirementKind,
  RequirementMappingClassification,
} from "./career-contracts.js";

export interface InterviewPrepApplication {
  applicationId: string;
  jobId: string;
  title: string;
  companyName: string;
  url: string;
  status: string;
}

export interface InterviewPrepJobContext {
  location: string | null;
  employmentType: string | null;
  descriptionSnippet: string | null;
}

export interface InterviewPrepSubmittedResume {
  artifactId: string;
  projectionId: string;
  version: number;
  recordedAt: string;
  artifactCreatedAt: string;
  statements: Array<{
    id: string;
    section: string;
    text: string;
    evidenceIds: string[];
  }>;
}

export interface InterviewPrepRequirement {
  requirementId: string;
  kind: JobRequirementKind;
  text: string;
  importance: number | null;
  classification: RequirementMappingClassification;
  explanation: string;
  evidenceId: string | null;
  evidenceStatement: string | null;
  evidenceWasSubmitted: boolean;
  submittedStatementTexts: string[];
  preparationPrompt: string;
}

export interface InterviewPrepResult {
  generatedAt: string;
  application: InterviewPrepApplication;
  job: InterviewPrepJobContext | null;
  submittedResume: InterviewPrepSubmittedResume | null;
  requirements: InterviewPrepRequirement[];
  warnings: string[];
  suggestedQuestions: string[];
}

export interface InterviewPrepDesktopApi {
  interviewPrep: {
    get: (applicationId: string) => Promise<InterviewPrepResult>;
  };
}
