import fs from 'node:fs/promises';

async function patch(path, edits) {
  let text = await fs.readFile(path, 'utf8');
  for (const [from, to] of edits) {
    if (!text.includes(from)) throw new Error(`${path}: expected source not found: ${from.slice(0, 100)}`);
    text = text.replace(from, to);
  }
  await fs.writeFile(path, text, 'utf8');
}

await patch('src/shared/contracts.ts', [[
  '  descriptionSnippet: string;\n  salaryMin: number | null;',
  '  descriptionSnippet: string;\n  descriptionText: string | null;\n  salaryMin: number | null;'
]]);

await patch('electron/src/migrations.cts', [[
  '  },\n];\n',
  `  },\n  {\n    version: 5,\n    name: "job_requirement_source_text",\n    sql: \`\n      ALTER TABLE jobs ADD COLUMN description_text TEXT;\n      ALTER TABLE jobs ADD COLUMN description_updated_at TEXT;\n\n      CREATE TABLE IF NOT EXISTS job_requirement_analysis (\n        job_id TEXT PRIMARY KEY,\n        source_hash TEXT NOT NULL,\n        normalizer_version INTEGER NOT NULL,\n        analyzed_at TEXT NOT NULL\n      );\n    \`,\n  },\n];\n`
]]);

await patch('electron/src/scrapers.cts', [[
  'import { toSnippet, extractJobsFromHtml } from "./extractors.cjs";',
  'import { toSnippet, toDescriptionText, extractJobsFromHtml } from "./extractors.cjs";'
], [
  'export { toSnippet, extractJobsFromHtml, PLATFORM_SELECTORS, getSelectorsForSource, parseSalary };',
  'export { toSnippet, toDescriptionText, extractJobsFromHtml, PLATFORM_SELECTORS, getSelectorsForSource, parseSalary };'
], [
  '  descriptionSnippet: string;\n  salaryMin: number | null;',
  '  descriptionSnippet: string;\n  descriptionText: string | null;\n  salaryMin: number | null;'
]]);

await patch('electron/src/extractors.cts', [[
  `function stripHtml(html: string | null | undefined): string {\n  if (!html) return "";\n  return html\n    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")\n    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")\n    .replace(/<[^>]+>/g, " ")\n    .replace(/&nbsp;/g, " ")\n    .replace(/&amp;/g, "&")\n    .replace(/&#39;/g, "'")\n    .replace(/&quot;/g, '"')\n    .replace(/\\s+/g, " ")\n    .trim();\n}\n\nexport function toSnippet(value: string | null | undefined): string {\n  const stripped = stripHtml(value);\n  return stripped.length <= 220 ? stripped : \`\${stripped.slice(0, 217).trimEnd()}...\`;\n}`,
  `export function toDescriptionText(html: string | null | undefined): string {\n  if (!html) return "";\n  return html\n    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")\n    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")\n    .replace(/<br\\s*\\/?\\s*>/gi, "\\n")\n    .replace(/<\\/(p|div|li|ul|ol|h[1-6]|section|article)>/gi, "\\n")\n    .replace(/<li\\b[^>]*>/gi, "- ")\n    .replace(/<[^>]+>/g, " ")\n    .replace(/&nbsp;/g, " ")\n    .replace(/&amp;/g, "&")\n    .replace(/&#39;/g, "'")\n    .replace(/&quot;/g, '"')\n    .replace(/\\r/g, "")\n    .split("\\n")\n    .map((line) => line.replace(/[ \\t]+/g, " ").trim())\n    .filter(Boolean)\n    .join("\\n")\n    .trim();\n}\n\nfunction stripHtml(value: string | null | undefined): string {\n  return toDescriptionText(value).replace(/\\s+/g, " ").trim();\n}\n\nexport function toSnippet(value: string | null | undefined): string {\n  const stripped = stripHtml(value);\n  return stripped.length <= 220 ? stripped : \`\${stripped.slice(0, 217).trimEnd()}...\`;\n}`
], [
  '          descriptionSnippet: toSnippet(description),\n          salaryMin:',
  '          descriptionSnippet: toSnippet(description),\n          descriptionText: toDescriptionText(description) || null,\n          salaryMin:'
], [
  '      descriptionSnippet: `Extracted from ${new URL(baseUrl).hostname}`,\n      salaryMin:',
  '      descriptionSnippet: `Extracted from ${new URL(baseUrl).hostname}`,\n      descriptionText: null,\n      salaryMin:'
]]);

await patch('electron/src/adapters/greenhouse.cts', [[
  'import { fetchJson, toSnippet, parseSalary } from "../scrapers.cjs";',
  'import { fetchJson, toSnippet, toDescriptionText, parseSalary } from "../scrapers.cjs";'
], [
  '        descriptionSnippet: toSnippet(job.content),\n        salaryMin:',
  '        descriptionSnippet: toSnippet(job.content),\n        descriptionText: toDescriptionText(job.content) || null,\n        salaryMin:'
]]);

await patch('electron/src/adapters/lever.cts', [[
  'import { fetchJson, toSnippet, parseSalary } from "../scrapers.cjs";',
  'import { fetchJson, toSnippet, toDescriptionText, parseSalary } from "../scrapers.cjs";'
], [
  '        descriptionSnippet: toSnippet(description),\n        salaryMin:',
  '        descriptionSnippet: toSnippet(description),\n        descriptionText: toDescriptionText(description) || null,\n        salaryMin:'
]]);

await patch('electron/src/adapters/ashby.cts', [[
  'import { fetchJson, toSnippet } from "../scrapers.cjs";',
  'import { fetchJson, toSnippet, toDescriptionText } from "../scrapers.cjs";'
], [
  '      descriptionSnippet: toSnippet(job.descriptionPlain),\n      salaryMin:',
  '      descriptionSnippet: toSnippet(job.descriptionPlain),\n      descriptionText: toDescriptionText(job.descriptionPlain) || null,\n      salaryMin:'
]]);

await patch('electron/src/adapters/smartrecruiters.cts', [[
  '      descriptionSnippet: "",\n      salaryMin:',
  '      descriptionSnippet: "",\n      descriptionText: null,\n      salaryMin:'
]]);

await patch('electron/src/repository.cts', [[
  '  description_snippet: string;\n  salary_min: number | null;',
  '  description_snippet: string;\n  description_text: string | null;\n  salary_min: number | null;'
], [
  '    descriptionSnippet: row.description_snippet,\n    salaryMin:',
  '    descriptionSnippet: row.description_snippet,\n    descriptionText: row.description_text ?? null,\n    salaryMin:'
], [
  '    descriptionSnippet: string;\n    salaryMin: number | null;',
  '    descriptionSnippet: string;\n    descriptionText: string | null;\n    salaryMin: number | null;'
], [
  '          description_snippet,\n          salary_min,',
  '          description_snippet,\n          description_text,\n          salary_min,'
], [
  '          ${input.descriptionSnippet},\n          ${input.salaryMin},',
  '          ${input.descriptionSnippet},\n          ${input.descriptionText},\n          ${input.salaryMin},'
], [
  '          description_snippet = excluded.description_snippet,\n          salary_min = excluded.salary_min,',
  '          description_snippet = excluded.description_snippet,\n          description_text = excluded.description_text,\n          description_updated_at = CASE\n            WHEN excluded.description_text IS NOT jobs.description_text THEN excluded.last_seen_at\n            ELSE jobs.description_updated_at\n          END,\n          salary_min = excluded.salary_min,'
]]);

await patch('electron/src/backend.cts', [[
  '          descriptionSnippet: scrapedJob.descriptionSnippet,\n          salaryMin:',
  '          descriptionSnippet: scrapedJob.descriptionSnippet,\n          descriptionText: scrapedJob.descriptionText,\n          salaryMin:'
]]);

console.log('R2 description persistence scaffold applied');
