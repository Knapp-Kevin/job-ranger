import type { JobEvidenceCoverage } from "../../src/shared/requirement-coverage.js";
import { buildJobEvidenceCoverage, extractJobRequirements } from "./requirement-mapper.cjs";
import { RequirementRepository } from "./requirement-repository.cjs";
import { SqliteClient } from "./sqlite.cjs";

interface RequirementBackendOptions {
  databasePath: string;
  sqliteBinaryPath: string;
}

export class RequirementBackend {
  private readonly repository: RequirementRepository;

  constructor(options: RequirementBackendOptions) {
    const sqlite = new SqliteClient(options.databasePath, options.sqliteBinaryPath);
    this.repository = new RequirementRepository(sqlite);
  }

  async getJobEvidenceCoverage(jobId: string): Promise<JobEvidenceCoverage> {
    const job = await this.repository.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const snapshot = await this.repository.getCurrentSourceSnapshot(jobId);
    const now = new Date().toISOString();
    const requirementSource = snapshot
      ? { ...job, descriptionSnippet: snapshot.contentText }
      : job;
    const requirements = extractJobRequirements(requirementSource, now);
    const evidence = await this.repository.listCareerEvidence();
    const coverage = buildJobEvidenceCoverage(jobId, requirements, evidence, now);
    await this.repository.replaceCoverage(coverage, snapshot?.id ?? null);
    return coverage;
  }
}
