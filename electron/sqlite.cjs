"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteClient = void 0;
exports.toSqlLiteral = toSqlLiteral;
exports.sql = sql;
exports.resolveSqliteBinary = resolveSqliteBinary;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const SQLITE_BUSY_TIMEOUT_MS = 5000;
function escapeSqlString(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
function toSqlLiteral(value) {
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
function sql(queryParts, ...values) {
    return queryParts.reduce((output, part, index) => {
        if (index === values.length) {
            return output + part;
        }
        return output + part + toSqlLiteral(values[index]);
    }, "");
}
async function findExecutable(candidates) {
    for (const candidatePath of candidates) {
        if (!candidatePath) {
            continue;
        }
        try {
            await node_fs_1.promises.access(candidatePath, node_fs_1.constants.X_OK);
            return candidatePath;
        }
        catch {
        }
    }
    return null;
}
async function resolveSqliteBinary() {
    if (process.env.SQLITE3_PATH) {
        return process.env.SQLITE3_PATH;
    }
    if (process.platform === "win32") {
        const resourcesPath = process.resourcesPath;
        const bundledSqlite = resourcesPath
            ? await findExecutable([node_path_1.default.join(resourcesPath, "sqlite3.exe")])
            : null;
        if (bundledSqlite) {
            return bundledSqlite;
        }
    }
    const command = process.platform === "win32" ? "where.exe" : "which";
    const lookupTarget = "sqlite3";
    try {
        const { stdout } = await execFileAsync(command, [lookupTarget]);
        const [firstMatch] = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        if (firstMatch) {
            return firstMatch;
        }
    }
    catch {
    }
    const fallbackCandidates = process.platform === "darwin"
        ? [
            "/usr/bin/sqlite3",
            "/opt/homebrew/bin/sqlite3",
            "/usr/local/bin/sqlite3",
            "/opt/local/bin/sqlite3",
        ]
        : process.platform === "linux"
            ? ["/usr/bin/sqlite3", "/usr/local/bin/sqlite3", "/bin/sqlite3"]
            : [];
    const fallback = await findExecutable(fallbackCandidates);
    if (fallback) {
        return fallback;
    }
    const expectedBinary = process.platform === "win32" ? "sqlite3.exe" : "sqlite3";
    const platformHint = process.platform === "darwin"
        ? " On macOS, Finder-launched apps may not inherit Homebrew paths, so set SQLITE3_PATH or install sqlite3 in a standard location such as /usr/bin, /opt/homebrew/bin, or /usr/local/bin."
        : process.platform === "win32"
            ? " Packaged Windows builds include sqlite3.exe. Source/development runs can set SQLITE3_PATH or install sqlite3 on PATH."
            : "";
    throw new Error(`${expectedBinary} was not found. Set SQLITE3_PATH to a valid sqlite3 binary.${platformHint}`);
}
class SqliteClient {
    databasePath;
    sqliteBinaryPath;
    constructor(databasePath, sqliteBinaryPath) {
        this.databasePath = databasePath;
        this.sqliteBinaryPath = sqliteBinaryPath;
    }
    async ensureDatabaseDirectory() {
        await node_fs_1.promises.mkdir(node_path_1.default.dirname(this.databasePath), { recursive: true });
    }
    async exec(statement) {
        await this.ensureDatabaseDirectory();
        await execFileAsync(this.sqliteBinaryPath, [
            "-cmd",
            `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`,
            this.databasePath,
            `PRAGMA foreign_keys = ON; ${statement}`,
        ]);
    }
    async queryAll(statement) {
        await this.ensureDatabaseDirectory();
        const { stdout } = await execFileAsync(this.sqliteBinaryPath, [
            "-json",
            "-cmd",
            `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`,
            this.databasePath,
            `PRAGMA foreign_keys = ON; ${statement}`,
        ]);
        const trimmed = stdout.trim();
        if (!trimmed) {
            return [];
        }
        return JSON.parse(trimmed);
    }
    async queryOne(statement) {
        const rows = await this.queryAll(statement);
        return rows[0] ?? null;
    }
}
exports.SqliteClient = SqliteClient;
