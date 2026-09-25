import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const manifestPath = path.join(benchmarkRoot, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageSpec = `${manifest.parserCandidate.package}@${manifest.parserCandidate.version}`;
const strict = process.argv.includes("--strict");

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseCoverage(output, phrases = []) {
  const haystack = normalize(output);
  const found = phrases.filter((phrase) => haystack.includes(normalize(phrase)));
  return {
    expected: phrases.length,
    found: found.length,
    ratio: phrases.length === 0 ? 1 : found.length / phrases.length,
    missing: phrases.filter((phrase) => !found.includes(phrase)),
  };
}

function orderCoverage(output, phrases = []) {
  const haystack = normalize(output);
  let cursor = -1;
  const missing = [];
  const outOfOrder = [];

  for (const phrase of phrases) {
    const needle = normalize(phrase);
    const index = haystack.indexOf(needle);
    if (index === -1) {
      missing.push(phrase);
      continue;
    }
    if (index < cursor) {
      outOfOrder.push(phrase);
    }
    cursor = Math.max(cursor, index);
  }

  return {
    expected: phrases.length,
    ordered: phrases.length - missing.length - outOfOrder.length,
    ratio:
      phrases.length === 0
        ? 1
        : (phrases.length - missing.length - outOfOrder.length) / phrases.length,
    missing,
    outOfOrder,
  };
}

function classifyFailure(stdout, stderr, status) {
  const combined = normalize(`${stderr}\n${stdout}`);
  if (/needs.?ocr|ocr.?required|scanned|image.?only/.test(combined)) return "ocr-required";
  if (/encrypt|password|protected/.test(combined)) return "encrypted";
  if (/malform|corrupt|invalid.+docx|invalid.+zip|zip.+invalid|broken/.test(combined)) {
    return "malformed";
  }
  if (/unsupported|unknown.+format|unrecognized.+format|cannot.+detect/.test(combined)) {
    return "unsupported";
  }
  if (/resource|limit|too large|memory/.test(combined)) return "resource-limit";
  if (status === 0) return "unexpected-success";
  return "parser-failure";
}

async function hashFile(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: options.timeout ?? 15_000,
    env: {
      ...process.env,
      FIRECRAWL_API_KEY: "",
      ...options.env,
    },
  });
}

const npmMetadataProcess = run(
  npmCommand,
  [
    "view",
    packageSpec,
    "name",
    "version",
    "license",
    "engines",
    "dependencies",
    "optionalDependencies",
    "dist.unpackedSize",
    "--json",
  ],
  { timeout: 30_000 },
);

let npmMetadata = null;
try {
  npmMetadata = JSON.parse(npmMetadataProcess.stdout || "null");
} catch {
  npmMetadata = {
    parseError: true,
    stdout: npmMetadataProcess.stdout,
    stderr: npmMetadataProcess.stderr,
  };
}

// Warm the pinned CLI so network/package acquisition is not counted as parser latency.
const warmup = run(npxCommand, ["--yes", packageSpec, "--help"], { timeout: 60_000 });
if (warmup.status !== 0) {
  throw new Error(
    `Unable to warm parser candidate ${packageSpec}: ${warmup.stderr || warmup.stdout}`,
  );
}

const results = [];
for (const fixture of manifest.fixtures) {
  const fixturePath = path.join(benchmarkRoot, fixture.file);
  const sha256 = await hashFile(fixturePath);
  let stdout = "";
  let stderr = "";
  let status = 0;
  let elapsedMs = 0;

  if (fixture.path === "native-text") {
    const started = performance.now();
    stdout = await readFile(fixturePath, "utf8");
    elapsedMs = performance.now() - started;
  } else {
    const started = performance.now();
    const processResult = run(npxCommand, ["--yes", packageSpec, fixturePath]);
    elapsedMs = performance.now() - started;
    stdout = processResult.stdout ?? "";
    stderr = processResult.stderr ?? "";
    status = processResult.status ?? 1;
  }

  const coverage = phraseCoverage(stdout, fixture.expectedPhrases);
  const order = orderCoverage(stdout, fixture.mustAppearInOrder);
  const forbiddenDetected = (fixture.forbiddenPhrases ?? []).filter((phrase) =>
    normalize(stdout).includes(normalize(phrase)),
  );
  const failureClass =
    fixture.expectedOutcome === "failure" ? classifyFailure(stdout, stderr, status) : null;

  const successPass =
    fixture.expectedOutcome === "success" &&
    status === 0 &&
    coverage.ratio >= manifest.thresholds.requiredPhraseCoverage &&
    order.ratio >= manifest.thresholds.requiredOrderCoverage &&
    forbiddenDetected.length <= manifest.thresholds.forbiddenPhraseCount;
  const failurePass =
    fixture.expectedOutcome === "failure" &&
    failureClass === fixture.expectedFailureClass;

  results.push({
    id: fixture.id,
    file: fixture.file,
    format: fixture.format,
    path: fixture.path,
    sha256,
    expectedOutcome: fixture.expectedOutcome,
    status,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    outputBytes: Buffer.byteLength(stdout),
    coverage,
    order,
    forbiddenDetected,
    expectedFailureClass: fixture.expectedFailureClass ?? null,
    failureClass,
    stderr: stderr.trim().slice(0, 4000),
    pass: successPass || failurePass,
  });
}

const parserSuccessLatencies = results
  .filter((result) => result.path === "anydoc" && result.expectedOutcome === "success")
  .map((result) => result.elapsedMs)
  .sort((a, b) => a - b);
const medianLatencyMs =
  parserSuccessLatencies.length === 0
    ? null
    : parserSuccessLatencies[Math.floor(parserSuccessLatencies.length / 2)];
const maxLatencyMs =
  parserSuccessLatencies.length === 0 ? null : Math.max(...parserSuccessLatencies);
const latencyPass =
  medianLatencyMs !== null &&
  maxLatencyMs !== null &&
  medianLatencyMs <= manifest.thresholds.medianLatencyMs &&
  maxLatencyMs <= manifest.thresholds.maxLatencyMs;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  candidate: manifest.parserCandidate,
  packageSpec,
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    osRelease: os.release(),
  },
  hostedOcrEnabled: false,
  npmMetadata,
  thresholds: manifest.thresholds,
  summary: {
    fixtures: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    medianParserLatencyMs: medianLatencyMs,
    maxParserLatencyMs: maxLatencyMs,
    latencyPass,
    candidatePass:
      results.every((result) => result.pass) && latencyPass && npmMetadataProcess.status === 0,
  },
  results,
};

const outputPath = process.env.PARSER_BENCHMARK_OUTPUT
  ? path.resolve(projectRoot, process.env.PARSER_BENCHMARK_OUTPUT)
  : path.join(
      benchmarkRoot,
      "results",
      `anydoc-${manifest.parserCandidate.version}-${process.platform}-${process.arch}.json`,
    );
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Benchmark report: ${path.relative(projectRoot, outputPath)}`);

if (strict && !report.summary.candidatePass) {
  process.exitCode = 1;
}
