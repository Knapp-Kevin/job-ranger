import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const KNOWN_DEV_ADVISORY = "https://github.com/advisories/GHSA-ch52-4w7c-c8xp";
const severityRank = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4],
]);

const audit = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (audit.error) {
  console.error("Unable to run npm audit:", audit.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch (error) {
  console.error("npm audit did not return valid JSON.");
  if (audit.stderr) console.error(audit.stderr);
  process.exit(1);
}

if (report.error) {
  console.error("npm audit failed:", report.error.summary ?? report.error);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const highOrCritical = Object.entries(vulnerabilities).filter(([, vulnerability]) =>
  (severityRank.get(vulnerability.severity) ?? 0) >= 3,
);

if (highOrCritical.length === 0) {
  console.log("Dependency audit passed: no high or critical vulnerabilities.");
  process.exit(0);
}

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const lockPackages = lock.packages ?? {};

function hasOnlyDevNodes(vulnerability) {
  const nodes = Array.isArray(vulnerability.nodes) ? vulnerability.nodes : [];
  return (
    nodes.length > 0 &&
    nodes.every((nodePath) => lockPackages[nodePath]?.dev === true)
  );
}

function directAdvisories(vulnerability) {
  return (Array.isArray(vulnerability.via) ? vulnerability.via : []).filter(
    (entry) => entry && typeof entry === "object",
  );
}

function dependencyNames(vulnerability) {
  return (Array.isArray(vulnerability.via) ? vulnerability.via : []).filter(
    (entry) => typeof entry === "string",
  );
}

const allowed = new Set();

for (const [name, vulnerability] of highOrCritical) {
  const advisories = directAdvisories(vulnerability).filter(
    (entry) => (severityRank.get(entry.severity) ?? 0) >= 3,
  );
  if (
    advisories.length > 0 &&
    advisories.every((entry) => entry.url === KNOWN_DEV_ADVISORY) &&
    hasOnlyDevNodes(vulnerability)
  ) {
    allowed.add(name);
  }
}

let changed = true;
while (changed) {
  changed = false;
  for (const [name, vulnerability] of highOrCritical) {
    if (allowed.has(name) || !hasOnlyDevNodes(vulnerability)) continue;
    const advisories = directAdvisories(vulnerability).filter(
      (entry) => (severityRank.get(entry.severity) ?? 0) >= 3,
    );
    if (advisories.some((entry) => entry.url !== KNOWN_DEV_ADVISORY)) continue;
    const dependencies = dependencyNames(vulnerability);
    if (dependencies.length > 0 && dependencies.every((dependency) => allowed.has(dependency))) {
      allowed.add(name);
      changed = true;
    }
  }
}

const blocked = highOrCritical.filter(([name]) => !allowed.has(name));

if (allowed.size > 0) {
  console.warn(
    `Security audit note: temporarily allowing ${KNOWN_DEV_ADVISORY} only through dev-only build tooling: ${[
      ...allowed,
    ].sort().join(", ")}.`,
  );
  console.warn(
    "This exception does not apply to runtime dependencies or to any other high/critical advisory.",
  );
}

if (blocked.length > 0) {
  console.error("High/critical dependency vulnerabilities remain blocked:");
  for (const [name, vulnerability] of blocked) {
    const urls = directAdvisories(vulnerability)
      .map((entry) => entry.url)
      .filter(Boolean);
    console.error(
      `- ${name}: ${vulnerability.severity}${urls.length ? ` (${urls.join(", ")})` : ""}`,
    );
  }
  process.exit(1);
}

console.log("Dependency audit passed with only the bounded dev-tool advisory exception above.");
