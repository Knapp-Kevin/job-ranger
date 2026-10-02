import type {
  CareerSearchConstraints,
  TargetTrackRelation,
} from "./career-contracts.js";

/**
 * User-editable portion of a Career Target Track.
 * Identity, provenance, and timestamps remain backend-owned.
 */
export interface CareerTargetTrackInput {
  name: string;
  relation: TargetTrackRelation;
  roleTitles: string[];
  seniority: string | null;
  direction: string | null;
  constraints: CareerSearchConstraints;
  isActive: boolean;
}
