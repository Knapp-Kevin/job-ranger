import type {
  ResumeProjection,
  ResumeStatement,
} from "../../src/shared/contracts.js";
import type {
  CreateResumeProjectionInput,
  ResumeProjectionBundle,
  ReviseResumeProjectionInput,
} from "../../src/shared/resume-workspace.js";
import {
  buildStatements,
  bundleProjection,
  chooseEvidenceForProjection,
  sectionsForStatements,
} from "./resume-builder.cjs";
import { ResumeRepository } from "./resume-repository.cjs";
import { RequirementBackend } from "./requirement-backend.cjs";
import { SqliteClient } from "./sqlite.cjs";

interface ResumeBackendOptions {
  databasePath: string;
  sqliteBinaryPath: string;
}

export class ResumeBackend {
  private readonly repository: ResumeRepository;
  private readonly requirements: RequirementBackend;

  constructor(options: ResumeBackendOptions) {
    this.repository = new ResumeRepository(
      new SqliteClient(options.databasePath, options.sqliteBinaryPath),
    );
    this.requirements = new RequirementBackend(options);
  }

  private async bundle(projection: ResumeProjection): Promise<ResumeProjectionBundle> {
    const statements = await this.repository.listStatements(projection.id);
    const evidence = await this.repository.getEvidenceByIds(
      Array.from(new Set(statements.flatMap((statement) => statement.evidenceIds))),
    );
    return bundleProjection(projection, statements, evidence);
  }

  async createProjection(
    input: CreateResumeProjectionInput,
  ): Promise<ResumeProjectionBundle> {
    const coverage = await this.requirements.getJobEvidenceCoverage(input.jobId);
    const confirmedEvidence = await this.repository.listConfirmedEvidence();
    const selectedEvidence = chooseEvidenceForProjection(confirmedEvidence, coverage);
    const now = new Date().toISOString();
    const id = this.repository.makeProjectionId();
    const statements = buildStatements(
      id,
      selectedEvidence,
      () => this.repository.makeStatementId(),
    );
    const projection: ResumeProjection = {
      id,
      jobId: input.jobId,
      context: input.context ?? "private-sector",
      pageFormat: input.pageFormat ?? "letter",
      sourceProjectionId: null,
      status: "draft",
      sections: sectionsForStatements(statements),
      selectedEvidenceIds: selectedEvidence.map((item) => item.id),
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createProjection(projection, statements);
    return this.bundle(projection);
  }

  async reviseProjection(
    input: ReviseResumeProjectionInput,
  ): Promise<ResumeProjectionBundle> {
    const source = await this.repository.getProjection(input.sourceProjectionId);
    if (!source) {
      throw new Error(`Resume projection ${input.sourceProjectionId} not found`);
    }

    const uniqueIds = Array.from(new Set(input.selectedEvidenceIds));
    const selectedEvidence = await this.repository.getEvidenceByIds(uniqueIds);
    if (selectedEvidence.length !== uniqueIds.length) {
      throw new Error("A selected resume fact is missing or is no longer confirmed");
    }

    const now = new Date().toISOString();
    const id = this.repository.makeProjectionId();
    const statements: ResumeStatement[] = buildStatements(
      id,
      selectedEvidence,
      () => this.repository.makeStatementId(),
    );
    const projection: ResumeProjection = {
      id,
      jobId: source.jobId,
      context: source.context,
      pageFormat: source.pageFormat,
      sourceProjectionId: source.id,
      status: "draft",
      sections: sectionsForStatements(statements),
      selectedEvidenceIds: uniqueIds,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createProjection(projection, statements);
    return this.bundle(projection);
  }

  async getProjection(id: string): Promise<ResumeProjectionBundle> {
    const projection = await this.repository.getProjection(id);
    if (!projection) throw new Error(`Resume projection ${id} not found`);
    return this.bundle(projection);
  }

  async getLatestProjection(jobId: string): Promise<ResumeProjectionBundle | null> {
    const projections = await this.repository.listProjections(jobId);
    return projections[0] ? this.bundle(projections[0]) : null;
  }

  async listProjections(jobId: string): Promise<ResumeProjectionBundle[]> {
    const projections = await this.repository.listProjections(jobId);
    return Promise.all(projections.map((projection) => this.bundle(projection)));
  }

  async markReviewed(id: string): Promise<ResumeProjectionBundle> {
    const current = await this.getProjection(id);
    if (!current.truthGate.passed) {
      throw new Error("Resume cannot be reviewed until all Truth Gate blockers are resolved");
    }
    const projection = await this.repository.markReviewed(id);
    return this.bundle(projection);
  }
}
