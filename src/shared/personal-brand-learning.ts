/**
 * Comparable-age, provider-neutral Personal Brand learning.
 *
 * Read-only, deterministic and observational. Never extrapolate, predict reach,
 * infer causality or treat a missing metric as zero. Canonical records remain in
 * the existing Personal Brand SQLite backend; this is a pure projection.
 */
import type {
  AnalyticsSnapshot, HookArchetype, ManualPublicationReceipt, MetricName,
  PersonalBrandDraft, PostFormat, PresenceObjective, SocialPlatform,
} from "./personal-brand.js";

export type LearningMetric =
  | "impressions" | "reached" | "engagements_per_reached"
  | "profile_views_per_reached" | "followers_per_reached";
export type LearningWindowHours = 24 | 48 | 168;
export interface PostLearningEvidence {
  receipt: ManualPublicationReceipt;
  snapshots: readonly AnalyticsSnapshot[];
  /** Only the CURRENT persisted draft is available. Never invent historical metadata. */
  draft?: PersonalBrandDraft;
}
export type LearningRowStatus = "included" | "missing-window" | "missing-metric" | "unverified-metric";
export interface LearningRow {
  postId: string;
  publishedUrl: string;
  publishedAt: string;
  platform: SocialPlatform;
  status: LearningRowStatus;
  reason: string;
  value: number | null;
  observedAgeHours: number | null;
  snapshotId: string | null;
  sourceLabel: string | null;
  states: string[];
  objective: PresenceObjective | null;
  hook: HookArchetype | null;
  format: PostFormat | null;
  /** False means the draft has advanced beyond the actual published revision. */
  metadataCurrent: boolean;
}
export interface LearningReport {
  targetAgeHours: LearningWindowHours;
  metric: LearningMetric;
  label: string;
  units: "count" | "rate";
  toleranceHours: number;
  rows: LearningRow[];
  eligibleCount: number;
  comparisonPossible: boolean;
  /** Recommendations never claim a content format or hook caused an outcome. */
  recommendation: string;
  caveats: string[];
}

const WINDOWS: Record<LearningWindowHours, number> = { 24: 3, 48: 6, 168: 12 };
const METRICS: Record<LearningMetric, { label: string; units: "count" | "rate"; inputs: readonly MetricName[] }> = {
  impressions: { label: "Impressions", units: "count", inputs: ["impressions"] },
  reached: { label: "Unique members reached", units: "count", inputs: ["reached"] },
  engagements_per_reached: {
    label: "Engagements per member reached", units: "rate",
    inputs: ["reactions", "comments", "reposts", "saves", "sends", "reached"],
  },
  profile_views_per_reached: {
    label: "Attributed profile views per member reached", units: "rate",
    inputs: ["profile_views", "reached"],
  },
  followers_per_reached: {
    label: "Attributed followers per member reached", units: "rate",
    inputs: ["followers_gained", "reached"],
  },
};
const TRUSTED_STATES = new Set(["manual", "provider_observed"]);
function preciseAge(end: string, published: string): number {
  return (Date.parse(end) - Date.parse(published)) / 3_600_000;
}
function measuredMetric(snapshot: AnalyticsSnapshot, metric: LearningMetric): {
  value: number | null; status: "ok" | "missing" | "unverified"; states: string[];
} {
  const observations = METRICS[metric].inputs.map((name) =>
    snapshot.observations.find((observation) => observation.name === name));
  if (observations.some((obs) => !obs || obs.value === undefined ||
    obs.state === "unknown" || obs.state === "unavailable"))
    return { value: null, status: "missing", states: [] };
  const complete = observations as Array<NonNullable<typeof observations[number]>>;
  if (complete.some((obs) => !TRUSTED_STATES.has(obs.state) ||
    !Number.isFinite(obs.value) || (obs.value ?? -1) < 0))
    return { value: null, status: "unverified", states: complete.map((obs) => obs.state) };
  const values = complete.map((obs) => obs.value as number);
  if (METRICS[metric].units === "count")
    return { value: values[0], status: "ok", states: complete.map((obs) => obs.state) };
  const denominator = values.at(-1) as number;
  if (denominator === 0) return { value: null, status: "missing", states: complete.map((obs) => obs.state) };
  const numerator = values.slice(0, -1).reduce((sum, value) => sum + value, 0);
  return { value: numerator / denominator, status: "ok", states: complete.map((obs) => obs.state) };
}

/**
 * An age cohort uses the snapshot's observation WINDOW END, never the moment
 * someone later entered those numbers. Reject non-cumulative/custom windows:
 * their rates cannot be compared with a since-publication snapshot.
 */
export function buildPersonalBrandLearningReport(
  posts: readonly PostLearningEvidence[],
  targetAgeHours: LearningWindowHours,
  metric: LearningMetric,
  destination: SocialPlatform = "linkedin",
): LearningReport {
  if (!(targetAgeHours in WINDOWS) || !(metric in METRICS))
    throw new Error("Unsupported comparison window or metric.");
  const tolerance = WINDOWS[targetAgeHours];
  const rows: LearningRow[] = posts.filter((post) => post.receipt.destination === destination)
    .map(({ receipt, snapshots, draft }) => {
      const metadataCurrent = Boolean(draft && draft.id === receipt.draftId &&
        draft.revision === receipt.approvedRevision);
      const base: LearningRow = {
        postId: receipt.postId, publishedUrl: receipt.publishedUrl,
        publishedAt: receipt.publishedAt, platform: receipt.destination,
        status: "missing-window", reason: "No same-age cumulative snapshot is available.",
        value: null, observedAgeHours: null, snapshotId: null, sourceLabel: null,
        states: [], objective: metadataCurrent ? draft?.objective ?? null : null,
        hook: metadataCurrent ? draft?.hookArchetype ?? null : null,
        format: metadataCurrent ? draft?.format ?? null : null, metadataCurrent,
      };
      const candidates = snapshots.filter((s) => {
        const age = preciseAge(s.windowEnd, receipt.publishedAt);
        const startOffset = preciseAge(s.windowStart, receipt.publishedAt);
        return s.postId === receipt.postId && Number.isFinite(age) &&
          age >= 0 && Math.abs(age - targetAgeHours) <= tolerance &&
          Number.isFinite(startOffset) && Math.abs(startOffset) <= 0.25 &&
          Number.isFinite(Date.parse(s.capturedAt)) &&
          Date.parse(s.capturedAt) >= Date.parse(s.windowEnd) &&
          Boolean(s.sourceLabel.trim());
      }).sort((a, b) => {
        const difference = Math.abs(preciseAge(a.windowEnd, receipt.publishedAt) - targetAgeHours) -
          Math.abs(preciseAge(b.windowEnd, receipt.publishedAt) - targetAgeHours);
        return difference || a.windowEnd.localeCompare(b.windowEnd) || a.id.localeCompare(b.id);
      });
      const chosen = candidates[0];
      if (!chosen) return base;
      const measured = measuredMetric(chosen, metric);
      return {
        ...base, observedAgeHours: preciseAge(chosen.windowEnd, receipt.publishedAt),
        snapshotId: chosen.id, sourceLabel: chosen.sourceLabel, states: measured.states,
        status: measured.status === "ok" ? "included" :
          measured.status === "missing" ? "missing-metric" : "unverified-metric",
        reason: measured.status === "ok" ? "Comparable cumulative observation." :
          measured.status === "missing"
            ? "At least one required metric is unavailable or its denominator is zero."
            : "Estimated or untrusted measurements are excluded from rankings.",
        value: measured.value,
      };
    }).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.postId.localeCompare(b.postId));
  const eligible = rows.filter((row) => row.status === "included" && row.value !== null)
    .sort((a, b) => (b.value as number) - (a.value as number) || a.postId.localeCompare(b.postId));
  const comparisonPossible = eligible.length >= 2;
  const caveats = [
    "Observational association only. Differences do not show what caused distribution or career outcomes.",
    "Only the nearest since-publication snapshot within the selected age tolerance is used per post.",
    "Missing, estimated, and zero-denominator values cannot be ranked; omitted counts are never zero.",
    "Provider metric definitions, audience, topics, publication timing, and platform ranking may differ.",
  ];
  if (eligible.some((row) => row.states.includes("manual")))
    caveats.push("At least one value is manually entered, not independently confirmed by the platform.");
  if (rows.some((row) => !row.metadataCurrent))
    caveats.push("At least one published draft has been revised or cannot be found. Historic hook/objective metadata is unknown.");
  const sources = new Set(eligible.map((row) => row.sourceLabel));
  if (sources.size > 1)
    caveats.push("Snapshots have different source labels. Confirm their definitions before interpreting differences.");
  let recommendation = "";
  if (!comparisonPossible) {
    recommendation = `Collect at least two ${destination} posts with ${targetAgeHours}-hour cumulative observations and the selected metric. Record all required values rather than treating blanks as zero.`;
  } else {
    const [leading, trailing] = [eligible[0], eligible[eligible.length - 1]];
    const hookVariable = leading.metadataCurrent && trailing.metadataCurrent &&
      leading.objective && leading.objective === trailing.objective &&
      leading.format && leading.format === trailing.format &&
      leading.hook && trailing.hook && leading.hook !== trailing.hook;
    recommendation = hookVariable
      ? `The observed ${METRICS[metric].label.toLowerCase()} differs between posts tagged "${leading.hook}" and "${trailing.hook}". For the next experiment, test one hook variation while holding topic, audience, format and observation window as consistent as practical. This is a hypothesis, not proof of a winning hook.`
      : `There are ${eligible.length} comparable observations. For the next experiment, choose one variable (such as hook or format) to change, record the objective before publishing, and capture the same ${targetAgeHours}-hour metrics. Do not attribute differences to one factor without further controlled repeats.`;
  }
  return {
    targetAgeHours, metric, label: METRICS[metric].label, units: METRICS[metric].units,
    toleranceHours: tolerance, rows, eligibleCount: eligible.length,
    comparisonPossible, recommendation, caveats,
  };
}
