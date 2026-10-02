const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { JobScoutBackend } = require("../electron-runtime/electron/src/backend.cjs");
const { CareerBackend } = require("../electron-runtime/electron/src/career-backend.cjs");
const { SqliteClient } = require("../electron-runtime/electron/src/sqlite.cjs");

async function createCareer(jobBackend, dataDirectory) {
  const status = await jobBackend.getSystemStatus(process.platform);
  const career = new CareerBackend({
    dataDirectory,
    databasePath: status.databasePath,
    sqliteBinaryPath: status.sqliteBinaryPath,
  });
  await career.initialize();
  return { career, status };
}

async function readLegacyTrack(sqlite) {
  return sqlite.queryOne(
    "SELECT * FROM career_target_tracks WHERE id = 'legacy-default' LIMIT 1;",
  );
}

async function run() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-ranger-target-tracks-"));

  try {
    const backend = new JobScoutBackend({
      dataDirectory: tempDir,
      schedulerEnabled: false,
      fetchImpl: async () => {
        throw new Error("target-track smoke test must not use the network");
      },
    });
    await backend.initialize();
    const { career, status } = await createCareer(backend, tempDir);
    const sqlite = new SqliteClient(status.databasePath, status.sqliteBinaryPath);

    const migrationRows = await sqlite.queryAll(
      "SELECT version, name FROM schema_migrations ORDER BY version ASC;",
    );
    assert.equal(
      new Map(migrationRows.map((row) => [row.version, row.name])).get(6),
      "career_target_tracks",
      "target-track migration must be applied",
    );

    const first = await career.saveProfile({
      version: 2,
      fullName: "Taylor Example",
      homeLocation: "Annapolis, MD",
      radiusMiles: 30,
      minimumPay: 42,
      payBasis: "hourly",
      targetTitles: ["Operations Coordinator", "Project Coordinator"],
      skills: ["Scheduling"],
      certifications: [],
      sectors: ["Operations"],
      onCallPreference: "no",
      fullTimeOnly: true,
      updatedAt: null,
    });
    assert.ok(first.updatedAt);

    let row = await readLegacyTrack(sqlite);
    assert.ok(row, "saving a legacy Career Profile must create its bridge target track");
    assert.equal(row.origin, "legacy-profile");
    assert.equal(row.relation, "target");
    assert.deepEqual(JSON.parse(row.role_titles_json), [
      "Operations Coordinator",
      "Project Coordinator",
    ]);

    const constraints = JSON.parse(row.constraints_json);
    assert.deepEqual(constraints.geography, {
      locations: ["Annapolis, MD"],
      radiusMiles: 30,
      strength: "unspecified",
    });
    assert.deepEqual(constraints.compensation, {
      floor: 42,
      target: null,
      basis: "hourly",
      floorStrength: "unspecified",
    });
    assert.deepEqual(constraints.employmentArrangements, {
      values: ["full-time"],
      strength: "unspecified",
    });
    assert.equal(
      constraints.onCall.strength,
      "unspecified",
      "migration must not invent required/preferred semantics",
    );

    await career.saveProfile({
      ...first,
      homeLocation: "Baltimore, MD",
      targetTitles: ["Program Coordinator"],
      minimumPay: 90000,
      payBasis: "annual",
    });

    row = await readLegacyTrack(sqlite);
    assert.deepEqual(JSON.parse(row.role_titles_json), ["Program Coordinator"]);
    const updatedConstraints = JSON.parse(row.constraints_json);
    assert.deepEqual(updatedConstraints.geography.locations, ["Baltimore, MD"]);
    assert.equal(updatedConstraints.compensation.floor, 90000);
    assert.equal(updatedConstraints.compensation.basis, "annual");

    await backend.dispose();

    const reloadedBackend = new JobScoutBackend({
      dataDirectory: tempDir,
      schedulerEnabled: false,
      fetchImpl: async () => {
        throw new Error("target-track smoke test must not use the network");
      },
    });
    await reloadedBackend.initialize();
    const reloadedStatus = await reloadedBackend.getSystemStatus(process.platform);
    const reloadedSqlite = new SqliteClient(
      reloadedStatus.databasePath,
      reloadedStatus.sqliteBinaryPath,
    );
    const persisted = await readLegacyTrack(reloadedSqlite);
    assert.ok(persisted, "bridge target track must survive restart");
    assert.deepEqual(JSON.parse(persisted.role_titles_json), ["Program Coordinator"]);
    assert.equal(JSON.parse(persisted.constraints_json).compensation.floor, 90000);

    await reloadedBackend.dispose();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
