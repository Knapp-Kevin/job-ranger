import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const benchmarkRoot = path.join(
  projectRoot,
  "tests",
  "fixtures",
  "career-evidence",
  "parser-benchmark",
);
const manifest = JSON.parse(
  await readFile(path.join(benchmarkRoot, "manifest.json"), "utf8"),
);
const packageSpec = `${manifest.parserCandidate.package}@${manifest.parserCandidate.version}`;
const npxCommand = "npx";
const npmCommand = "npm";

function run(command, args, timeout = 60_000) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout,
    shell: process.platform === "win32",
    env: {
      ...process.env,
      FIRECRAWL_API_KEY: "",
    },
  });
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonProcess(result, label) {
  if (result.status !== 0) {
    const detail =
      result.error?.message || result.stderr || result.stdout || `status ${result.status}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error}`);
  }
}

function smokeFixture(fixture) {
  const fixturePath = path.join(benchmarkRoot, fixture.file);
  const started = performance.now();
  const result = run(npxCommand, ["--yes", packageSpec, fixturePath]);
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
  const output = result.stdout ?? "";
  const haystack = normalize(output);
  const missing = (fixture.expectedPhrases ?? []).filter(
    (phrase) => !haystack.includes(normalize(phrase)),
  );
  const forbiddenDetected = (fixture.forbiddenPhrases ?? []).filter((phrase) =>
    haystack.includes(normalize(phrase)),
  );

  return {
    id: fixture.id,
    status: result.status,
    elapsedMs,
    outputBytes: Buffer.byteLength(output),
    missing,
    forbiddenDetected,
    stderr: String(result.stderr ?? "").trim().slice(0, 2000),
    pass:
      result.status === 0 &&
      missing.length === 0 &&
      forbiddenDetected.length === 0,
  };
}

const wrapperMetadata = readJsonProcess(
  run(npmCommand, [
    "view",
    packageSpec,
    "name",
    "version",
    "license",
    "engines",
    "optionalDependencies",
    "dist.unpackedSize",
    "--json",
  ]),
  "wrapper metadata lookup",
);

const optionalDependencies = wrapperMetadata.optionalDependencies ?? {};
const nativePackages = [];
for (const [name, version] of Object.entries(optionalDependencies)) {
  const metadata = readJsonProcess(
    run(npmCommand, [
      "view",
      `${name}@${version}`,
      "name",
      "version",
      "license",
      "os",
      "cpu",
      "dist.unpackedSize",
      "--json",
    ]),
    `native package metadata lookup for ${name}`,
  );
  nativePackages.push(metadata);
}

const platformNeedle =
  process.platform === "win32"
    ? `win32-${process.arch}`
    : `${process.platform}-${process.arch}`;
const selectedNativePackage = nativePackages.find((entry) =>
  String(entry.name ?? "").includes(platformNeedle),
);

const smokeIds = ["hvac-docx", "operations-pdf"];
const smoke = smokeIds.map((id) => {
  const fixture = manifest.fixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Missing smoke fixture ${id}`);
  return smokeFixture(fixture);
});

const allPackageMetadata = [wrapperMetadata, ...nativePackages];
const licenseIssues = allPackageMetadata
  .filter((entry) => String(entry.license ?? "").toUpperCase() !== "MIT")
  .map((entry) => ({ name: entry.name, license: entry.license ?? null }));
const projectedUnpackedBytes =
  Number(wrapperMetadata["dist.unpackedSize"] ?? 0) +
  Number(selectedNativePackage?.["dist.unpackedSize"] ?? 0);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  candidate: manifest.parserCandidate,
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    osRelease: os.release(),
  },
  hostedOcrEnabled: false,
  wrapperMetadata,
  nativePackages,
  selectedNativePackage: selectedNativePackage ?? null,
  projectedUnpackedBytes,
  licenseIssues,
  smoke,
  pass:
    smoke.every((entry) => entry.pass) &&
    Boolean(selectedNativePackage) &&
    licenseIssues.length === 0,
};

const outputPath = path.join(
  benchmarkRoot,
  "results",
  `anydoc-${manifest.parserCandidate.version}-${process.platform}-${process.arch}-platform.json`,
);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (!report.pass) process.exitCode = 1;
