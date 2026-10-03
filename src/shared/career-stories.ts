import type {
  EvidenceSubjectType,
  EvidenceVerificationState,
} from "./career-contracts.js";

export interface CareerStoryInput {
  title: string;
  tags: string[];
  situation: string;
  challenge: string;
  action: string;
  result: string;
  reflection: string;
  evidenceIds: string[];
}

export interface CareerStoryEvidence {
  evidenceId: string;
  subjectType: EvidenceSubjectType;
  statement: string;
  verificationState: EvidenceVerificationState;
  stale: boolean;
  replacementEvidenceIds: string[];
}

export interface CareerStory {
  id: string;
  title: string;
  tags: string[];
  situation: string;
  challenge: string;
  action: string;
  result: string;
  reflection: string;
  evidence: CareerStoryEvidence[];
  staleEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerStoriesDesktopApi {
  careerStories: {
    list: () => Promise<CareerStory[]>;
    create: (input: CareerStoryInput) => Promise<CareerStory>;
    update: (storyId: string, input: CareerStoryInput) => Promise<CareerStory>;
    delete: (storyId: string) => Promise<void>;
  };
}
