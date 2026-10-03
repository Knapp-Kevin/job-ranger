import type {
  CredentialDetails,
  EvidenceSubjectType,
} from "./career-contracts.js";

/**
 * Facts a user enters directly are authoritative user-authored Career Evidence,
 * not import proposals. Optional structure preserves meaning when the user has
 * it without making resume-shaped fields mandatory for every career history.
 */
export interface UserAuthoredEvidenceInput {
  subjectType: EvidenceSubjectType;
  statement: string;
  organization?: string | null;
  titleOrName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  skills?: string[];
  methodsOrTools?: string[];
  scope?: string[];
  outcomes?: string[];
  metrics?: string[];
  credential?: CredentialDetails | null;
}
