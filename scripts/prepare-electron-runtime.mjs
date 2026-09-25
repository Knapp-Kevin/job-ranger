import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const runtimeDirectory = path.join(projectRoot, "electron-runtime");
const electronDirectory = path.join(projectRoot, "electron");

const legacyGeneratedFiles = [
  "backend.cjs",
  "browser-loader.cjs",
  "career-backend.cjs",
  "career-contracts.cjs",
  "career-repository.cjs",
  "career-validators.cjs",
  "contracts.cjs",
  "extractors.cjs",
  "main.cjs",
  "migrations.cjs",
  "platform-selectors.cjs",
  "preload.cjs",
  "repository.cjs",
  "salary-parser.cjs",
  "scrape-guard.cjs",
  "scrapers.cjs",
  "source-profiles.cjs",
  "sqlite.cjs",
  "tray-notifications.cjs",
  "validators.cjs",
];

await rm(runtimeDirectory, { recursive: true, force: true });
await mkdir(runtimeDirectory, { recursive: true });
await writeFile(
  path.join(runtimeDirectory, "package.json"),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
  "utf8",
);

await Promise.all([
  rm(path.join(electronDirectory, "adapters"), { recursive: true, force: true }),
  rm(path.join(electronDirectory, "shared"), { recursive: true, force: true }),
  ...legacyGeneratedFiles.map((fileName) =>
    rm(path.join(electronDirectory, fileName), { force: true }),
  ),
]);

const shims = {
  "main.cjs": "../electron-runtime/electron/src/main.cjs",
  "backend.cjs": "../electron-runtime/electron/src/backend.cjs",
  "career-backend.cjs": "../electron-runtime/electron/src/career-backend.cjs",
  "sqlite.cjs": "../electron-runtime/electron/src/sqlite.cjs",
  "salary-parser.cjs": "../electron-runtime/electron/src/salary-parser.cjs",
  "scrape-guard.cjs": "../electron-runtime/electron/src/scrape-guard.cjs",
  "career-contracts.cjs": "../electron-runtime/src/shared/career-contracts.js",
};

await Promise.all(
  Object.entries(shims).map(([fileName, target]) =>
    writeFile(
      path.join(electronDirectory, fileName),
      `"use strict";\nmodule.exports = require(${JSON.stringify(target)});\n`,
      "utf8",
    ),
  ),
);
