const path = require("node:path");
const { rmSync } = require("node:fs");

const runtimeDirectory = path.join(__dirname, "..", "electron", "runtime");
rmSync(runtimeDirectory, { recursive: true, force: true });
