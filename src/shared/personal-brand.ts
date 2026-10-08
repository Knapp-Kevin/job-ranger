/**
 * Personal Brand manual publishing + analytics core.
 *
 * Deterministic, provider-neutral, zero dependencies on inference, network or Viable.
 * Inputs are user-confirmed career evidence/records. We cannot prove that
 * arbitrary prose is factually correct by inspecting strings.
 * See ADR-0001 and PERSONAL_BRAND_PUBLISHING_ANALYTICS.md.
 */
export type PresenceObjective =
  | "recruiter_discovery" | "expertise_proof" | "project_visibility"
  | "career_narrative" | "network_growth" | "community_contribution"
  | "job_search_learning" | "other";
export type SocialPlatform = "linkedin" | "facebook_page" | "instagram_professional" | "x";
export type PostFormat = "text" | "image" | "video" | "document" | "link";
export type HookArchetype =
  | "concrete_experience" | "contradiction" | "build_proof" | "lesson"
  | "counterintuitive" | "before_after" | "question" | "other";

export interface PersonalBrandDraft {
  id: string;
  revision: number;
  body: string;
  objective: PresenceObjective | null;
  audiences: string[];
  destination: SocialPlatform | null;
  format: PostFormat;
  hookArchetype: HookArchetype | null;
  hypothesis: string;
  claimChecks: Array<{
    claim: string;
    evidenceIds: string[];
    verified: boolean;
    privacyCleared: boolean;
  }>;
  mediaCount: number;
  mediaAccessibilityReviewed: boolean;
}
export interface ReadinessFinding {
  code: string;
  severity: "blocking" | "warning" | "info";
  message: string;
}
export interface ReadinessAssessment {
  status: "blocked" | "review";
  findings: ReadinessFinding[];
  /** Purely mechanical checks do not approve text or attest truth. */
  humanEditorialReviewRequired: true;
}

const MAX_CHARACTERS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  facebook_page: 63206,
  instagram_professional: 2200,
  x: 280, // conservative basic-tier character budget; account entitlements may vary
};
const DOMAINS: Record<SocialPlatform, readonly string[]> = {
  linkedin: ["linkedin.com"],
  facebook_page: ["facebook.com", "fb.com"],
  instagram_professional: ["instagram.com"],
  x: ["x.com", "twitter.com"],
};

export function assessPersonalBrandDraft(draft: PersonalBrandDraft): ReadinessAssessment {
  const findings: ReadinessFinding[] = [];
  const add = (code: string, severity: ReadinessFinding["severity"], message: string) =>
    findings.push({ code, severity, message });
  if (!draft.id?.trim() || !Number.isSafeInteger(draft.revision) || draft.revision < 1)
    add("identity_invalid", "blocking", "Draft ID and positive revision are required.");
  if (!draft.body.trim()) add("body_missing", "blocking", "The post has no content.");
  if (!draft.objective) add("objective_missing", "blocking", "Choose a professional objective.");
  if (!draft.audiences.some((audience) => audience.trim()))
    add("audience_missing", "warning", "Name the people this message should reach.");
  if (!draft.destination) add("destination_missing", "blocking", "Choose a publication destination.");
  else if (draft.body.length > MAX_CHARACTERS[draft.destination])
    add("character_limit", "blocking", "This post exceeds the conservative destination character limit.");
  if (!draft.hookArchetype)
    add("hook_missing", "warning", "Record the kind of opening to compare outcomes later.");
  if (!draft.hypothesis.trim())
    add("hypothesis_missing", "warning", "Describe what you want this publication to test.");
  if (/^(in my (last|previous) post|as (i|we) (mentioned|said) (last time|earlier))/i.test(draft.body.trim()))
    add("dependent_opening", "warning", "Opening assumes readers saw previous posts.");
  if (draft.mediaCount < 0 || !Number.isSafeInteger(draft.mediaCount))
    add("media_invalid", "blocking", "Media count is invalid.");
  if ((draft.format === "image" || draft.format === "video" || draft.format === "document") && draft.mediaCount === 0)
    add("media_missing", "blocking", "The selected format requires an attached media asset.");
  if (draft.mediaCount > 0 && !draft.mediaAccessibilityReviewed)
    add("media_accessibility", "warning", "Review alternative text/captions and media disclosure.");
  for (let i = 0; i < draft.claimChecks.length; i++) {
    const claim = draft.claimChecks[i];
    if (!claim.claim.trim() || !claim.verified || !claim.evidenceIds.some((id) => id.trim()))
      add(`claim_${i}_unsupported`, "blocking", "A declared factual claim lacks confirmed linked evidence.");
    if (!claim.privacyCleared)
      add(`claim_${i}_privacy`, "blocking", "A declared claim has not passed its privacy review.");
  }
  if (!draft.claimChecks.length)
    add("claims_unreviewed", "warning", "No claims have been explicitly linked to evidence. Text is not automatically fact-checked.");
  add("editorial_review", "info", "A human must review originality, emotional resonance, factual completeness and final wording.");
  return {
    status: findings.some((finding) => finding.severity === "blocking") ? "blocked" : "review",
    findings,
    humanEditorialReviewRequired: true,
  };
}

export async function fingerprintExactPost(body: string): Promise<string> {
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface ManualPostPackage {
  draftId: string;
  approvedRevision: number;
  destination: SocialPlatform;
  body: string;
  sha256: string;
  humanReviewConfirmed: true;
  /** Preparation is not publication. */
  status: "prepared_for_manual_copy";
}
export async function prepareManualPost(
  draft: PersonalBrandDraft, humanReviewConfirmed: boolean,
): Promise<ManualPostPackage> {
  const assessment = assessPersonalBrandDraft(draft);
  if (assessment.status === "blocked" || !draft.destination)
    throw new Error("Draft cannot be prepared while blocking readiness findings remain.");
  if (!humanReviewConfirmed) throw new Error("Explicit human editorial review is required.");
  return {
    draftId: draft.id,
    approvedRevision: draft.revision,
    destination: draft.destination,
    body: draft.body, // preserve byte-for-byte copy text; do not rewrite
    sha256: await fingerprintExactPost(draft.body),
    humanReviewConfirmed: true,
    status: "prepared_for_manual_copy",
  };
}

export interface ManualPublicationReceipt {
  postId: string;
  draftId: string;
  approvedRevision: number;
  destination: SocialPlatform;
  publishedUrl: string;
  publishedAt: string;
  confirmedAt: string;
  contentSha256: string;
  source: "user_confirmed";
}
function validInstant(value: string): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}
export async function confirmManualPublication(input: {
  package: ManualPostPackage;
  publishedUrl: string;
  publishedAt: string;
  confirmedAt: string;
  userConfirmed: boolean;
  existing: readonly ManualPublicationReceipt[];
}): Promise<ManualPublicationReceipt> {
  const pkg = input.package;
  if (!input.userConfirmed) throw new Error("Publication must be explicitly confirmed by the user.");
  if (pkg.status !== "prepared_for_manual_copy" || !pkg.humanReviewConfirmed ||
      pkg.sha256 !== await fingerprintExactPost(pkg.body))
    throw new Error("The approved post content no longer matches its exact fingerprint.");
  if (!validInstant(input.publishedAt) || !validInstant(input.confirmedAt) ||
      Date.parse(input.confirmedAt) < Date.parse(input.publishedAt))
    throw new Error("Publication and confirmation require valid offset-aware times in chronological order.");
  let url: URL;
  try { url = new URL(input.publishedUrl); } catch { throw new Error("A valid provider permalink is required."); }
  if (url.protocol !== "https:" || url.username || url.password ||
      !DOMAINS[pkg.destination].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))
    throw new Error("The publication permalink must belong to the selected platform.");
  url.hash = "";
  const publishedUrl = url.toString();
  if (input.existing.some((receipt) => receipt.publishedUrl === publishedUrl ||
      (receipt.draftId === pkg.draftId && receipt.approvedRevision === pkg.approvedRevision)))
    throw new Error("This publication or approved revision has already been recorded.");
  return {
    postId: `${pkg.draftId}:r${pkg.approvedRevision}`,
    draftId: pkg.draftId,
    approvedRevision: pkg.approvedRevision,
    destination: pkg.destination,
    publishedUrl,
    publishedAt: input.publishedAt,
    confirmedAt: input.confirmedAt,
    contentSha256: pkg.sha256,
    source: "user_confirmed",
  };
}

export type MetricName =
  | "impressions" | "reached" | "reactions" | "comments" | "reposts"
  | "saves" | "sends" | "link_clicks" | "profile_views" | "followers_gained"
  | "video_views" | "watch_seconds";
export type ObservationState = "manual" | "provider_observed" | "estimated" | "unavailable" | "unknown";
export interface MetricObservation {
  name: MetricName;
  value?: number;
  state: ObservationState;
  providerMetric?: string;
  limitation?: string;
}
export interface AnalyticsSnapshot {
  id: string;
  postId: string;
  capturedAt: string;
  windowStart: string;
  windowEnd: string;
  sourceLabel: string;
  observations: MetricObservation[];
}
export function appendAnalyticsSnapshot(
  receipt: ManualPublicationReceipt,
  previous: readonly AnalyticsSnapshot[],
  snapshot: AnalyticsSnapshot,
): AnalyticsSnapshot[] {
  if (!snapshot.id.trim() || snapshot.postId !== receipt.postId)
    throw new Error("Analytics snapshot must reference the exact published post.");
  if (!snapshot.sourceLabel.trim()) throw new Error("Analytics provenance is required.");
  if (![snapshot.capturedAt, snapshot.windowStart, snapshot.windowEnd].every(validInstant) ||
      Date.parse(snapshot.windowStart) > Date.parse(snapshot.windowEnd) ||
      Date.parse(snapshot.windowEnd) > Date.parse(snapshot.capturedAt))
    throw new Error("Analytics windows must be chronological and timezone-aware.");
  if (Date.parse(snapshot.capturedAt) < Date.parse(receipt.publishedAt))
    throw new Error("Cannot observe analytics before a post was published.");
  if (previous.some((row) => row.id === snapshot.id))
    throw new Error("Duplicate analytics snapshot ID.");
  const found = new Set<MetricName>();
  for (const metric of snapshot.observations) {
    if (found.has(metric.name)) throw new Error("Duplicate metric within the snapshot.");
    found.add(metric.name);
    if (metric.state === "unavailable" || metric.state === "unknown") {
      if (metric.value !== undefined) throw new Error("Unavailable metrics must not be recorded as zero.");
    } else if (metric.value === undefined || !Number.isFinite(metric.value) ||
               metric.value < 0 || (metric.name !== "watch_seconds" && !Number.isSafeInteger(metric.value)))
      throw new Error("Observed metric values must be finite nonnegative measurements.");
  }
  return [...previous, { ...snapshot, observations: snapshot.observations.map((m) => ({ ...m })) }];
}
export function metricValue(snapshot: AnalyticsSnapshot, name: MetricName): number | null {
  const metric = snapshot.observations.find((observation) => observation.name === name);
  return metric?.value !== undefined && metric.state !== "unknown" && metric.state !== "unavailable"
    ? metric.value : null;
}
function safeRate(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}
export function derivedPostMetrics(snapshot: AnalyticsSnapshot) {
  const reached = metricValue(snapshot, "reached");
  const impressions = metricValue(snapshot, "impressions");
  const profileViews = metricValue(snapshot, "profile_views");
  const followers = metricValue(snapshot, "followers_gained");
  const responseNames: MetricName[] = ["reactions", "comments", "reposts", "saves", "sends"];
  const observations = responseNames.map((name) => metricValue(snapshot, name));
  const engagementCount = observations.every((value) => value !== null)
    ? observations.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  return {
    impressions,
    reached,
    engagementCount,
    engagementsPerReached: safeRate(engagementCount, reached),
    profileViewsPerReached: safeRate(profileViews, reached),
    followersPerReached: safeRate(followers, reached),
    caveat: "Associations only. Provider metric definitions and publication ages must be comparable.",
  };
}
export function compareSnapshotsAtSameAge(
  a: { receipt: ManualPublicationReceipt; snapshot: AnalyticsSnapshot },
  b: { receipt: ManualPublicationReceipt; snapshot: AnalyticsSnapshot },
  toleranceHours = 2,
) {
  const age = (s: typeof a) => (Date.parse(s.snapshot.capturedAt) - Date.parse(s.receipt.publishedAt)) / 3600000;
  const ageA = age(a);
  const ageB = age(b);
  const comparable = ageA >= 0 && ageB >= 0 && Math.abs(ageA - ageB) <= toleranceHours &&
    a.receipt.destination === b.receipt.destination;
  return {
    comparable,
    ageHours: [ageA, ageB] as const,
    reason: comparable
      ? "Same platform and comparable capture ages; conclusions remain observational."
      : "Do not compare directly: different platform or post ages exceed tolerance.",
    first: derivedPostMetrics(a.snapshot),
    second: derivedPostMetrics(b.snapshot),
  };
}
