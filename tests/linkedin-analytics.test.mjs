import assert from "node:assert/strict";
import { normalizeLinkedInAnalyticsExport } from "../src/shared/linkedin-analytics.ts";

const clone = x => structuredClone(x);
const rows = {
  "DISCOVERY": [
    ["Overall Performance", "10/8/2026 - 10/9/2026"],
    ["Impressions", "12"], ["Members reached", "8"],
  ],
  "ENGAGEMENT": [
    ["Date", "Impressions", "Engagements"],
    ["10/8/2026", "4", "0"], ["10/9/2026", "8", "2"],
  ],
  "TOP POSTS": [
    ["Maximum of 50 posts available to include in this list"],
    [],
    ["Post URL", "Post Publish Date", "Engagements", "481", "Post URL", "Post Publish Date", "Impressions"],
    ["https://www.linkedin.com/posts/example-test-share-100-abc", "10/9/2026", "2", "481",
      "https://www.linkedin.com/posts/example-test-share-100-abc", "10/9/2026", "10"],
    ["481", "481", "481", "481", "https://www.linkedin.com/posts/example-older-share-99-abc", "5/1/2026", "2"],
  ],
  "FOLLOWERS": [
    ["Total followers on 10/9/2026", "101"], [],
    ["Date", "New followers"], ["10/8/2026", "0"], ["10/9/2026", "1"],
  ],
  "AUDIENCE DEMOGRAPHICS": [
    ["Top Demographics", "Value", "Percentage"],
    ["Company", "A fictional organization", "< 1%"],
  ],
  "CONTENT DEMOGRAPHICS": [
    ["Top Demographics", "Value", "Percentage"], ["Location", "Exampleville", "12%"],
  ],
};
const before = JSON.stringify(rows);
const result = normalizeLinkedInAnalyticsExport(rows);
assert.equal(JSON.stringify(rows), before, "import must not mutate caller");
assert.deepEqual(result.period, { start: "2026-10-08", end: "2026-10-09" });
assert.deepEqual(result.discovery, { impressions: 12, membersReached: 8 });
assert.deepEqual(result.daily.map(x => x.newFollowers), [0, 1]);
assert.equal(result.followers.total, 101);
assert.equal(result.topPosts.length, 2);
assert.equal(result.topPosts.find(p => p.impressions === 10)?.engagements, 2);
assert.equal(result.topPosts.find(p => p.impressions === 2)?.engagements, null,
  "different top rankings must preserve unavailable vs zero");
assert.equal(result.audienceDemographics[0].reportedPercentage, "< 1%");
assert.ok(result.warnings.some(w => /outside/.test(w)));
assert.ok(result.warnings.some(w => /different coverage/.test(w)));
assert.equal(result.provenance, "manual-linkedIn-export");
const fail = (mutate, pattern) => {
  const test = clone(rows);
  mutate(test);
  assert.throws(() => normalizeLinkedInAnalyticsExport(test), pattern);
};
fail(v => { delete v.DISCOVERY; }, /missing DISCOVERY/);
fail(v => { v.ENGAGEMENT[2][0] = "10/8/2026"; }, /duplicate ENGAGEMENT/);
fail(v => { v.DISCOVERY[1][1] = "-1"; }, /Invalid overall impressions/);
fail(v => { v["TOP POSTS"][3][0] = "https://linkedin.com.evil.test/posts/example"; }, /Invalid LinkedIn post URL/);
fail(v => { v["TOP POSTS"][3][1] = "02/30/2026"; }, /Invalid LinkedIn export calendar/);
fail(v => { v["TOP POSTS"][3][2] = ""; }, /Invalid post engagements/);
fail(v => { v["TOP POSTS"][4][4] = "https://www.linkedin.com/posts/example-test-share-100-abc"; }, /Conflicting publication dates/);
fail(v => { v["CONTENT DEMOGRAPHICS"][1][2] = "110%"; }, /Invalid CONTENT DEMOGRAPHICS percentage/);
fail(v => { v.FOLLOWERS[4][1] = ""; }, /Invalid new followers/);
const stale = clone(rows);
stale.DISCOVERY[1][1] = "13";
assert.ok(normalizeLinkedInAnalyticsExport(stale).warnings.some(w => /daily impression total/i.test(w)));
console.log("LinkedIn six-sheet analytics normalizer: synthetic and adversarial cases passed");
