import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, value) {
  fs.writeFileSync(path.join(root, rel), value);
}

function replaceOnce(rel, needle, replacement) {
  const current = read(rel);
  if (current.includes(replacement)) return;
  const index = current.indexOf(needle);
  if (index < 0) throw new Error(`Patch anchor not found in ${rel}: ${needle.slice(0, 120)}`);
  write(rel, current.slice(0, index) + replacement + current.slice(index + needle.length));
}

function insertBeforeLast(rel, needle, insertion) {
  const current = read(rel);
  if (current.includes(insertion.trim())) return;
  const index = current.lastIndexOf(needle);
  if (index < 0) throw new Error(`Patch tail anchor not found in ${rel}`);
  write(rel, current.slice(0, index) + insertion + current.slice(index));
}

// Shared source-truth + diagnostic contracts.
replaceOnce(
  "src/shared/contracts.ts",
  `export type SourceSupportLevel =\n  | "supported"\n  | "detected"\n  | "browser-required"\n  | "manual-review";`,
  `export type SourceSupportLevel =\n  | "supported"\n  | "detected"\n  | "browser-required"\n  | "manual-review";\n\nexport type SourceContentCompleteness = "full" | "partial" | "listing-only";\n\nexport type SourceDiagnosticCode =\n  | "success-with-results"\n  | "success-empty"\n  | "cooldown"\n  | "circuit-open"\n  | "unsupported-source"\n  | "browser-unavailable"\n  | "network-policy-blocked"\n  | "access-blocked"\n  | "rate-limited"\n  | "timeout"\n  | "retrieval-failed"\n  | "extraction-failed"\n  | "parser-failed"\n  | "unknown-failure";\n\nexport interface JobSourceSnapshot {\n  id: string;\n  jobId: string;\n  sourceType: CompanySourceType;\n  sourceUrl: string;\n  retrievedAt: string;\n  extractionVersion: string;\n  completeness: SourceContentCompleteness;\n  contentText: string;\n  contentHash: string;\n}`,
);

replaceOnce(
  "src/shared/contracts.ts",
  `  descriptionSnippet: string;\n  salaryMin: number | null;`,
  `  descriptionSnippet: string;\n  currentSourceSnapshotId: string | null;\n  sourceCompleteness: SourceContentCompleteness;\n  salaryMin: number | null;`,
);

replaceOnce(
  "src/shared/contracts.ts",
  `  jobsMatchedCount: number;\n  errorMessage: string | null;\n}`,
  `  jobsMatchedCount: number;\n  diagnosticCode: SourceDiagnosticCode | null;\n  diagnosticMessage: string | null;\n  errorMessage: string | null;\n}`,
);

// Durable schema. Version 9 owns both issues because snapshot truth and source diagnostics
// are one acquisition contract.
insertBeforeLast(
  "electron/src/migrations.cts",
  "\n];",
  `\n  {\n    version: 9,\n    name: "source_truth_and_diagnostics",\n    sql: \`\n      CREATE TABLE IF NOT EXISTS job_source_snapshots (\n        id TEXT PRIMARY KEY,\n        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,\n        source_type TEXT NOT NULL,\n        source_url TEXT NOT NULL,\n        retrieved_at TEXT NOT NULL,\n        extraction_version TEXT NOT NULL,\n        completeness TEXT NOT NULL CHECK (completeness IN ('full', 'partial', 'listing-only')),\n        content_text TEXT NOT NULL,\n        content_hash TEXT NOT NULL,\n        UNIQUE (job_id, content_hash)\n      );\n\n      CREATE INDEX IF NOT EXISTS idx_job_source_snapshots_job\n        ON job_source_snapshots(job_id, retrieved_at DESC);\n\n      ALTER TABLE jobs ADD COLUMN current_source_snapshot_id TEXT;\n      ALTER TABLE jobs ADD COLUMN source_completeness TEXT NOT NULL DEFAULT 'listing-only';\n      ALTER TABLE scrape_runs ADD COLUMN diagnostic_code TEXT;\n      ALTER TABLE scrape_runs ADD COLUMN diagnostic_message TEXT;\n      ALTER TABLE job_requirements ADD COLUMN source_snapshot_id TEXT;\n\n      CREATE INDEX IF NOT EXISTS idx_job_requirements_snapshot\n        ON job_requirements(source_snapshot_id);\n    \`,\n  },\n`,
);

// Scraped jobs now carry the safe text used to construct the canonical snapshot.
replaceOnce(
  "electron/src/scrapers.cts",
  `import type { CompanySourceType } from "../../src/shared/contracts.js";`,
  `import type { CompanySourceType, SourceContentCompleteness } from "../../src/shared/contracts.js";`,
);
replaceOnce(
  "electron/src/scrapers.cts",
  `  descriptionSnippet: string;\n  salaryMin: number | null;`,
  `  descriptionSnippet: string;\n  descriptionText: string;\n  sourceCompleteness: SourceContentCompleteness;\n  extractionVersion: string;\n  salaryMin: number | null;`,
);

// Normalize HTML to safe textual source content. No executable page/session state is stored.
replaceOnce(
  "electron/src/extractors.cts",
  `function stripHtml(html: string | null | undefined): string {`,
  `export function toSourceText(html: string | null | undefined): string {`,
);
replaceOnce(
  "electron/src/extractors.cts",
  `  const stripped = stripHtml(value);`,
  `  const stripped = toSourceText(value);`,
);
replaceOnce(
  "electron/src/extractors.cts",
  `  return stripHtml(value).replace(/\\s+/g, " ").trim();`,
  `  return toSourceText(value).replace(/\\s+/g, " ").trim();`,
);
replaceOnce(
  "electron/src/extractors.cts",
  `        const description = typeof posting.description === "string" ? posting.description : "";\n        const salary = parseSalary(description);`,
  `        const description = typeof posting.description === "string" ? posting.description : "";\n        const descriptionText = toSourceText(description);\n        const salary = parseSalary(description);`,
);
replaceOnce(
  "electron/src/extractors.cts",
  `          descriptionSnippet: toSnippet(description),\n          salaryMin:`,
  `          descriptionSnippet: toSnippet(description),\n          descriptionText,\n          sourceCompleteness: descriptionText ? "full" : "listing-only",\n          extractionVersion: "jsonld-v1",\n          salaryMin:`,
);
replaceOnce(
  "electron/src/extractors.cts",
  `      descriptionSnippet: \`Extracted from \${new URL(baseUrl).hostname}\`,\n      salaryMin: null, salaryMax: null, salaryCurrency: null, salaryText: null,`,
  `      descriptionSnippet: \`Extracted from \${new URL(baseUrl).hostname}\`,\n      descriptionText: title,\n      sourceCompleteness: "listing-only",\n      extractionVersion: "anchor-v1",\n      salaryMin: null, salaryMax: null, salaryCurrency: null, salaryText: null,`,
);

// Structured adapters preserve the fullest safe source text they already receive.
for (const [rel, marker, replacement] of [
  [
    "electron/src/adapters/greenhouse.cts",
    `import { fetchJson, toSnippet, parseSalary } from "../scrapers.cjs";`,
    `import { fetchJson, toSnippet, parseSalary, toSourceText } from "../scrapers.cjs";`,
  ],
  [
    "electron/src/adapters/lever.cts",
    `import { fetchJson, toSnippet, parseSalary } from "../scrapers.cjs";`,
    `import { fetchJson, toSnippet, parseSalary, toSourceText } from "../scrapers.cjs";`,
  ],
  [
    "electron/src/adapters/ashby.cts",
    `import { fetchJson, toSnippet } from "../scrapers.cjs";`,
    `import { fetchJson, toSnippet, toSourceText } from "../scrapers.cjs";`,
  ],
]) replaceOnce(rel, marker, replacement);

replaceOnce(
  "electron/src/adapters/greenhouse.cts",
  `      const salary = parseSalary(job.content);\n      return {`,
  `      const descriptionText = toSourceText(job.content);\n      const salary = parseSalary(job.content);\n      return {`,
);
replaceOnce(
  "electron/src/adapters/greenhouse.cts",
  `        descriptionSnippet: toSnippet(job.content),\n        salaryMin:`,
  `        descriptionSnippet: toSnippet(job.content),\n        descriptionText,\n        sourceCompleteness: descriptionText ? "full" : "listing-only",\n        extractionVersion: "greenhouse-api-v1",\n        salaryMin:`,
);

replaceOnce(
  "electron/src/adapters/lever.cts",
  `      const description = job.descriptionPlain ?? job.description;\n      const salary = parseSalary(description);`,
  `      const description = job.descriptionPlain ?? job.description;\n      const descriptionText = toSourceText(description);\n      const salary = parseSalary(description);`,
);
replaceOnce(
  "electron/src/adapters/lever.cts",
  `        descriptionSnippet: toSnippet(description),\n        salaryMin:`,
  `        descriptionSnippet: toSnippet(description),\n        descriptionText,\n        sourceCompleteness: descriptionText ? "full" : "listing-only",\n        extractionVersion: "lever-api-v1",\n        salaryMin:`,
);

replaceOnce(
  "electron/src/adapters/ashby.cts",
  `    return response.jobs.map((job) => ({`,
  `    return response.jobs.map((job) => {\n      const descriptionText = toSourceText(job.descriptionPlain);\n      return ({`,
);
replaceOnce(
  "electron/src/adapters/ashby.cts",
  `      descriptionSnippet: toSnippet(job.descriptionPlain),\n      salaryMin:`,
  `      descriptionSnippet: toSnippet(job.descriptionPlain),\n      descriptionText,\n      sourceCompleteness: descriptionText ? "full" : "listing-only",\n      extractionVersion: "ashby-api-v1",\n      salaryMin:`,
);
replaceOnce(
  "electron/src/adapters/ashby.cts",
  `      postDate: job.publishedAt ?? null,\n    }));`,
  `      postDate: job.publishedAt ?? null,\n    });\n    });`,
);

replaceOnce(
  "electron/src/adapters/smartrecruiters.cts",
  `      descriptionSnippet: "",\n      salaryMin:`,
  `      descriptionSnippet: "",\n      descriptionText: job.name.trim(),\n      sourceCompleteness: "listing-only",\n      extractionVersion: "smartrecruiters-list-v1",\n      salaryMin:`,
);

// Dedicated deterministic diagnostic mapping.
const diagnosticModule = `import type { SourceDiagnosticCode } from "../../src/shared/contracts.js";\n\nexport interface SourceFailureDiagnostic {\n  code: SourceDiagnosticCode;\n  message: string;\n}\n\nexport function classifySourceFailure(error: unknown): SourceFailureDiagnostic {\n  const raw = error instanceof Error ? error.message : String(error ?? "");\n  const value = raw.toLowerCase();\n\n  if (error instanceof Error && error.name === "AbortError" || /timeout|timed out|aborted/.test(value)) {\n    return { code: "timeout", message: "The source did not respond before the configured timeout." };\n  }\n  if (/http\\s+(401|403)\\b/.test(value)) {\n    return { code: "access-blocked", message: "The source refused automated access. Job Ranger did not bypass the site's access controls." };\n  }\n  if (/http\\s+429\\b|rate.?limit/.test(value)) {\n    return { code: "rate-limited", message: "The source is rate-limiting requests. Try again later or reduce check frequency." };\n  }\n  if (/private|loopback|link-local|reserved|public network|network policy|unsafe destination/.test(value)) {\n    return { code: "network-policy-blocked", message: "Job Ranger blocked this request because the destination failed the acquisition network policy." };\n  }\n  if (/no job listings extracted|dedicated adapter may be required/.test(value)) {\n    return { code: "extraction-failed", message: "The source loaded, but Job Ranger could not reliably extract job listings from its current page shape." };\n  }\n  if (/json|parse|parser|unexpected token/.test(value)) {\n    return { code: "parser-failed", message: "The source returned data Job Ranger could not parse reliably." };\n  }\n  if (/http\\s+\\d+|fetch|network|enotfound|econn|socket/.test(value)) {\n    return { code: "retrieval-failed", message: "Job Ranger could not retrieve this source reliably." };\n  }\n  return { code: "unknown-failure", message: "The source check failed for an unclassified reason. The technical detail is preserved in local run history." };\n}\n`;
write("electron/src/source-diagnostics.cts", diagnosticModule);

// Repository persistence: canonical snapshots + run diagnostics.
replaceOnce(
  "electron/src/repository.cts",
  `import type {\n  Company,`,
  `import { createHash } from "node:crypto";\nimport type {\n  Company,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `  Job,\n  ScrapeRun,`,
  `  Job,\n  JobSourceSnapshot,\n  ScrapeRun,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `  ScrapeRunStatus,\n  Settings,`,
  `  ScrapeRunStatus,\n  SourceContentCompleteness,\n  SourceDiagnosticCode,\n  Settings,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `  description_snippet: string;\n  salary_min:`,
  `  description_snippet: string;\n  current_source_snapshot_id: string | null;\n  source_completeness: SourceContentCompleteness;\n  salary_min:`,
);
replaceOnce(
  "electron/src/repository.cts",
  `  jobs_matched_count: number;\n  error_message: string | null;`,
  `  jobs_matched_count: number;\n  diagnostic_code: SourceDiagnosticCode | null;\n  diagnostic_message: string | null;\n  error_message: string | null;`,
);
replaceOnce(
  "electron/src/repository.cts",
  `type SettingRow = {`,
  `type JobSourceSnapshotRow = {\n  id: string;\n  job_id: number;\n  source_type: Job["sourceType"];\n  source_url: string;\n  retrieved_at: string;\n  extraction_version: string;\n  completeness: SourceContentCompleteness;\n  content_text: string;\n  content_hash: string;\n};\n\ntype SettingRow = {`,
);
replaceOnce(
  "electron/src/repository.cts",
  `    descriptionSnippet: row.description_snippet,\n    salaryMin:`,
  `    descriptionSnippet: row.description_snippet,\n    currentSourceSnapshotId: row.current_source_snapshot_id ?? null,\n    sourceCompleteness: row.source_completeness ?? "listing-only",\n    salaryMin:`,
);
replaceOnce(
  "electron/src/repository.cts",
  `    jobsMatchedCount: row.jobs_matched_count,\n    errorMessage: row.error_message,`,
  `    jobsMatchedCount: row.jobs_matched_count,\n    diagnosticCode: row.diagnostic_code ?? null,\n    diagnosticMessage: row.diagnostic_message ?? null,\n    errorMessage: row.error_message,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `function serializeArray(value: string[]): string {`,
  `function mapJobSourceSnapshot(row: JobSourceSnapshotRow): JobSourceSnapshot {\n  return {\n    id: row.id,\n    jobId: String(row.job_id),\n    sourceType: row.source_type,\n    sourceUrl: row.source_url,\n    retrievedAt: row.retrieved_at,\n    extractionVersion: row.extraction_version,\n    completeness: row.completeness,\n    contentText: row.content_text,\n    contentHash: row.content_hash,\n  };\n}\n\nfunction stableSnapshotId(jobId: string, contentHash: string): string {\n  return "snapshot-" + createHash("sha256").update(jobId + "\\n" + contentHash).digest("hex").slice(0, 24);\n}\n\nfunction serializeArray(value: string[]): string {`,
);
replaceOnce(
  "electron/src/repository.cts",
  `    descriptionSnippet: string;\n    salaryMin:`,
  `    descriptionSnippet: string;\n    descriptionText: string;\n    sourceCompleteness: SourceContentCompleteness;\n    extractionVersion: string;\n    salaryMin:`,
);
replaceOnce(
  "electron/src/repository.cts",
  `          description_snippet,\n          salary_min,`,
  `          description_snippet,\n          source_completeness,\n          salary_min,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `          \${input.descriptionSnippet},\n          \${input.salaryMin},`,
  `          \${input.descriptionSnippet},\n          \${input.sourceCompleteness},\n          \${input.salaryMin},`,
);
replaceOnce(
  "electron/src/repository.cts",
  `          description_snippet = excluded.description_snippet,\n          salary_min = excluded.salary_min,`,
  `          description_snippet = excluded.description_snippet,\n          source_completeness = excluded.source_completeness,\n          salary_min = excluded.salary_min,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `    return mapJob(row);\n  }\n\n  async deactivateMissingJobs`,
  `    const contentText = (input.descriptionText.trim() || input.descriptionSnippet.trim() || input.title.trim());\n    const contentHash = createHash("sha256").update(contentText).digest("hex");\n    const snapshotId = stableSnapshotId(String(row.id), contentHash);\n    await this.sqlite.exec(sql\`\n      INSERT INTO job_source_snapshots (\n        id, job_id, source_type, source_url, retrieved_at, extraction_version,\n        completeness, content_text, content_hash\n      ) VALUES (\n        \${snapshotId}, \${row.id}, \${input.sourceType}, \${input.url}, \${input.lastSeenAt},\n        \${input.extractionVersion}, \${input.sourceCompleteness}, \${contentText}, \${contentHash}\n      )\n      ON CONFLICT(job_id, content_hash) DO UPDATE SET\n        retrieved_at = excluded.retrieved_at,\n        source_url = excluded.source_url,\n        extraction_version = excluded.extraction_version,\n        completeness = excluded.completeness;\n    \`);\n    await this.sqlite.exec(sql\`\n      UPDATE jobs\n      SET current_source_snapshot_id = \${snapshotId}, source_completeness = \${input.sourceCompleteness}\n      WHERE id = \${row.id};\n    \`);\n    const updatedRow = await this.sqlite.queryOne<JobRow>(sql\`SELECT * FROM jobs WHERE id = \${row.id} LIMIT 1;\`);\n    return mapJob(updatedRow ?? row);\n  }\n\n  async listJobSourceSnapshots(jobId: string): Promise<JobSourceSnapshot[]> {\n    const rows = await this.sqlite.queryAll<JobSourceSnapshotRow>(sql\`\n      SELECT * FROM job_source_snapshots\n      WHERE job_id = \${jobId}\n      ORDER BY retrieved_at DESC;\n    \`);\n    return rows.map(mapJobSourceSnapshot);\n  }\n\n  async deactivateMissingJobs`,
);
replaceOnce(
  "electron/src/repository.cts",
  `    jobsMatchedCount: number,\n    errorMessage: string | null,`,
  `    jobsMatchedCount: number,\n    diagnosticCode: SourceDiagnosticCode | null,\n    diagnosticMessage: string | null,\n    errorMessage: string | null,`,
);
replaceOnce(
  "electron/src/repository.cts",
  `          jobs_matched_count = \${jobsMatchedCount},\n          error_message = \${errorMessage}`,
  `          jobs_matched_count = \${jobsMatchedCount},\n          diagnostic_code = \${diagnosticCode},\n          diagnostic_message = \${diagnosticMessage},\n          error_message = \${errorMessage}`,
);

// Backend wires safe snapshots and explicit diagnostic categories into each run.
replaceOnce(
  "electron/src/backend.cts",
  `import { resolveSqliteBinary, sql, SqliteClient } from "./sqlite.cjs";`,
  `import { resolveSqliteBinary, sql, SqliteClient } from "./sqlite.cjs";\nimport { classifySourceFailure } from "./source-diagnostics.cjs";`,
);
replaceOnce(
  "electron/src/backend.cts",
  `      return this.repository.finalizeScrapeRun(run.id, "skipped", 0, 0, message);`,
  `      const diagnosticCode = guard.reason === "cooldown" ? "cooldown" : "circuit-open";\n      return this.repository.finalizeScrapeRun(run.id, "skipped", 0, 0, diagnosticCode, message, message);`,
);
replaceOnce(
  "electron/src/backend.cts",
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, message);`,
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, "unsupported-source", message, message);`,
);
// second unsupported occurrence
replaceOnce(
  "electron/src/backend.cts",
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, message);`,
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, "unsupported-source", message, message);`,
);
// browser unavailable occurrence
replaceOnce(
  "electron/src/backend.cts",
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, message);`,
  `      return this.repository.finalizeScrapeRun(run.id, "unsupported", 0, 0, "browser-unavailable", message, message);`,
);
replaceOnce(
  "electron/src/backend.cts",
  `          descriptionSnippet: scrapedJob.descriptionSnippet,\n          salaryMin:`,
  `          descriptionSnippet: scrapedJob.descriptionSnippet,\n          descriptionText: scrapedJob.descriptionText,\n          sourceCompleteness: scrapedJob.sourceCompleteness,\n          extractionVersion: scrapedJob.extractionVersion,\n          salaryMin:`,
);
replaceOnce(
  "electron/src/backend.cts",
  `      await this.repository.setCompanyRunState(company.id, "success", startedAt, null);\n      return this.repository.finalizeScrapeRun(\n        run.id,\n        "success",\n        scrapedJobs.length,\n        matchedCount,\n        null,\n      );`,
  `      await this.repository.setCompanyRunState(company.id, "success", startedAt, null);\n      const diagnosticCode = scrapedJobs.length > 0 ? "success-with-results" : "success-empty";\n      const diagnosticMessage = scrapedJobs.length > 0\n        ? \`Source retrieved successfully; \${scrapedJobs.length} job\${scrapedJobs.length === 1 ? "" : "s"} collected.\`\n        : "Source retrieved successfully and returned zero jobs. This is different from an extraction or retrieval failure.";\n      return this.repository.finalizeScrapeRun(\n        run.id,\n        "success",\n        scrapedJobs.length,\n        matchedCount,\n        diagnosticCode,\n        diagnosticMessage,\n        null,\n      );`,
);
replaceOnce(
  "electron/src/backend.cts",
  `      const message =\n        error instanceof Error ? error.message : "Unknown scrape failure";\n      await this.repository.incrementFailures(company.id);`,
  `      const message =\n        error instanceof Error ? error.message : "Unknown scrape failure";\n      const diagnostic = classifySourceFailure(error);\n      await this.repository.incrementFailures(company.id);`,
);
replaceOnce(
  "electron/src/backend.cts",
  `      await this.repository.setCompanyRunState(company.id, "failure", startedAt, message);\n      return this.repository.finalizeScrapeRun(run.id, "failure", 0, 0, message);`,
  `      await this.repository.setCompanyRunState(company.id, "failure", startedAt, diagnostic.message);\n      return this.repository.finalizeScrapeRun(\n        run.id, "failure", 0, 0, diagnostic.code, diagnostic.message, message,\n      );`,
);

// Requirements consume the current canonical snapshot and persist the linkage.
replaceOnce(
  "electron/src/requirement-repository.cts",
  `  async listCareerEvidence(): Promise<CandidateEvidence[]> {`,
  `  async getCurrentSourceSnapshot(jobId: string): Promise<{ id: string; contentText: string; completeness: string } | null> {\n    const row = await this.sqlite.queryOne<{ id: string; content_text: string; completeness: string }>(sql\`\n      SELECT snapshot.id, snapshot.content_text, snapshot.completeness\n      FROM jobs job\n      JOIN job_source_snapshots snapshot ON snapshot.id = job.current_source_snapshot_id\n      WHERE job.id = \${jobId}\n      LIMIT 1;\n    \`);\n    return row ? { id: row.id, contentText: row.content_text, completeness: row.completeness } : null;\n  }\n\n  async listCareerEvidence(): Promise<CandidateEvidence[]> {`,
);
replaceOnce(
  "electron/src/requirement-repository.cts",
  `  async replaceCoverage(coverage: JobEvidenceCoverage): Promise<void> {`,
  `  async replaceCoverage(coverage: JobEvidenceCoverage, sourceSnapshotId: string | null = null): Promise<void> {`,
);
replaceOnce(
  "electron/src/requirement-repository.cts",
  `      await this.insertRequirement(item.requirement);`,
  `      await this.insertRequirement(item.requirement, sourceSnapshotId);`,
);
replaceOnce(
  "electron/src/requirement-repository.cts",
  `  private async insertRequirement(requirement: JobRequirement): Promise<void> {`,
  `  private async insertRequirement(requirement: JobRequirement, sourceSnapshotId: string | null): Promise<void> {`,
);
replaceOnce(
  "electron/src/requirement-repository.cts",
  `        id, job_id, kind, text, normalized_term, importance, source_text, created_at\n      ) VALUES (\n        \${requirement.id}, \${requirement.jobId}, \${requirement.kind}, \${requirement.text},\n        \${requirement.normalizedTerm}, \${requirement.importance}, \${requirement.sourceText},\n        \${requirement.createdAt}\n      );`,
  `        id, job_id, kind, text, normalized_term, importance, source_text, source_snapshot_id, created_at\n      ) VALUES (\n        \${requirement.id}, \${requirement.jobId}, \${requirement.kind}, \${requirement.text},\n        \${requirement.normalizedTerm}, \${requirement.importance}, \${requirement.sourceText},\n        \${sourceSnapshotId}, \${requirement.createdAt}\n      );`,
);
replaceOnce(
  "electron/src/requirement-backend.cts",
  `    const now = new Date().toISOString();\n    const requirements = extractJobRequirements(job, now);`,
  `    const snapshot = await this.repository.getCurrentSourceSnapshot(jobId);\n    const now = new Date().toISOString();\n    const requirementSource = snapshot\n      ? { ...job, descriptionSnippet: snapshot.contentText }\n      : job;\n    const requirements = extractJobRequirements(requirementSource, now);`,
);
replaceOnce(
  "electron/src/requirement-backend.cts",
  `    await this.repository.replaceCoverage(coverage);`,
  `    await this.repository.replaceCoverage(coverage, snapshot?.id ?? null);`,
);

// Jobs UI makes source completeness visible so absence is not mistaken for employer truth.
replaceOnce(
  "src/pages/Jobs.tsx",
  `                    {job.isNew && (\n                      <span className="soft-badge soft-badge-warning">New</span>\n                    )}`, 
  `                    {job.isNew && (\n                      <span className="soft-badge soft-badge-warning">New</span>\n                    )}\n                    <span\n                      className={\`soft-badge \${job.sourceCompleteness === "full" ? "soft-badge-success" : "soft-badge-warning"}\`}\n                      title={job.sourceCompleteness === "full"\n                        ? "Assessment can use the preserved source description captured for this listing."\n                        : "The source did not provide a complete preserved description. Missing requirements remain unknown."}\n                    >\n                      {job.sourceCompleteness === "full"\n                        ? "Full source text"\n                        : job.sourceCompleteness === "partial"\n                          ? "Partial source text"\n                          : "Listing-only source"}\n                    </span>`,
);
replaceOnce(
  "src/pages/Jobs.tsx",
  `                {selectedTargetTrack && (\n                  <span>\n                    Assessment uses {selectedTargetTrack.name} + confirmed Career Evidence\n                  </span>\n                )}`,
  `                {selectedTargetTrack && (\n                  <span>\n                    Assessment uses {selectedTargetTrack.name} + confirmed Career Evidence\n                    {job.currentSourceSnapshotId ? " + preserved source snapshot" : ""}\n                  </span>\n                )}`,
);

// Focused regression: snapshot history, requirement linkage, success-empty, extraction failure.
const regression = `const assert = require("node:assert/strict");\nconst fs = require("node:fs/promises");\nconst os = require("node:os");\nconst path = require("node:path");\n\nconst { JobScoutBackend } = require("../electron-runtime/electron/src/backend.cjs");\nconst { RequirementBackend } = require("../electron-runtime/electron/src/requirement-backend.cjs");\nconst { SqliteClient } = require("../electron-runtime/electron/src/sqlite.cjs");\n\nasync function run() {\n  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-ranger-source-trust-"));\n  let greenhouseContent = \`<p>Coordinate vendor schedules and customer requests.</p><p>Must maintain OSHA 30 certification and support weekend rotations.</p>\`;\n\n  const fetchImpl = async (url) => {\n    const value = String(url);\n    if (value.includes("boards-api.greenhouse.io/v1/boards/acme/jobs")) {\n      return new Response(JSON.stringify({ jobs: [{ id: 1, title: "Operations Coordinator", location: { name: "Baltimore" }, absolute_url: "https://boards.greenhouse.io/acme/jobs/1", content: greenhouseContent, updated_at: "2026-10-04T12:00:00.000Z" }] }), { status: 200, headers: { "Content-Type": "application/json" } });\n    }\n    if (value.includes("boards-api.greenhouse.io/v1/boards/empty/jobs")) {\n      return new Response(JSON.stringify({ jobs: [] }), { status: 200, headers: { "Content-Type": "application/json" } });\n    }\n    if (value === "https://www.oracle.com/careers/") {\n      return new Response("<html><body><h1>Careers</h1></body></html>", { status: 200, headers: { "Content-Type": "text/html" } });\n    }\n    throw new Error(\`Unexpected URL: \${value}\`);\n  };\n\n  try {\n    const backend = new JobScoutBackend({ dataDirectory: tempDir, fetchImpl, schedulerEnabled: false });\n    await backend.initialize();\n\n    const company = await backend.createCompany({ name: "Acme", url: "https://boards.greenhouse.io/acme", frequencyMinutes: 1440, isActive: true });\n    const firstRun = await backend.runCompanyScrape(company.id);\n    assert.equal(firstRun.status, "success");\n    assert.equal(firstRun.diagnosticCode, "success-with-results");\n\n    let jobs = await backend.listJobs();\n    assert.equal(jobs.length, 1);\n    assert.equal(jobs[0].sourceCompleteness, "full");\n    assert.ok(jobs[0].currentSourceSnapshotId);\n\n    const status = await backend.getSystemStatus(process.platform);\n    const sqlite = new SqliteClient(status.databasePath, status.sqliteBinaryPath);\n    let snapshots = await sqlite.queryAll("SELECT * FROM job_source_snapshots ORDER BY retrieved_at ASC;");\n    assert.equal(snapshots.length, 1);\n    assert.match(snapshots[0].content_text, /OSHA 30 certification/);\n    assert.equal(snapshots[0].content_hash.length, 64);\n\n    const requirements = new RequirementBackend({ databasePath: status.databasePath, sqliteBinaryPath: status.sqliteBinaryPath });\n    await requirements.getJobEvidenceCoverage(jobs[0].id);\n    const linked = await sqlite.queryAll("SELECT text, source_snapshot_id FROM job_requirements WHERE job_id = '1';");\n    assert.ok(linked.some((row) => /OSHA 30 certification/.test(row.text)));\n    assert.ok(linked.every((row) => row.source_snapshot_id === jobs[0].currentSourceSnapshotId));\n\n    await backend.runCompanyScrape(company.id);\n    snapshots = await sqlite.queryAll("SELECT * FROM job_source_snapshots;");\n    assert.equal(snapshots.length, 1, "unchanged source text should not create duplicate snapshots");\n\n    greenhouseContent = \`<p>Coordinate vendor schedules.</p><p>Must maintain OSHA 30 certification.</p><p>Must hold a valid driver's license.</p>\`;\n    await backend.runCompanyScrape(company.id);\n    jobs = await backend.listJobs();\n    snapshots = await sqlite.queryAll("SELECT * FROM job_source_snapshots ORDER BY retrieved_at ASC;");\n    assert.equal(snapshots.length, 2, "changed source text must create a new immutable snapshot");\n    assert.equal(jobs[0].currentSourceSnapshotId, snapshots[1].id);\n\n    const empty = await backend.createCompany({ name: "Empty", url: "https://boards.greenhouse.io/empty", frequencyMinutes: 1440, isActive: true });\n    const emptyRun = await backend.runCompanyScrape(empty.id);\n    assert.equal(emptyRun.status, "success");\n    assert.equal(emptyRun.diagnosticCode, "success-empty");\n    assert.match(emptyRun.diagnosticMessage ?? "", /zero jobs/i);\n\n    const oracle = await backend.createCompany({ name: "Oracle", url: "https://www.oracle.com/careers/", frequencyMinutes: 1440, isActive: true });\n    const oracleRun = await backend.runCompanyScrape(oracle.id);\n    assert.equal(oracleRun.status, "failure");\n    assert.equal(oracleRun.diagnosticCode, "extraction-failed");\n    const companies = await backend.listCompanies();\n    const oracleState = companies.find((item) => item.id === oracle.id);\n    assert.match(oracleState?.lastErrorMessage ?? "", /could not reliably extract/i);\n\n    await backend.dispose();\n    console.log("Source truth and diagnostics regressions passed!");\n  } finally {\n    await fs.rm(tempDir, { recursive: true, force: true });\n  }\n}\n\nrun().catch((error) => { console.error(error); process.exitCode = 1; });\n`;
write("tests/source-truth-diagnostics.test.cjs", regression);

replaceOnce(
  "package.json",
  `node tests/qor-hardening.test.cjs && node tests/target-track-validator.test.cjs`,
  `node tests/qor-hardening.test.cjs && node tests/source-truth-diagnostics.test.cjs && node tests/target-track-validator.test.cjs`,
);

console.log("Applied #117/#118 source-trust tranche.");
