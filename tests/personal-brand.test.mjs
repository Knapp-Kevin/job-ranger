import assert from "node:assert/strict";
import {
  assessPersonalBrandDraft, prepareManualPost, confirmManualPublication,
  fingerprintExactPost, appendAnalyticsSnapshot, derivedPostMetrics,
  compareSnapshotsAtSameAge,
} from "../src/shared/personal-brand.ts";

const draft = {
  id: "post-7",
  revision: 2,
  body: "You think AI is coming for your job? It's coming for your whole damn company.",
  objective: "expertise_proof",
  audiences: ["hiring managers"],
  destination: "linkedin",
  format: "text",
  hookArchetype: "counterintuitive",
  hypothesis: "A concrete tension prompts relevant professional profile visits.",
  claimChecks: [{ claim: "I built a product.", evidenceIds: ["confirmed-project"], verified: true, privacyCleared: true }],
  mediaCount: 0,
  mediaAccessibilityReviewed: true,
};

const ready = assessPersonalBrandDraft(draft);
assert.equal(ready.status, "review");
assert.equal(ready.humanEditorialReviewRequired, true);
assert.equal(ready.findings.filter((x) => x.severity === "blocking").length, 0);
assert.throws(() => assessPersonalBrandDraft(null), TypeError);
assert.ok(assessPersonalBrandDraft({ ...draft, body: "", objective: null }).findings.some((x) => x.code === "body_missing"));
assert.equal(assessPersonalBrandDraft({ ...draft, claimChecks: [{ ...draft.claimChecks[0], privacyCleared: false }] }).status, "blocked");
assert.equal(assessPersonalBrandDraft({ ...draft, claimChecks: [{ ...draft.claimChecks[0], verified: false }] }).status, "blocked");
assert.ok(assessPersonalBrandDraft({ ...draft, body: "In my last post I talked about jobs." }).findings.some((x) => x.code === "dependent_opening"));
assert.equal(assessPersonalBrandDraft({ ...draft, destination: "x", body: "x".repeat(281) }).status, "blocked");
assert.ok(assessPersonalBrandDraft({ ...draft, claimChecks: [] }).findings.some((x) => x.code === "claims_unreviewed"));
assert.equal(assessPersonalBrandDraft({ ...draft, format: "image", mediaCount: 0 }).status, "blocked");

await assert.rejects(() => prepareManualPost(draft, false), /human editorial review/);
await assert.rejects(() => prepareManualPost({ ...draft, objective: null }, true), /blocking readiness/);
const pkg = await prepareManualPost(draft, true);
assert.equal(pkg.status, "prepared_for_manual_copy");
assert.equal(pkg.body, draft.body);
assert.equal(pkg.sha256, await fingerprintExactPost(draft.body));

const publishedAt = "2026-10-09T15:00:00.000Z";
const confirmedAt = "2026-10-09T15:01:00.000Z";
const receiptInput = {
  package: pkg,
  publishedUrl: "https://www.linkedin.com/feed/update/urn:li:activity:123",
  publishedAt,
  confirmedAt,
  userConfirmed: true,
  existing: [],
};
await assert.rejects(() => confirmManualPublication({ ...receiptInput, userConfirmed: false }), /explicitly confirmed/);
await assert.rejects(() => confirmManualPublication({ ...receiptInput, publishedUrl: "https://linkedin.com.evil.example/p/1" }), /selected platform/);
await assert.rejects(() => confirmManualPublication({ ...receiptInput, publishedUrl: "http://linkedin.com/feed/update/123" }), /selected platform/);
await assert.rejects(() => confirmManualPublication({ ...receiptInput, publishedAt: "2026-10-09" }), /offset-aware/);
await assert.rejects(() => confirmManualPublication({ ...receiptInput, package: { ...pkg, body: pkg.body + "!" } }), /fingerprint/);
const receipt = await confirmManualPublication(receiptInput);
assert.equal(receipt.postId, "post-7:r2");
assert.equal(receipt.source, "user_confirmed");
await assert.rejects(() => confirmManualPublication({ ...receiptInput, existing: [receipt] }), /already been recorded/);
assert.equal(receipt.publishedUrl, receiptInput.publishedUrl);

const snapshot = {
  id: "snap-1",
  postId: receipt.postId,
  capturedAt: "2026-10-10T15:00:00.000Z",
  windowStart: publishedAt,
  windowEnd: "2026-10-10T14:59:00.000Z",
  sourceLabel: "User read LinkedIn individual-post analytics",
  observations: [
    { name: "impressions", value: 1000, state: "manual" },
    { name: "reached", value: 600, state: "manual" },
    { name: "reactions", value: 12, state: "manual" },
    { name: "comments", value: 5, state: "manual" },
    { name: "reposts", value: 1, state: "manual" },
    { name: "saves", value: 2, state: "manual" },
    { name: "sends", value: 0, state: "manual" },
    { name: "profile_views", value: 7, state: "manual" },
    { name: "followers_gained", state: "unavailable" },
  ],
};
const items = appendAnalyticsSnapshot(receipt, [], snapshot);
assert.equal(items.length, 1);
assert.notEqual(items[0], snapshot);
assert.equal(derivedPostMetrics(snapshot).engagementCount, 20);
assert.equal(derivedPostMetrics(snapshot).profileViewsPerReached, 7 / 600);
assert.equal(derivedPostMetrics(snapshot).followersPerReached, null);
assert.throws(() => appendAnalyticsSnapshot(receipt, items, snapshot), /Duplicate/);
assert.throws(() => appendAnalyticsSnapshot(receipt, [], { ...snapshot, postId: "other" }), /exact published post/);
assert.throws(() => appendAnalyticsSnapshot(receipt, [], { ...snapshot, observations: [{ name: "reached", value: 0, state: "unavailable" }] }), /Unavailable/);
assert.throws(() => appendAnalyticsSnapshot(receipt, [], { ...snapshot, observations: [{ name: "reached", value: -1, state: "manual" }] }), /nonnegative/);
assert.throws(() => appendAnalyticsSnapshot(receipt, [], { ...snapshot, observations: [{ name: "reached", value: 1, state: "manual" }, { name: "reached", value: 1, state: "manual" }] }), /Duplicate metric/);
assert.throws(() => appendAnalyticsSnapshot(receipt, [], { ...snapshot, capturedAt: "2026-10-10T10:00:00.000Z" }), /chronological/);

const noReach = { ...snapshot, observations: snapshot.observations.filter((x) => x.name !== "reached") };
assert.equal(derivedPostMetrics(noReach).engagementsPerReached, null);
const differentAge = {
  receipt: { ...receipt, postId: "other", publishedAt: "2026-10-08T15:00:00.000Z" },
  snapshot: { ...snapshot, postId: "other" },
};
const first = { receipt, snapshot };
assert.equal(compareSnapshotsAtSameAge(first, first).comparable, true);
assert.equal(compareSnapshotsAtSameAge(first, differentAge).comparable, false);
assert.equal(compareSnapshotsAtSameAge(first, {
  receipt: { ...receipt, postId: "x", destination: "x" },
  snapshot: { ...snapshot, postId: "x" },
}).comparable, false);
console.log("personal-brand manual evidence core: 31+ assertions passed");
