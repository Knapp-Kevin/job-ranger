// Deterministic baseline regression with inference absent (contract Draft
// 0.2): deterministic modules never import inference modules, and the Truth
// Gate, requirement coverage and opportunity assessment produce identical
// output whether or not the inference layer is loaded.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const NOW = "2026-01-01T00:00:00.000Z";
// Static, side-effect and dynamic imports, and require() of the directory itself.
const IMPORT_PATTERN = /(?:\bfrom\s+|\bimport\s*\(?\s*|\brequire\(\s*)["'][^"']*\binference(?:[\/"'])/;

function sourceFiles(dir, extensions) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "inference" ? [] : sourceFiles(full, extensions);
    return extensions.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

function staticBoundary() {
  const files = [
    ...sourceFiles(path.join(root, "electron", "src"), [".cts", ".ts"]),
    ...sourceFiles(path.join(root, "src"), [".ts", ".tsx"]),
  ];
  assert.ok(files.length > 50, "the scan must cover the deterministic sources");
  const offenders = files.filter((file) => IMPORT_PATTERN.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(offenders.map((file) => path.relative(root, file)), [], "deterministic code must not reference inference/");
}

function runtimeBoundary() {
  const output = execFileSync(process.execPath, [path.join(__dirname, "support", "inference-boundary-child.cjs")], { encoding: "utf8" });
  const result = JSON.parse(output);
  assert.ok(result.loaded.length > 50, `deterministic modules loaded: ${result.loaded.length}`);
  assert.deepEqual(result.failures, [], "every deterministic module in scope must load for the check to be meaningful");
  assert.deepEqual(result.inferenceLoaded, [], "loading the deterministic product must load no inference module");
  return result;
}

function goldenTruthGate() {
  const { createTruthGate, evidence } = require("./support/inference-fixtures.cjs");
  const gate = createTruthGate();
  const item = evidence("evidence-golden", { statement: "Coordinated scheduling for 12 regional field teams.", skills: ["Scheduling"] });
  const cases = [
    { id: "s-generated", text: item.statement, evidenceIds: [item.id], userEdited: false },
    { id: "s-edited-ok", text: "Scheduling for 12 regional field teams.", evidenceIds: [item.id], userEdited: true },
    { id: "s-edited-bad", text: "Coordinated scheduling for 40 regional field teams.", evidenceIds: [item.id], userEdited: true },
    { id: "s-missing", text: "No evidence.", evidenceIds: ["evidence-absent"], userEdited: true },
  ];
  return cases.map((statement) => {
    const { checkedAt, ...rest } = gate([statement], [item]);
    assert.ok(checkedAt);
    return rest;
  });
}

function coverageAndAssessment() {
  const { buildJobEvidenceCoverage } = require("../electron-runtime/electron/src/requirement-mapper.cjs");
  const { buildOpportunityAssessment } = require("../electron-runtime/src/shared/opportunity-assessment.js");
  const { evidence } = require("./support/inference-fixtures.cjs");
  const requirement = { id: "req-1", jobId: "job-1", kind: "must-have", text: "Scheduling experience",
    normalizedTerm: null, importance: 1, sourceText: "Scheduling experience.", createdAt: NOW };
  const records = [evidence("ev-1", { statement: "Coordinated scheduling for regional field teams.", skills: ["Scheduling"] })];
  const coverage = buildJobEvidenceCoverage("job-1", [requirement], records, NOW);
  const job = { id: "job-1", title: "Coordinator", location: "Remote", employmentType: "Full-time",
    descriptionSnippet: "Scheduling experience.", salaryMin: null, salaryText: null, sourceType: "greenhouse" };
  const track = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "inference", "baseline-track.json"), "utf8"));
  return JSON.stringify({ coverage, assessment: buildOpportunityAssessment(job, track, coverage, NOW) });
}

function loadInferenceLayer() {
  for (const name of ["contract", "broker", "adjudicator", "acceptance", "registry", "manifest", "provenance"]) {
    require(`../electron-runtime/electron/src/inference/${name}.cjs`);
  }
}

function run() {
  staticBoundary();
  const child = runtimeBoundary();
  const gateBefore = JSON.stringify(goldenTruthGate());
  const deterministicBefore = coverageAndAssessment();
  assert.equal(JSON.parse(gateBefore)[2].passed, false, "an edited metric must still fail the deterministic gate");
  loadInferenceLayer();
  assert.equal(JSON.stringify(goldenTruthGate()), gateBefore, "Truth Gate output changed with inference loaded");
  assert.equal(coverageAndAssessment(), deterministicBefore, "coverage/assessment changed with inference loaded");
  console.log(`inference baseline tests passed (${child.loaded.length} deterministic modules loaded with no inference module; ${child.failures.length} not node-loadable)`);
}

run();
