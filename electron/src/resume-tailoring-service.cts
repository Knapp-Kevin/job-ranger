import { randomUUID } from "node:crypto";
import type { CandidateEvidence, ResumeStatement } from "../../src/shared/contracts.js";
import type {
  ResumeProjectionRecord,
  ResumeTailoringApplyRequest,
  ResumeTailoringPlan,
  ResumeTailoringPreviewRequest,
} from "../../src/shared/resume-contracts.js";
import { canEvidenceSupportFactualClaim } from "../../src/shared/career-contracts.js";
import { CareerEvidenceRepository } from "./career-evidence-repository.cjs";
import { RequirementBackend } from "./requirement-backend.cjs";
import { ResumeRepository } from "./resume-repository.cjs";
import {
  buildResumeTailoringPlan,
  resumeSectionForEvidence,
  resumeSectionRank,
} from "./resume-tailoring.cjs";
import { SqliteClient } from "./sqlite.cjs";

interface ResumeTailoringServiceOptions {
  databasePath: string;
  sqliteBinaryPath: string;
}

export class ResumeTailoringService {
  private readonly evidenceRepository: CareerEvidenceRepository;
  private readonly requirementBackend: RequirementBackend;
  private readonly resumeRepository: ResumeRepository;

  constructor(options: ResumeTailoringServiceOptions) {
    const sqlite = new SqliteClient(options.databasePath, options.sqliteBinaryPath);
    this.evidenceRepository = new CareerEvidenceRepository(sqlite);
    this.resumeRepository = new ResumeRepository(sqlite);
    this.requirementBackend = new RequirementBackend(options);
  }

  async preview(
    request: ResumeTailoringPreviewRequest,
  ): Promise<ResumeTailoringPlan> {
    const source = await this.resumeRepository.getProjection(
      request.sourceProjectionId,
    );
    if (!source) {
      throw new Error(`Resume projection ${request.sourceProjectionId} not found`);
    }

    const [coverage, reviewItems] = await Promise.all([
      this.requirementBackend.getJobEvidenceCoverage(request.jobId),
      this.evidenceRepository.listEvidenceReviewItems(),
    ]);

    return buildResumeTailoringPlan(
      source,
      reviewItems.map((item) => item.evidence),
      coverage,
    );
  }

  async apply(
    request: ResumeTailoringApplyRequest,
  ): Promise<ResumeProjectionRecord> {
    const source = await this.resumeRepository.getProjection(
      request.sourceProjectionId,
    );
    if (!source) {
      throw new Error(`Resume projection ${request.sourceProjectionId} not found`);
    }

    const [plan, reviewItems, sourceStatements] = await Promise.all([
      this.preview(request),
      this.evidenceRepository.listEvidenceReviewItems(),
      this.resumeRepository.listStatements(source.id),
    ]);

    const selectedIds = Array.from(new Set(request.selectedEvidenceIds));
    if (selectedIds.length === 0) {
      throw new Error("Select at least one Career Evidence item for the tailored resume.");
    }

    const allowed = new Set(plan.candidates.map((candidate) => candidate.evidenceId));
    const outsidePlan = selectedIds.filter((id) => !allowed.has(id));
    if (outsidePlan.length > 0) {
      throw new Error("Tailored resume selection contains evidence outside the reviewed plan.");
    }

    const evidenceById = new Map(
      reviewItems.map((item) => [item.evidence.id, item.evidence] as const),
    );
    const selected = selectedIds.map((id) => evidenceById.get(id)).filter(
      (item): item is CandidateEvidence => Boolean(item),
    );
    if (selected.length !== selectedIds.length) {
      throw new Error("One or more selected Career Evidence records no longer exist.");
    }
    if (selected.some((item) => !canEvidenceSupportFactualClaim(item))) {
      throw new Error("Only confirmed Career Evidence can enter a tailored resume.");
    }

    const candidateRank = new Map(
      plan.candidates.map((candidate, index) => [candidate.evidenceId, index] as const),
    );
    const ordered = [...selected].sort((left, right) => {
      const sectionDifference =
        resumeSectionRank(resumeSectionForEvidence(left)) -
        resumeSectionRank(resumeSectionForEvidence(right));
      if (sectionDifference) return sectionDifference;
      return (
        (candidateRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (candidateRank.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      );
    });

    const sections = Array.from(
      new Set(ordered.map((item) => resumeSectionForEvidence(item))),
    ).sort((left, right) => resumeSectionRank(left) - resumeSectionRank(right));

    const sourceStatementByEvidenceId = new Map<string, ResumeStatement>();
    for (const statement of sourceStatements) {
      for (const evidenceId of statement.evidenceIds) {
        if (!sourceStatementByEvidenceId.has(evidenceId)) {
          sourceStatementByEvidenceId.set(evidenceId, statement);
        }
      }
    }

    const id = `resume-projection-${randomUUID()}`;
    const now = new Date().toISOString();
    const projection: ResumeProjectionRecord = {
      id,
      jobId: request.jobId,
      context: source.context,
      pageFormat: source.pageFormat,
      sourceProjectionId: source.id,
      status: "draft",
      sections,
      selectedEvidenceIds: ordered.map((item) => item.id),
      templateId: source.templateId,
      contact: { ...source.contact, links: [...source.contact.links] },
      createdAt: now,
      updatedAt: now,
    };

    const statements: ResumeStatement[] = ordered.map((evidence, index) => {
      const sourceStatement = sourceStatementByEvidenceId.get(evidence.id);
      return {
        id: `resume-statement-${randomUUID()}`,
        projectionId: id,
        section: resumeSectionForEvidence(evidence),
        order: index,
        text: sourceStatement?.text ?? evidence.statement.trim(),
        evidenceIds: [evidence.id],
        generationMode: sourceStatement?.generationMode ?? "deterministic",
        userEdited: sourceStatement?.userEdited ?? false,
      };
    });

    await this.resumeRepository.createProjection(projection, statements);
    return projection;
  }
}
