const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { applyNamedSchemaMigration } = require('../electron-runtime/electron/src/schema-migration.cjs');
const { resolveSqliteBinary, SqliteClient } = require('../electron-runtime/electron/src/sqlite.cjs');

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'job-ranger-migration-safety-'));
  try {
    const databasePath = path.join(root, 'migration.sqlite3');
    const sqliteBinaryPath = await resolveSqliteBinary();
    const sqlite = new SqliteClient(databasePath, sqliteBinaryPath);

    const migration = {
      version: 9001,
      name: 'migration_safety_alpha',
      sql: 'CREATE TABLE migration_safety_alpha (id INTEGER PRIMARY KEY);',
    };

    assert.equal(await applyNamedSchemaMigration(sqlite, migration), true);
    assert.equal(await applyNamedSchemaMigration(sqlite, migration), false);

    const applied = await sqlite.queryOne(
      "SELECT version, name FROM schema_migrations WHERE version = 9001 LIMIT 1;",
    );
    assert.deepEqual(applied, { version: 9001, name: 'migration_safety_alpha' });

    await assert.rejects(
      applyNamedSchemaMigration(sqlite, {
        version: 9001,
        name: 'migration_safety_collision',
        sql: 'CREATE TABLE migration_safety_collision (id INTEGER PRIMARY KEY);',
      }),
      /already recorded as migration_safety_alpha; expected migration_safety_collision/i,
      'a reused migration version with a different name must fail closed',
    );

    await assert.rejects(
      applyNamedSchemaMigration(sqlite, {
        version: 9002,
        name: 'migration_safety_rollback',
        sql: `
          CREATE TABLE migration_safety_should_rollback (id INTEGER PRIMARY KEY);
          INSERT INTO migration_safety_missing_table (id) VALUES (1);
        `,
      }),
      /migration_safety_missing_table|no such table/i,
      'a failing schema script must abort the migration transaction',
    );

    const rolledBackTable = await sqlite.queryOne(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration_safety_should_rollback' LIMIT 1;",
    );
    assert.equal(rolledBackTable, null, 'failed migration schema changes must roll back');
    const rolledBackLedger = await sqlite.queryOne(
      'SELECT version FROM schema_migrations WHERE version = 9002 LIMIT 1;',
    );
    assert.equal(rolledBackLedger, null, 'failed migrations must not receive a ledger entry');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
