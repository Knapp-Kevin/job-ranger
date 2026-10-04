import { sql, SqliteClient } from "./sqlite.cjs";

export interface NamedSchemaMigration {
  version: number;
  name: string;
  sql: string;
}

type MigrationRow = {
  version: number;
  name: string;
};

const CREATE_SCHEMA_MIGRATIONS =
  "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);";

/**
 * Apply one named migration exactly once.
 *
 * A migration version is not sufficient identity on its own. If the same
 * version is already recorded under a different name, fail closed instead of
 * silently treating an unrelated schema as present. New schema changes and
 * the ledger record are committed in one SQLite transaction so a failed
 * migration cannot leave a success-shaped partial state behind.
 */
export async function applyNamedSchemaMigration(
  sqlite: SqliteClient,
  migration: NamedSchemaMigration,
): Promise<boolean> {
  await sqlite.exec(CREATE_SCHEMA_MIGRATIONS);

  const existing = await sqlite.queryOne<MigrationRow>(sql`
    SELECT version, name
    FROM schema_migrations
    WHERE version = ${migration.version}
    LIMIT 1;
  `);

  if (existing) {
    if (existing.name !== migration.name) {
      throw new Error(
        `Database migration version ${migration.version} is already recorded as ${existing.name}; expected ${migration.name}.`,
      );
    }
    return false;
  }

  await sqlite.transaction([
    migration.sql,
    sql`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (${migration.version}, ${migration.name}, ${new Date().toISOString()});
    `,
  ]);
  return true;
}
