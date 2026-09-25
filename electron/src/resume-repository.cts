import { randomUUID } from "node:crypto";
import type {
  CandidateEvidence,
  ResumeProjection,
  ResumeStatement,
} from "../../src/shared/contracts.js";
import { sql, SqliteClient } from "./sqlite.cjs";

type ProjectionRow = {
  id: string;
  job_id: string | null;
  context: ResumeProjection["context"];
  page_format: ResumeProjection["pageFormat"];
  source_projection_id: string | null;
  status: ResumeProjection["status"];
  sections_json: string;
  selected_evidence_ids_json: string;
  created_at: string;
  updated_at: string;
};

type StatementRow = {
  id: string;
  projection_id: string;
  section: string;
  display_order: number;
  text: string;
  evidence_ids_json: string;
  generation_mode: ResumeStatement["generationMode"];
  user_edited: number;
};

type EvidenceRow = {
  id: string;
  subject_type: CandidateEvidence["subjectType"];
  organization: string | null;
  title_or_name: string | null;
  start_date: string | null;
  end_date: string | null;
  statement: string;
  action: string | null;
  context: string | null;
  skills_json: string;
  methods_or_tools_json: string;
  scope_json: string;
  outcomes_json: string;
  metrics_json: string;
  verification_state: CandidateEvidence["verificationState"];
  confidence: number | null;
  created_at: string;
  updated_at: string;
};

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mapProjection(row: ProjectionRow): ResumeProjection {
  return {
    id: row.id,
    jobId: row.job_id,
    context: row.context,
    pageFormat: row.page_format,
    sourceProjectionId: row.source_projection_id,
    status: row.status,
    sections: parseStringArray(row.sections_json),
    selectedEvidenceIds: parseStringArray(row.selected_evidence_ids_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStatement(row: StatementRow): ResumeStatement {
  return {
    id: row.id,
    projectionId: row.projection_id,
    section: row.section,
    order: row.display_order,
    text: row.text,
    evidenceIds: parseStringArray(row.evidence_ids_json),
    generationMode: row.generation_mode,
    userEdited: Boolean(row.user_edited),
  };
}

function mapEvidence(row: EvidenceRow): CandidateEvidence {
  return {
    id: row.id,
    subjectType: row.subject_type,
    organization: row.organization,
    titleOrName: row.title_or_name,
    startDate: row.start_date,
    endDate: row.end_date,
    statement: row.statement,
    action: row.action,
    context: row.context,
    skills: parseStringArray(row.skills_json),
    methodsOrTools: parseStringArray(row.methods_or_tools_json),
    scope: parseStringArray(row.scope_json),
    outcomes: parseStringArray(row.outcomes_json),
    metrics: parseStringArray(row.metrics_json),
    verificationState: row.verification_state,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ResumeRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  async listConfirmedEvidence(): Promise<CandidateEvidence[]> {
    const rows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT * FROM candidate_evidence
      WHERE verification_state IN ('user-confirmed', 'user-authored')
      ORDER BY updated_at DESC, created_at DESC;
    `);
    return rows.map(mapEvidence);
  }

  async getEvidenceByIds(ids: readonly string[]): Promise<CandidateEvidence[]> {
    const all = await this.listConfirmedEvidence();
    const wanted = new Set(ids);
    return all.filter((item) => wanted.has(item.id));
  }

  async listProjections(jobId: string): Promise<ResumeProjection[]> {
    const rows = await this.sqlite.queryAll<ProjectionRow>(sql`
      SELECT * FROM resume_projections
      WHERE job_id = ${jobId}
      ORDER BY created_at DESC;
    `);
    return rows.map(mapProjection);
  }

  async getProjection(id: string): Promise<ResumeProjection | null> {
    const row = await this.sqlite.queryOne<ProjectionRow>(
      sql`SELECT * FROM resume_projections WHERE id = ${id} LIMIT 1;`,
    );
    return row ? mapProjection(row) : null;
  }

  async listStatements(projectionId: string): Promise<ResumeStatement[]> {
    const rows = await this.sqlite.queryAll<StatementRow>(sql`
      SELECT * FROM resume_statements
      WHERE projection_id = ${projectionId}
      ORDER BY display_order ASC, id ASC;
    `);
    return rows.map(mapStatement);
  }

  async createProjection(
    projection: ResumeProjection,
    statements: readonly ResumeStatement[],
  ): Promise<ResumeProjection> {
    const row = await this.sqlite.queryOne<ProjectionRow>(sql`
      INSERT INTO resume_projections (
        id, job_id, context, page_format, source_projection_id, status,
        sections_json, selected_evidence_ids_json, created_at, updated_at
      ) VALUES (
        ${projection.id}, ${projection.jobId}, ${projection.context},
        ${projection.pageFormat}, ${projection.sourceProjectionId}, ${projection.status},
        ${JSON.stringify(projection.sections)}, ${JSON.stringify(projection.selectedEvidenceIds)},
        ${projection.createdAt}, ${projection.updatedAt}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to create resume projection");

    try {
      for (const statement of statements) {
        await this.sqlite.exec(sql`
          INSERT INTO resume_statements (
            id, projection_id, section, display_order, text,
            evidence_ids_json, generation_mode, user_edited
          ) VALUES (
            ${statement.id}, ${statement.projectionId}, ${statement.section},
            ${statement.order}, ${statement.text}, ${JSON.stringify(statement.evidenceIds)},
            ${statement.generationMode}, ${statement.userEdited}
          );
        `);
      }
    } catch (error) {
      await this.sqlite.exec(sql`DELETE FROM resume_projections WHERE id = ${projection.id};`);
      throw error;
    }

    return mapProjection(row);
  }

  async markReviewed(id: string): Promise<ResumeProjection> {
    const row = await this.sqlite.queryOne<ProjectionRow>(sql`
      UPDATE resume_projections
      SET status = 'reviewed', updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
      RETURNING *;
    `);
    if (!row) throw new Error(`Resume projection ${id} not found`);
    return mapProjection(row);
  }

  makeProjectionId(): string {
    return `projection-${randomUUID()}`;
  }

  makeStatementId(): string {
    return `statement-${randomUUID()}`;
  }
}
