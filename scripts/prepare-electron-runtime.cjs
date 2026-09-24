const fs = require("node:fs");
const path = require("node:path");

const runtimeDirectory = path.join(__dirname, "..", "electron", "runtime");
fs.mkdirSync(runtimeDirectory, { recursive: true });
fs.writeFileSync(
  path.join(runtimeDirectory, "package.json"),
  `${JSON.stringify({ private: true, type: "commonjs" }, null, 2)}\n`,
  "utf8",
);
