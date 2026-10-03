const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { JobScoutBackend } = require('../electron-runtime/electron/src/backend.cjs');
const { CareerBackend } = require('../electron-runtime/electron/src/career-backend.cjs');
const { BackupService, applyPendingRestore } = require('../electron-runtime/electron/src/backup-service.cjs');
const { SqliteClient, sql } = require('../electron-runtime/electron/src/sqlite.cjs');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function initializeInstallation(userDataDirectory) {
  const dataDirectory = path.join(userDataDirectory, 'data');
  const backend = new JobScoutBackend({
    dataDirectory,
    schedulerEnabled: false,
    fetchImpl: async () => { throw new Error('backup smoke test must not use the network'); },
  });
  await backend.initialize();
  const status = await backend.getSystemStatus(process.platform);
  return { backend, dataDirectory, status };
}

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'job-ranger-backup-'));
  try {
    const sourceUserData = path.join(root, 'source-user-data');
    const targetUserData = path.join(root, 'target-user-data');
    const backupParent = path.join(root, 'backups');
    await fs.mkdir(sourceUserData, { recursive: true });
    await fs.mkdir(targetUserData, { recursive: true });
    await fs.mkdir(backupParent, { recursive: true });

    const source = await initializeInstallation(sourceUserData);
    const sourceCareer = new CareerBackend({
      dataDirectory: source.dataDirectory,
      databasePath: source.status.databasePath,
      sqliteBinaryPath: source.status.sqliteBinaryPath,
    });
    await sourceCareer.initialize();
    await sourceCareer.saveProfile({
      version: 2,
      fullName: 'Portable Person',
      homeLocation: 'Annapolis, MD',
      radiusMiles: 25,
      minimumPay: 90000,
      payBasis: 'annual',
      targetTitles: ['Program Manager'],
      skills: [],
      certifications: [],
      sectors: [],
      onCallPreference: 'either',
      fullTimeOnly: true,
    });

    const sourceSqlite = new SqliteClient(source.status.databasePath, source.status.sqliteBinaryPath);
    const artifactBytes = Buffer.from('portable career source artifact\n', 'utf8');
    const sourceArtifactPath = path.join(
      source.dataDirectory,
      'artifacts',
      'sources',
      'portable-source',
      'source.txt',
    );
    await fs.mkdir(path.dirname(sourceArtifactPath), { recursive: true });
    await fs.writeFile(sourceArtifactPath, artifactBytes);
    await sourceSqlite.exec(sql`
      INSERT INTO source_artifacts (
        id, kind, original_name, media_type, detected_format, content_hash,
        managed_path, byte_size, imported_at, parser_id, parser_version,
        extraction_state, warnings_json
      ) VALUES (
        ${'portable-source'}, ${'resume'}, ${'career.txt'}, ${'text/plain'}, ${'txt'},
        ${sha256(artifactBytes)}, ${sourceArtifactPath}, ${artifactBytes.byteLength},
        ${'2026-10-03T18:00:00.000Z'}, ${null}, ${null}, ${'preserved'}, ${'[]'}
      );
    `);

    const sourceBackupService = new BackupService({
      dataDirectory: source.dataDirectory,
      userDataDirectory: sourceUserData,
      databasePath: source.status.databasePath,
      sqliteBinaryPath: source.status.sqliteBinaryPath,
      appVersion: 'test-1',
    });
    const created = await sourceBackupService.createBackup(backupParent);
    assert.equal(created.manifest.version, 1);
    assert.equal(created.summary.artifactFileCount, 1);
    assert.ok(created.manifest.managedPaths.some((item) => item.id === 'portable-source'));
    await source.backend.dispose();

    const target = await initializeInstallation(targetUserData);
    const targetCareer = new CareerBackend({
      dataDirectory: target.dataDirectory,
      databasePath: target.status.databasePath,
      sqliteBinaryPath: target.status.sqliteBinaryPath,
    });
    await targetCareer.initialize();
    await targetCareer.saveProfile({
      version: 2,
      fullName: 'Replace Me',
      homeLocation: '',
      radiusMiles: null,
      minimumPay: null,
      payBasis: 'annual',
      targetTitles: [],
      skills: [],
      certifications: [],
      sectors: [],
      onCallPreference: 'either',
      fullTimeOnly: false,
    });

    const targetBackupService = new BackupService({
      dataDirectory: target.dataDirectory,
      userDataDirectory: targetUserData,
      databasePath: target.status.databasePath,
      sqliteBinaryPath: target.status.sqliteBinaryPath,
      appVersion: 'test-1',
    });
    const validated = await targetBackupService.validateBackup(created.summary.bundlePath);
    assert.equal(validated.summary.artifactFileCount, 1);
    await targetBackupService.stageRestore(created.summary.bundlePath);
    await target.backend.dispose();

    assert.equal(
      await applyPendingRestore({
        userDataDirectory: targetUserData,
        dataDirectory: target.dataDirectory,
      }),
      true,
      'a staged restore should atomically replace the target data directory',
    );

    const restored = await initializeInstallation(targetUserData);
    const restoredSqlite = new SqliteClient(restored.status.databasePath, restored.status.sqliteBinaryPath);
    const profile = await restoredSqlite.queryOne("SELECT full_name FROM career_profile WHERE id = 1;");
    assert.equal(profile?.full_name, 'Portable Person');

    const restoredArtifact = await restoredSqlite.queryOne(
      "SELECT managed_path, content_hash FROM source_artifacts WHERE id = 'portable-source';",
    );
    assert.ok(restoredArtifact);
    const expectedRestoredPath = path.join(
      target.dataDirectory,
      'artifacts',
      'sources',
      'portable-source',
      'source.txt',
    );
    assert.equal(
      path.resolve(restoredArtifact.managed_path),
      path.resolve(expectedRestoredPath),
      'restore must rebase managed artifact paths to the new installation root',
    );
    assert.equal(
      await fs.readFile(expectedRestoredPath, 'utf8'),
      'portable career source artifact\n',
    );
    assert.equal(restoredArtifact.content_hash, sha256(artifactBytes));
    assert.equal(
      await applyPendingRestore({
        userDataDirectory: targetUserData,
        dataDirectory: target.dataDirectory,
      }),
      false,
      'restore marker must be consumed exactly once',
    );

    await restored.backend.dispose();

    const corruptBundle = path.join(root, 'corrupt-backup.jobranger-backup');
    await fs.cp(created.summary.bundlePath, corruptBundle, { recursive: true });
    const corruptArtifact = path.join(
      corruptBundle,
      'artifacts',
      'sources',
      'portable-source',
      'source.txt',
    );
    await fs.writeFile(corruptArtifact, 'tampered\n', 'utf8');

    const finalInstall = await initializeInstallation(path.join(root, 'validator-user-data'));
    const validator = new BackupService({
      dataDirectory: finalInstall.dataDirectory,
      userDataDirectory: path.join(root, 'validator-user-data'),
      databasePath: finalInstall.status.databasePath,
      sqliteBinaryPath: finalInstall.status.sqliteBinaryPath,
      appVersion: 'test-1',
    });
    await assert.rejects(
      validator.validateBackup(corruptBundle),
      /integrity verification/i,
      'tampered artifacts must be rejected before restore staging',
    );
    await finalInstall.backend.dispose();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
