import fs from 'node:fs/promises';

async function patch(path, edits) {
  let text = await fs.readFile(path, 'utf8');
  for (const [from, to] of edits) {
    if (!text.includes(from)) throw new Error(`${path}: expected source not found: ${from.slice(0, 120)}`);
    text = text.replace(from, to);
  }
  await fs.writeFile(path, text, 'utf8');
}

await patch('electron/src/migrations.cts', [[
  '      ALTER TABLE jobs ADD COLUMN description_text TEXT;\n      ALTER TABLE jobs ADD COLUMN description_updated_at TEXT;\n\n      CREATE TABLE IF NOT EXISTS job_requirement_analysis',
  '      ALTER TABLE jobs ADD COLUMN description_text TEXT;\n\n      CREATE TABLE IF NOT EXISTS job_requirement_analysis'
]]);

await patch('electron/src/repository.cts', [[
  `          description_text = excluded.description_text,\n          description_updated_at = CASE\n            WHEN excluded.description_text IS NOT jobs.description_text THEN excluded.last_seen_at\n            ELSE jobs.description_updated_at\n          END,\n          salary_min = excluded.salary_min,`,
  '          description_text = excluded.description_text,\n          salary_min = excluded.salary_min,'
]]);

await patch('electron/src/job-requirement-repository.cts', [[
  'import { sql, SqliteClient } from "./sqlite.cjs";',
  'import { sql, SqliteClient, toSqlLiteral } from "./sqlite.cjs";'
], [
  `    await this.sqlite.exec(\`\n      BEGIN IMMEDIATE;\n      DELETE FROM job_requirements WHERE job_id = \${JSON.stringify(jobId)};\n      \${inserts}\n      INSERT INTO job_requirement_analysis (job_id, source_hash, normalizer_version, analyzed_at)\n      VALUES (\${JSON.stringify(jobId)}, \${JSON.stringify(sourceHash)}, \${normalizerVersion}, \${JSON.stringify(now)})\n      ON CONFLICT(job_id) DO UPDATE SET\n        source_hash = excluded.source_hash,\n        normalizer_version = excluded.normalizer_version,\n        analyzed_at = excluded.analyzed_at;\n      COMMIT;\n    \`);`,
  `    await this.sqlite.exec(\`\n      BEGIN IMMEDIATE;\n      DELETE FROM job_requirements WHERE job_id = \${toSqlLiteral(jobId)};\n      \${inserts}\n      INSERT INTO job_requirement_analysis (job_id, source_hash, normalizer_version, analyzed_at)\n      VALUES (\${toSqlLiteral(jobId)}, \${toSqlLiteral(sourceHash)}, \${normalizerVersion}, \${toSqlLiteral(now)})\n      ON CONFLICT(job_id) DO UPDATE SET\n        source_hash = excluded.source_hash,\n        normalizer_version = excluded.normalizer_version,\n        analyzed_at = excluded.analyzed_at;\n      COMMIT;\n    \`);`
]]);

await patch('src/shared/career-contracts.ts', [[
  `export interface RequirementEvidenceMap {\n  id: string;\n  jobRequirementId: string;\n  evidenceId: string | null;\n  classification: RequirementEvidenceClassification;\n  explanation: string;\n  createdBy: EvidenceMappingAuthority;\n  userConfirmed: boolean;\n  createdAt: string;\n  updatedAt: string;\n}\n\nexport type ResumeContext =`,
  `export interface RequirementEvidenceMap {\n  id: string;\n  jobRequirementId: string;\n  evidenceId: string | null;\n  classification: RequirementEvidenceClassification;\n  explanation: string;\n  createdBy: EvidenceMappingAuthority;\n  userConfirmed: boolean;\n  createdAt: string;\n  updatedAt: string;\n}\n\nexport interface JobRequirementCoverageItem {\n  requirement: JobRequirement;\n  mapping: RequirementEvidenceMap;\n  evidence: CandidateEvidence | null;\n}\n\nexport type RequirementSourceStatus = "available" | "insufficient";\n\nexport interface JobEvidenceCoverage {\n  jobId: string;\n  sourceStatus: RequirementSourceStatus;\n  sourceMessage: string;\n  items: JobRequirementCoverageItem[];\n  directCount: number;\n  transferableCount: number;\n  ambiguousCount: number;\n  gapCount: number;\n  confirmedAmbiguousCount: number;\n  analyzedAt: string | null;\n}\n\nexport type ResumeContext =`
]]);

await patch('src/shared/contracts.ts', [[
  '  EvidenceReviewUpdate,\n  LegacyCareerMigration,',
  '  EvidenceReviewUpdate,\n  JobEvidenceCoverage,\n  LegacyCareerMigration,'
], [
  '  ResumeImportResult,\n  SourceArtifact,',
  '  RequirementEvidenceMap,\n  ResumeImportResult,\n  SourceArtifact,'
], [
  `    mergeEvidence: (\n      sourceId: string,\n      targetId: string,\n    ) => Promise<CandidateEvidence>;\n  };`,
  `    mergeEvidence: (\n      sourceId: string,\n      targetId: string,\n    ) => Promise<CandidateEvidence>;\n    getJobEvidenceCoverage: (jobId: string) => Promise<JobEvidenceCoverage>;\n    confirmRequirementMapping: (mappingId: string) => Promise<RequirementEvidenceMap>;\n  };`
]]);

await patch('electron/src/career-backend.cts', [[
  '  EvidenceReviewUpdate,\n  ExtractionSnapshot,',
  '  EvidenceReviewUpdate,\n  ExtractionSnapshot,\n  JobEvidenceCoverage,\n  RequirementEvidenceMap,'
], [
  'import { CareerEvidenceRepository } from "./career-evidence-repository.cjs";\nimport { normalizeEvidenceProposals } from "./evidence-normalizer.cjs";',
  'import { CareerEvidenceRepository } from "./career-evidence-repository.cjs";\nimport { JobRequirementRepository } from "./job-requirement-repository.cjs";\nimport { normalizeEvidenceProposals } from "./evidence-normalizer.cjs";\nimport {\n  mapRequirementToEvidence,\n  normalizeJobRequirements,\n  requirementSourceHash,\n  REQUIREMENT_NORMALIZER_VERSION,\n} from "./requirement-normalizer.cjs";'
], [
  '  private readonly evidenceRepository: CareerEvidenceRepository;\n  private readonly artifactsDirectory: string;',
  '  private readonly evidenceRepository: CareerEvidenceRepository;\n  private readonly requirementRepository: JobRequirementRepository;\n  private readonly artifactsDirectory: string;'
], [
  '    this.evidenceRepository = new CareerEvidenceRepository(this.sqlite);\n    this.artifactsDirectory = path.join(options.dataDirectory, "artifacts");',
  '    this.evidenceRepository = new CareerEvidenceRepository(this.sqlite);\n    this.requirementRepository = new JobRequirementRepository(this.sqlite);\n    this.artifactsDirectory = path.join(options.dataDirectory, "artifacts");'
], [
  `  async mergeEvidence(\n    sourceId: string,\n    targetId: string,\n  ): Promise<CandidateEvidence> {\n    return this.evidenceRepository.mergeEvidence(sourceId, targetId);\n  }\n\n  async importPastedText`,
  `  async mergeEvidence(\n    sourceId: string,\n    targetId: string,\n  ): Promise<CandidateEvidence> {\n    return this.evidenceRepository.mergeEvidence(sourceId, targetId);\n  }\n\n  async getJobEvidenceCoverage(jobId: string): Promise<JobEvidenceCoverage> {\n    const source = await this.requirementRepository.getJobSource(jobId);\n    if (!source) throw new Error(\`Job \${jobId} not found\`);\n\n    const descriptionText = source.descriptionText?.trim() ?? "";\n    if (descriptionText.length < 80) {\n      return {\n        jobId,\n        sourceStatus: "insufficient",\n        sourceMessage:\n          "Job Ranger does not yet have enough source listing text to normalize requirements for this job. The existing deterministic fit guidance remains available.",\n        items: [],\n        directCount: 0,\n        transferableCount: 0,\n        ambiguousCount: 0,\n        gapCount: 0,\n        confirmedAmbiguousCount: 0,\n        analyzedAt: null,\n      };\n    }\n\n    const sourceHash = requirementSourceHash(descriptionText);\n    const analysis = await this.requirementRepository.getAnalysis(jobId);\n    if (\n      !analysis ||\n      analysis.source_hash !== sourceHash ||\n      analysis.normalizer_version !== REQUIREMENT_NORMALIZER_VERSION\n    ) {\n      await this.requirementRepository.replaceRequirements(\n        jobId,\n        sourceHash,\n        REQUIREMENT_NORMALIZER_VERSION,\n        normalizeJobRequirements(jobId, descriptionText),\n      );\n    }\n\n    const requirements = await this.requirementRepository.listRequirements(jobId);\n    const evidence = await this.requirementRepository.listConfirmedEvidence();\n    await this.requirementRepository.replaceDeterministicMappings(\n      jobId,\n      requirements.map((requirement) => mapRequirementToEvidence(requirement, evidence)),\n    );\n    const items = await this.requirementRepository.listCoverage(jobId);\n    const currentAnalysis = await this.requirementRepository.getAnalysis(jobId);\n\n    return {\n      jobId,\n      sourceStatus: "available",\n      sourceMessage:\n        requirements.length > 0\n          ? "Requirements are mapped only against confirmed Career Evidence. Gaps stay gaps."\n          : "The listing text is available, but Job Ranger did not find explicit requirements it can normalize confidently.",\n      items,\n      directCount: items.filter((item) => item.mapping.classification === "direct").length,\n      transferableCount: items.filter((item) => item.mapping.classification === "transferable").length,\n      ambiguousCount: items.filter((item) => item.mapping.classification === "ambiguous").length,\n      gapCount: items.filter((item) => item.mapping.classification === "gap").length,\n      confirmedAmbiguousCount: items.filter(\n        (item) => item.mapping.classification === "ambiguous" && item.mapping.userConfirmed,\n      ).length,\n      analyzedAt: currentAnalysis?.analyzed_at ?? null,\n    };\n  }\n\n  async confirmRequirementMapping(mappingId: string): Promise<RequirementEvidenceMap> {\n    return this.requirementRepository.confirmAmbiguousMapping(mappingId);\n  }\n\n  async importPastedText`
]]);

await patch('electron/src/preload.cts', [[
  '    mergeEvidence: (sourceId, targetId) =>\n      ipcRenderer.invoke("career:merge-evidence", sourceId, targetId),',
  '    mergeEvidence: (sourceId, targetId) =>\n      ipcRenderer.invoke("career:merge-evidence", sourceId, targetId),\n    getJobEvidenceCoverage: (jobId) =>\n      ipcRenderer.invoke("career:get-job-evidence-coverage", jobId),\n    confirmRequirementMapping: (mappingId) =>\n      ipcRenderer.invoke("career:confirm-requirement-mapping", mappingId),'
]]);

await patch('electron/src/main.cts', [[
  `  ipcMain.handle(\n    "career:merge-evidence",\n    (_event, sourceId: string, targetId: string) =>\n      requireCareerBackend().mergeEvidence(\n        validateCareerEntityId(sourceId, "Source evidence id"),\n        validateCareerEntityId(targetId, "Target evidence id"),\n      ),\n  );\n\n  ipcMain.handle("applications:list",`,
  `  ipcMain.handle(\n    "career:merge-evidence",\n    (_event, sourceId: string, targetId: string) =>\n      requireCareerBackend().mergeEvidence(\n        validateCareerEntityId(sourceId, "Source evidence id"),\n        validateCareerEntityId(targetId, "Target evidence id"),\n      ),\n  );\n  ipcMain.handle("career:get-job-evidence-coverage", (_event, jobId: string) =>\n    requireCareerBackend().getJobEvidenceCoverage(validateId(jobId, "Job id")),\n  );\n  ipcMain.handle("career:confirm-requirement-mapping", (_event, mappingId: string) =>\n    requireCareerBackend().confirmRequirementMapping(\n      validateCareerEntityId(mappingId, "Requirement mapping id"),\n    ),\n  );\n\n  ipcMain.handle("applications:list",`
]]);

await patch('package.json', [[
  'node tests/career-persistence-smoke-test.cjs && node tests/resume-import-smoke-test.cjs',
  'node tests/career-persistence-smoke-test.cjs && node tests/resume-import-smoke-test.cjs && node tests/requirement-mapping-smoke-test.cjs'
]]);

console.log('R2 requirement mapping integration applied');
