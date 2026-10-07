// sqlite3 CLI output must be split into lines the same way on every host:
// Windows sqlite3.exe ends lines with CRLF, which left "\r" on every table
// name in the release-upgrade fingerprint ("no such table").
const assert = require("node:assert/strict");
const { outputLines } = require("../scripts/upgrade-check/sqlite-output.cjs");

assert.deepEqual(outputLines("a\r\nb\r\n"), ["a", "b"]);
assert.deepEqual(outputLines("a\nb\n"), ["a", "b"]);
assert.deepEqual(outputLines(""), []);
assert.deepEqual(outputLines("1001\r\n1002\n").map(Number), [1001, 1002]);

console.log("upgrade-check sqlite output tests passed");
