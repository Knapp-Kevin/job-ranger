/**
 * Career outcome journal for Personal Brand.
 *
 * User-attested events only; a post association is context, never an attribution
 * claim. No AI, social API, inferred conversion, or external side effects.
 */
import type { ManualPublicationReceipt } from "./personal-brand.js";

export type CareerOutcomeKind =
  | "recruiter_outreach" | "meaningful_conversation" | "referral"
  | "interview_invitation" | "interview_completed" | "offer" | "other";
export type PostAssociation = "none" | "post_mentioned" | "user_reported_discovery";

export interface CareerOutcomeInput {
  kind: CareerOutcomeKind;
  occurredAt: string;
  sourceLabel: string;
  note: string;
  relatedPostId: string | null;
  association: PostAssociation;
  userConfirmed: boolean;
}
export interface CareerOutcomeRecord extends CareerOutcomeInput {
  id: string;
  recordedAt: string;
  userConfirmed: true;
  source: "user_attested";
}
export interface CareerOutcomeSummary {
  count: number;
  postAssociatedCount: number;
  unlinkedCount: number;
  byKind: Record<CareerOutcomeKind, number>;
  message: string;
}
export const OUTCOME_KINDS: readonly CareerOutcomeKind[] = [
  "recruiter_outreach", "meaningful_conversation", "referral",
  "interview_invitation", "interview_completed", "offer", "other",
] as const;
export const ASSOCIATION_KINDS: readonly PostAssociation[] = [
  "none", "post_mentioned", "user_reported_discovery",
] as const;

function validInstant(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
      !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}
export function validateCareerOutcomeInput(
  raw: unknown, publications: readonly ManualPublicationReceipt[],
  now: string,
): CareerOutcomeInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("A career outcome must be a structured record.");
  const value = raw as Record<string, unknown>;
  if (!OUTCOME_KINDS.includes(value.kind as CareerOutcomeKind))
    throw new Error("Select a supported career outcome.");
  if (!ASSOCIATION_KINDS.includes(value.association as PostAssociation))
    throw new Error("Select an explicit post association.");
  if (value.userConfirmed !== true)
    throw new Error("A user must explicitly confirm the real career event.");
  if (typeof value.occurredAt !== "string" || !validInstant(value.occurredAt) ||
      !validInstant(now) || Date.parse(value.occurredAt) > Date.parse(now) + 5 * 60_000)
    throw new Error("Outcome time must be valid, timezone-aware, and not in the future.");
  if (typeof value.sourceLabel !== "string" ||
      value.sourceLabel.trim().length === 0 || value.sourceLabel.trim().length > 120)
    throw new Error("Record a concise source for this manual observation.");
  if (typeof value.note !== "string" || value.note.length > 500)
    throw new Error("Keep the optional, privacy-reviewed note under 500 characters.");
  const postId = value.relatedPostId;
  if (postId !== null && (typeof postId !== "string" || postId.length > 150))
    throw new Error("Related post must be an existing recorded publication or absent.");
  if ((postId === null) !== (value.association === "none"))
    throw new Error("Unlinked outcomes cannot claim a post association.");
  if (postId !== null) {
    const publication = publications.find((receipt) => receipt.postId === postId);
    if (!publication)
      throw new Error("Related post does not exist in the canonical publication records.");
    if (Date.parse(value.occurredAt) < Date.parse(publication.publishedAt))
      throw new Error("An outcome cannot be associated with a post published later.");
  }
  return {
    kind: value.kind as CareerOutcomeKind,
    occurredAt: value.occurredAt,
    sourceLabel: value.sourceLabel.trim(),
    note: value.note.trim(),
    relatedPostId: postId,
    association: value.association as PostAssociation,
    userConfirmed: true,
  };
}
export function summarizeCareerOutcomes(
  outcomes: readonly CareerOutcomeRecord[],
): CareerOutcomeSummary {
  const byKind = Object.fromEntries(OUTCOME_KINDS.map((kind) => [kind, 0])) as Record<CareerOutcomeKind, number>;
  for (const event of outcomes) {
    if (event.userConfirmed !== true || event.source !== "user_attested" ||
        !OUTCOME_KINDS.includes(event.kind)) continue;
    byKind[event.kind] += 1;
  }
  const confirmed = outcomes.filter((event) =>
    event.userConfirmed === true && event.source === "user_attested" &&
    OUTCOME_KINDS.includes(event.kind));
  const postAssociatedCount = confirmed.filter((event) =>
    event.relatedPostId !== null && event.association !== "none").length;
  return {
    count: confirmed.length,
    postAssociatedCount,
    unlinkedCount: confirmed.length - postAssociatedCount,
    byKind,
    message: "Self-reported outcomes are observations, not conversions attributable to a post. A reference or timing relationship cannot establish causation.",
  };
}
