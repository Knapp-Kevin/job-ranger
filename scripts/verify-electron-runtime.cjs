const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const builderConfig = require(path.join(root, "electron-builder.json"));

const expectedMain = "electron/runtime/electron/src/main.cjs";
const requiredRuntimeFiles = [
  expectedMain,
  "electron/runtime/electron/src/preload.cjs",
  "electron/runtime/electron/src/backend.cjs",
  "electron/runtime/electron/src/career-backend.cjs",
  "electron/runtime/electron/src/sqlite.cjs",
  "electron/runtime/src/shared/contracts.js",
  "electron/runtime/src/shared/career-contracts.js",
];

assert.equal(
  packageJson.main,
  expectedMain,
  `package.json main must point at ${expectedMain}`,
);
assert.equal(
  builderConfig.extraMetadata?.main,
  expectedMain,
  `electron-builder extraMetadata.main must point at ${expectedMain}`,
);
assert.ok(
  builderConfig.files?.includes("electron/runtime/**/*"),
  "electron-builder must package the generated runtime",
);
assert.equal(
  builderConfig.files?.includes("electron/**/*"),
  false,
  "electron-builder must not package the entire Electron source/mirror tree",
);

for (const relativePath of requiredRuntimeFiles) {
  assert.ok(
    fs.existsSync(path.join(root, relativePath)),
    `generated runtime file is missing: ${relativePath}`,
  );
}

const trackedGeneratedRuntime = execFileSync(
  "git",
  ["ls-files", "electron/runtime"],
  { cwd: root, encoding: "utf8" },
).trim();
assert.equal(
  trackedGeneratedRuntime,
  "",
  "electron/runtime must remain generated and untracked",
);

const trackedLegacyRuntime = execFileSync(
  "git",
  [
    "ls-files",
    "electron/*.cjs",
    "electron/adapters",
    "electron/shared",
    "electron/src/shared/*.js",
  ],
  { cwd: root, encoding: "utf8" },
).trim();
assert.equal(
  trackedLegacyRuntime,
  "",
  `legacy generated Electron runtime files are still tracked:\n${trackedLegacyRuntime}`,
);

console.log("Electron runtime build contract verified.");
