import assert from "node:assert/strict";
import {
  validateCareerOutcomeInput, summarizeCareerOutcomes, OUTCOME_KINDS,
} from "../src/shared/personal-brand-outcomes.ts";

const publishedAt = "2026-10-08T15:00:00.000Z";
const now = "2026-10-08T20:00:00.000Z";
const receipt = {
  postId: "post-1:r1", draftId: "post-1", approvedRevision: 1,
  destination: "linkedin", publishedUrl: "https://www.linkedin.com/feed/update/abc",
  publishedAt, confirmedAt: publishedAt, contentSha256: "hash", source: "user_confirmed",
};
const valid = {
  kind: "recruiter_outreach", occurredAt: "2026-10-08T16:00:00.000Z",
  sourceLabel: "Personal journal", note: "Recruiter referenced my project.",
  relatedPostId: receipt.postId, association: "post_mentioned", userConfirmed: true,
};
assert.deepEqual(validateCareerOutcomeInput(valid, [receipt], now), valid);
assert.equal(validateCareerOutcomeInput({
  ...valid, relatedPostId: null, association: "none",
}, [], now).relatedPostId, null);
assert.throws(() => validateCareerOutcomeInput({ ...valid, userConfirmed: false }, [receipt], now), /explicitly confirm/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, relatedPostId: "invented" }, [receipt], now), /does not exist/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, relatedPostId: null }, [receipt], now), /Unlinked/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, association: "none" }, [receipt], now), /Unlinked/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, association: "caused_hiring" }, [receipt], now), /association/);
assert.throws(() => validateCareerOutcomeInput({
  ...valid, occurredAt: "2026-10-08T14:59:00.000Z",
}, [receipt], now), /published later/);
assert.throws(() => validateCareerOutcomeInput({
  ...valid, occurredAt: "2026-10-09T00:00:00.000Z",
}, [receipt], now), /future/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, occurredAt: "2026-10-08" }, [receipt], now), /timezone-aware/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, occurredAt: "nonsense" }, [receipt], now), /timezone-aware/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, note: "x".repeat(501) }, [receipt], now), /500/);
assert.throws(() => validateCareerOutcomeInput({ ...valid, sourceLabel: " " }, [receipt], now), /source/);
assert.throws(() => validateCareerOutcomeInput(null, [receipt], now), /structured record/);
for (const kind of OUTCOME_KINDS) {
  assert.equal(validateCareerOutcomeInput({ ...valid, kind }, [receipt], now).kind, kind);
}

const event = {
  ...valid, id: "career-outcome-1", source: "user_attested",
  recordedAt: now,
};
const independent = {
  ...event, id: "career-outcome-2", relatedPostId: null,
  association: "none", kind: "interview_invitation",
};
const summary = summarizeCareerOutcomes([event, independent]);
assert.equal(summary.count, 2);
assert.equal(summary.postAssociatedCount, 1);
assert.equal(summary.unlinkedCount, 1);
assert.equal(summary.byKind.recruiter_outreach, 1);
assert.equal(summary.byKind.interview_invitation, 1);
assert.equal(summary.byKind.offer, 0);
assert.match(summary.message, /not conversions attributable/);
assert.equal(summarizeCareerOutcomes([{
  ...event, id: "spoof", userConfirmed: false,
}]).count, 0);
console.log("Personal Brand career-outcome validation and attribution-boundary tests passed");
