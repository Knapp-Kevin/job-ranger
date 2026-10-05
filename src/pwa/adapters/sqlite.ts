/**
 * Web runtime adapter replacing electron/src/sqlite.cts: the shared core's
 * `SqliteClient` becomes the SQLite WASM client persisted to OPFS.
 */
import { requireActiveWasmSqliteEngine, WasmSqliteClient } from "../runtime/wasm-sqlite-engine";

export { sql, toSqlLiteral } from "../../../electron/src/sql-literal.cjs";
export type { SqliteEngineClient } from "../../../electron/src/sql-literal.cjs";

export const SqliteClient = WasmSqliteClient;
export type SqliteClient = WasmSqliteClient;

export async function resolveSqliteBinary(): Promise<string> {
  return `SQLite WASM ${requireActiveWasmSqliteEngine().version} (origin-private file system)`;
}
