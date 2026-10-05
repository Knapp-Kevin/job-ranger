// Runtime-neutral SQL literal encoding shared by every SQLite engine adapter
// (sqlite3 CLI in Electron, SQLite WASM in the browser runtime).

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Non-finite number cannot be persisted to SQLite");
    }
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "string") {
    return escapeSqlString(value);
  }

  return escapeSqlString(JSON.stringify(value));
}

export function sql(queryParts: TemplateStringsArray, ...values: unknown[]): string {
  return queryParts.reduce((output, part, index) => {
    if (index === values.length) {
      return output + part;
    }
    return output + part + toSqlLiteral(values[index]);
  }, "");
}

/**
 * The persistence port every Job Ranger repository depends on. Electron
 * implements it with the bundled sqlite3 CLI; the browser runtime implements
 * it with SQLite WASM persisted to the origin-private file system. Both
 * engines execute the same migrations and the same repository SQL.
 */
export interface SqliteEngineClient {
  exec(statement: string): Promise<void>;
  transaction(statements: readonly string[]): Promise<void>;
  queryAll<T>(statement: string): Promise<T[]>;
  queryOne<T>(statement: string): Promise<T | null>;
}
