// sqlite3 CLI output as lines. Windows sqlite3.exe ends lines with CRLF; a bare
// "\n" split leaves "\r" on every value (e.g. table names in the fingerprint).
function outputLines(text) {
  return text.split(/\r?\n/).filter(Boolean);
}

module.exports = { outputLines };
