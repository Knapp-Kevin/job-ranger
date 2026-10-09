const assert = require("node:assert/strict");
const { mkdtempSync, cpSync, rmSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { PersonalBrandBackend } = require("../electron-runtime/electron/src/personal-brand-backend.cjs");
const { SqliteClient, resolveSqliteBinary } = require("../electron-runtime/electron/src/sqlite.cjs");

const dir = mkdtempSync(path.join(os.tmpdir(), "jr-personal-brand-"));
const databasePath = path.join(dir, "career.sqlite3");
const base = {
  body: "I built a real working application. Here is what I learned.",
  objective: "expertise_proof",
  audiences: ["recruiters"],
  destination: "linkedin",
  format: "text",
  hookArchetype: "concrete_experience",
  hypothesis: "Concrete proof invites relevant connections.",
  claimChecks: [],
  mediaCount: 0,
  mediaAccessibilityReviewed: true,
};

(async () => {
  const sqliteBinaryPath = await resolveSqliteBinary();
  const db = new PersonalBrandBackend({ databasePath, sqliteBinaryPath });
  await db.initialize();
  await db.initialize();
  const draft = await db.createDraft(base);
  assert.equal(draft.revision, 1);
  assert.equal((await db.listDrafts()).length, 1);
  await assert.rejects(() => db.prepareDraft(draft.id, 1, false), /human editorial review/);
  const pkg = await db.prepareDraft(draft.id, 1, true);
  assert.equal(pkg.body, base.body);
  assert.equal(pkg.approvedRevision, 1);
  assert.equal((await db.listPrepared()).length, 1);
  const changed = await db.updateDraft(draft.id, 1, { ...base, body: base.body + "\nThe end." });
  assert.equal(changed.revision, 2);
  await assert.rejects(() => db.updateDraft(draft.id, 1, base), /Stale draft revision/);
  await assert.rejects(() => db.prepareDraft(draft.id, 1, true), /Stale draft revision/);
  await assert.rejects(() => db.prepareDraft(draft.id, 2, false), /human editorial review/);
  const v2 = await db.prepareDraft(draft.id, 2, true);
  assert.notEqual(v2.sha256, pkg.sha256);
  const publishedAt = "2026-10-08T14:00:00.000Z";
  const receipt = await db.confirmPublication({
    draftId: draft.id, revision: 2, publishedUrl: "https://www.linkedin.com/feed/update/urn:li:activity:159",
    publishedAt, userConfirmed: true,
  });
  assert.equal(receipt.contentSha256, v2.sha256);
  await assert.rejects(() => db.confirmPublication({
    draftId: draft.id, revision: 2, publishedUrl: "https://www.linkedin.com/feed/update/urn:li:activity:159",
    publishedAt, userConfirmed: true,
  }), /already been recorded/);
  assert.equal((await db.listPublications()).length, 1);
  // A snapshot has one observation instant. Two Date.now() calls can make its
  // windowEnd later than capturedAt and mask the metric-validation assertion.
  const observationInstant = "2026-10-09T14:00:00.000Z";
  const first = await db.appendSnapshot(receipt.postId, {
    capturedAt: observationInstant,
    windowStart: publishedAt,
    windowEnd: observationInstant,
    sourceLabel: "Individual post panel, manually entered",
    observations: [
      { name: "impressions", value: 100, state: "manual" },
      { name: "reached", value: 60, state: "manual" },
      { name: "followers_gained", state: "unavailable" },
    ],
  });
  assert.equal((await db.listSnapshots(receipt.postId)).length, 1);
  assert.equal(first.observations[2].value, undefined);
  // Preserve the strict chronology check while exercising metric validation
  // separately with a valid same-instant observation window.
  await assert.rejects(() => db.appendSnapshot(receipt.postId, {
    capturedAt: observationInstant,
    windowStart: publishedAt,
    windowEnd: "2026-10-10T14:00:00.000Z",
    sourceLabel: "Future observation window",
    observations: [{ name: "reached", value: 10, state: "manual" }],
  }), /chronological/);
  await assert.rejects(() => db.appendSnapshot(receipt.postId, {
    capturedAt: observationInstant, windowStart: publishedAt,
    windowEnd: observationInstant, sourceLabel: "Spoofed API",
    observations: [{ name: "reached", value: 999, state: "provider_observed" }],
  }), /Invalid analytics observation/);
  await assert.rejects(() => db.appendSnapshot(receipt.postId, {
    capturedAt: observationInstant, windowStart: publishedAt,
    windowEnd: observationInstant, sourceLabel: "Negative",
    observations: [{ name: "reached", value: -3, state: "manual" }],
  }), /nonnegative/);

  const careerEvent = await db.recordCareerOutcome({
    kind: "meaningful_conversation",
    occurredAt: "2026-10-08T15:00:00.000Z",
    sourceLabel: "Personal journal", note: "Post was mentioned explicitly.",
    relatedPostId: receipt.postId, association: "post_mentioned", userConfirmed: true,
  });
  assert.equal(careerEvent.source, "user_attested");
  assert.equal((await db.listCareerOutcomes()).length, 1);
  await assert.rejects(() => db.recordCareerOutcome({
    ...careerEvent, userConfirmed: false,
  }), /explicitly confirm/);
  await assert.rejects(() => db.recordCareerOutcome({
    ...careerEvent, relatedPostId: "invented",
  }), /does not exist/);
  await assert.rejects(() => db.recordCareerOutcome({
    ...careerEvent, occurredAt: "2026-10-08T13:00:00.000Z",
  }), /published later/);
  await assert.rejects(() => db.deleteCareerOutcome(careerEvent.id, false), /explicit user confirmation/);

  const copyPath = path.join(dir, "backup-copy.sqlite3");
  cpSync(databasePath, copyPath);
  const restored = new PersonalBrandBackend({ databasePath: copyPath, sqliteBinaryPath });
  await restored.initialize();
  assert.equal((await restored.listDrafts())[0].revision, 2);
  assert.equal((await restored.listPublications())[0].publishedUrl, receipt.publishedUrl);
  assert.equal((await restored.listSnapshots(receipt.postId))[0].id, first.id);
  assert.equal((await restored.listCareerOutcomes())[0].id, careerEvent.id);
  await db.deleteCareerOutcome(careerEvent.id, true);
  assert.equal((await db.listCareerOutcomes()).length, 0);
  assert.equal((await restored.listCareerOutcomes()).length, 1);

  const migration = await new SqliteClient(databasePath, sqliteBinaryPath).queryOne("SELECT version FROM schema_migrations WHERE version = 1005");
  assert.equal(migration.version, 1005);
  const outcomeMigration = await new SqliteClient(databasePath, sqliteBinaryPath).queryOne("SELECT version FROM schema_migrations WHERE version = 1006");
  assert.equal(outcomeMigration.version, 1006);
  console.log("Personal Brand SQLite + restart/backup persistence integration tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  rmSync(dir, { recursive: true, force: true });
});
