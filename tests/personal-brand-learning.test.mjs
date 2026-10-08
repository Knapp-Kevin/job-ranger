import assert from "node:assert/strict";
import { buildPersonalBrandLearningReport as report } from "../src/shared/personal-brand-learning.ts";

const origin = Date.parse("2026-10-01T00:00:00Z");
const at = (hours) => new Date(origin + hours * 3_600_000).toISOString();
const receipt = (id, platform = "linkedin") => ({
  postId: id, draftId: id, approvedRevision: 1, destination: platform,
  publishedUrl: `https://www.linkedin.com/feed/update/${id}`,
  publishedAt: at(0), confirmedAt: at(1), contentSha256: "hash", source: "user_confirmed",
});
const draft = (id, hook = "concrete_experience", revision = 1, objective = "recruiter_discovery") => ({
  id, revision, body: "Example post", objective, audiences: ["recruiters"],
  destination: "linkedin", format: "text", hookArchetype: hook, hypothesis: "Test hypothesis",
  claimChecks: [], mediaCount: 0, mediaAccessibilityReviewed: true,
});
const metric = (name, value, state = "manual") => ({ name, value, state });
const snap = (id, hour, observations, overrides = {}) => ({
  id: `snapshot-${id}-${hour}`, postId: id,
  capturedAt: at(240), windowStart: at(0), windowEnd: at(hour),
  sourceLabel: "LinkedIn individual post analytics",
  observations, ...overrides,
});
const entry = (id, observations, hour = 24, hook = "concrete_experience") => ({
  receipt: receipt(id), draft: draft(id, hook),
  snapshots: [snap(id, hour, observations)],
});
const a = entry("a", [metric("profile_views", 18), metric("reached", 300)]);
const b = entry("b", [metric("profile_views", 5), metric("reached", 250)], 25, "contradiction");

const basic = report([a, b], 24, "profile_views_per_reached");
assert.equal(basic.rows.length, 2);
assert.equal(basic.eligibleCount, 2);
assert.equal(basic.comparisonPossible, true);
assert.equal(basic.rows[0].observedAgeHours, 24);
assert.equal(basic.rows[0].value, 0.06);
assert.equal(basic.rows[1].value, 0.02);
assert.match(basic.recommendation, /hook variation/);
assert.match(basic.recommendation, /not proof/i);
assert.ok(basic.caveats.some((item) => /manually entered/i.test(item)));
// Age is based on windowEnd, not capture/entry time (ten days later).
assert.equal(basic.rows[0].status, "included");

const wrongAge = report([a, b], 48, "profile_views_per_reached");
assert.equal(wrongAge.eligibleCount, 0);
assert.equal(wrongAge.rows[0].status, "missing-window");
assert.match(wrongAge.recommendation, /Collect at least two/);
const week = report([entry("week", [metric("reached", 800)], 168)], 168, "reached");
assert.equal(week.rows[0].value, 800);
assert.equal(week.toleranceHours, 12);
assert.equal(week.units, "count");
assert.equal(report([entry("edge", [metric("reached", 12)], 27)], 24, "reached").eligibleCount, 1);
assert.equal(report([entry("edge", [metric("reached", 12)], 27.1)], 24, "reached").eligibleCount, 0);

const incomplete = report([entry("missing", [metric("reached", 10)])], 24, "profile_views_per_reached");
assert.equal(incomplete.rows[0].status, "missing-metric");
assert.equal(incomplete.rows[0].value, null);
assert.equal(incomplete.comparisonPossible, false);
const absent = report([entry("blank", [
  { name: "profile_views", state: "unavailable" }, metric("reached", 10),
])], 24, "profile_views_per_reached");
assert.equal(absent.rows[0].status, "missing-metric");

const estimated = report([entry("estimated", [
  metric("profile_views", 12, "estimated"), metric("reached", 200),
])], 24, "profile_views_per_reached");
assert.equal(estimated.rows[0].status, "unverified-metric");
assert.equal(estimated.rows[0].value, null);
const zero = report([entry("zero", [metric("profile_views", 0), metric("reached", 0)])],
  24, "profile_views_per_reached");
assert.equal(zero.rows[0].status, "missing-metric");
const measuredZero = report([entry("measuredZero", [metric("profile_views", 0), metric("reached", 300)])],
  24, "profile_views_per_reached");
assert.equal(measuredZero.rows[0].status, "included");
assert.equal(measuredZero.rows[0].value, 0);

const components = ["reactions", "comments", "reposts", "saves", "sends", "reached"];
const allEngagements = entry("complete", components.map((name, i) => metric(name, i === 5 ? 100 : i + 1)));
const response = report([allEngagements], 24, "engagements_per_reached");
assert.equal(response.rows[0].value, 0.15);
assert.equal(report([entry("partial", [metric("reactions", 2), metric("reached", 100)])],
  24, "engagements_per_reached").rows[0].status, "missing-metric");

const partialWindow = entry("partialWindow", [metric("reached", 100)]);
partialWindow.snapshots[0].windowStart = at(4);
assert.equal(report([partialWindow], 24, "reached").eligibleCount, 0);
// An earlier snapshot closer to the chosen window wins deterministically,
// not whichever number makes the post look better.
const nearest = entry("nearest", [metric("reached", 300)], 25);
nearest.snapshots.unshift(snap("nearest", 24.5, [metric("reached", 75)]));
assert.equal(report([nearest], 24, "reached").rows[0].value, 75);
// Do not search for a favorable older snapshot if the closest is missing.
nearest.snapshots.unshift(snap("nearest", 24, [{ name: "reached", state: "unknown" }]));
assert.equal(report([nearest], 24, "reached").rows[0].status, "missing-metric");

const otherPlatform = { ...a, receipt: receipt("a", "x") };
assert.equal(report([a, otherPlatform], 24, "reached").rows.length, 1);
const oldVersion = { ...a, draft: draft("a", "question", 2) };
const metadata = report([oldVersion, b], 24, "profile_views_per_reached");
assert.equal(metadata.rows[0].metadataCurrent, false);
assert.equal(metadata.rows[0].hook, null);
assert.doesNotMatch(metadata.recommendation, /hook variation/);
assert.ok(metadata.caveats.some((item) => /Historic hook/i.test(item)));

const mixedSources = { ...b, snapshots: [snap("b", 25,
  [metric("profile_views", 5), metric("reached", 250)],
  { sourceLabel: "Other dashboard" })] };
assert.ok(report([a, mixedSources], 24, "profile_views_per_reached")
  .caveats.some((item) => /different source labels/i.test(item)));

assert.throws(() => report([], 25, "reached"), /Unsupported/);
assert.throws(() => report([], 24, "not_a_metric"), /Unsupported/);
console.log("Personal Brand comparable-age and observational learning regression checks passed");
