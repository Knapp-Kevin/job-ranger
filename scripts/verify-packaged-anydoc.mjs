import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const [appDirectoryArg, fixtureArg] = process.argv.slice(2);
if (!appDirectoryArg || !fixtureArg) {
  throw new Error("Usage: node scripts/verify-packaged-anydoc.mjs <packaged-app-dir> <fixture-path>");
}

const appDirectory = path.resolve(appDirectoryArg);
const fixturePath = path.resolve(fixtureArg);

async function findExecutable() {
  const preferred = process.platform === "win32"
    ? ["Job Ranger.exe", "job-ranger.exe"]
    : ["Job Ranger", "job-ranger"];

  for (const name of preferred) {
    const candidate = path.join(appDirectory, name);
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  const entries = await readdir(appDirectory, { withFileTypes: true });
  const excluded = new Set([
    "chrome-sandbox",
    "chrome_crashpad_handler",
    "snapshot_blob.bin",
    "v8_context_snapshot.bin",
  ]);
  for (const entry of entries) {
    if (!entry.isFile() || excluded.has(entry.name) || entry.name.endsWith(".so")) continue;
    if (process.platform === "win32" && !entry.name.toLowerCase().endsWith(".exe")) continue;
    return path.join(appDirectory, entry.name);
  }

  throw new Error(`Could not find packaged Electron executable in ${appDirectory}`);
}

const executable = await findExecutable();
const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "job-ranger-anydoc-package-smoke-"));
const smokeScript = path.join(tempDirectory, "smoke.cjs");

await writeFile(
  smokeScript,
  `const path = require("node:path");\n` +
    `const appDir = process.argv[2];\n` +
    `const fixture = process.argv[3];\n` +
    `const anydoc = require(path.join(appDir, "resources", "app.asar", "node_modules", "@firecrawl", "anydoc"));\n` +
    `(async () => {\n` +
    `  const markdown = await anydoc.toMarkdown(fixture, { ocr: "reject" });\n` +
    `  if (!markdown.includes("EPA 608 Universal certification")) {\n` +
    `    throw new Error("Packaged Anydoc output did not contain expected HVAC evidence");\n` +
    `  }\n` +
    `  process.stdout.write("PACKAGED_ANYDOC_OK\\n");\n` +
    `})().catch((error) => { console.error(error); process.exitCode = 1; });\n`,
  "utf8",
);

try {
  const result = spawnSync(executable, [smokeScript, appDirectory, fixturePath], {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 5 * 1024 * 1024,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      FIRECRAWL_API_KEY: "",
    },
  });

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Packaged Anydoc smoke exited with status ${result.status}`);
  }
  if (!(result.stdout ?? "").includes("PACKAGED_ANYDOC_OK")) {
    throw new Error("Packaged Anydoc smoke did not report success");
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
