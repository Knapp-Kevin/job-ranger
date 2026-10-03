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
} catch {
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

const highNames = new Set(highOrCritical.map(([name]) => name));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const lockPackages = lock.packages ?? {};

function hasOnlyDevNodes(vulnerability) {
  const nodes = Array.isArray(vulnerability.nodes) ? vulnerability.nodes : [];
  return nodes.length > 0 && nodes.every((nodePath) => lockPackages[nodePath]?.dev === true);
}

function directAdvisories(vulnerability) {
  return (Array.isArray(vulnerability.via) ? vulnerability.via : []).filter(
    (entry) => entry && typeof entry === "object",
  );
}

function graphNames(vulnerability) {
  const viaNames = (Array.isArray(vulnerability.via) ? vulnerability.via : []).filter(
    (entry) => typeof entry === "string",
  );
  const effects = Array.isArray(vulnerability.effects)
    ? vulnerability.effects.filter((entry) => typeof entry === "string")
    : [];
  return [...new Set([...viaNames, ...effects])].filter((name) => highNames.has(name));
}

function eligibleForKnownException(vulnerability) {
  if (!hasOnlyDevNodes(vulnerability)) return false;
  const advisories = directAdvisories(vulnerability).filter(
    (entry) => (severityRank.get(entry.severity) ?? 0) >= 3,
  );
  return advisories.every((entry) => entry.url === KNOWN_DEV_ADVISORY);
}

const graph = new Map();
for (const [name, vulnerability] of highOrCritical) {
  if (!eligibleForKnownException(vulnerability)) continue;
  if (!graph.has(name)) graph.set(name, new Set());
  for (const related of graphNames(vulnerability)) {
    const relatedVulnerability = vulnerabilities[related];
    if (!relatedVulnerability || !eligibleForKnownException(relatedVulnerability)) continue;
    if (!graph.has(related)) graph.set(related, new Set());
    graph.get(name).add(related);
    graph.get(related).add(name);
  }
}

const allowed = new Set();
const queue = [];
for (const [name, vulnerability] of highOrCritical) {
  const advisories = directAdvisories(vulnerability).filter(
    (entry) => (severityRank.get(entry.severity) ?? 0) >= 3,
  );
  if (
    eligibleForKnownException(vulnerability) &&
    advisories.length > 0 &&
    advisories.every((entry) => entry.url === KNOWN_DEV_ADVISORY)
  ) {
    allowed.add(name);
    queue.push(name);
  }
}

while (queue.length > 0) {
  const current = queue.shift();
  for (const related of graph.get(current) ?? []) {
    if (allowed.has(related)) continue;
    allowed.add(related);
    queue.push(related);
  }
}

const blocked = highOrCritical.filter(([name]) => !allowed.has(name));

if (allowed.size > 0) {
  console.warn(
    `Security audit note: temporarily allowing ${KNOWN_DEV_ADVISORY} only through its proven dev-only build-tool component: ${[
      ...allowed,
    ].sort().join(", ")}.`,
  );
  console.warn(
    "This exception does not apply to runtime dependencies, disconnected dev-tool findings, or any other high/critical advisory.",
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
