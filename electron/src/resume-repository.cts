import { randomUUID } from "node:crypto";
import type {
  ApplicationArtifactPurpose,
  ResumeStatement,
} from "../../src/shared/contracts.js";
import type {
  ResumeArtifactRecord,
  ResumeArtifactSnapshot,
  ResumeContactSnapshot,
  ResumeProjectionRecord,
  ResumeTemplateId,
} from "../../src/shared/resume-contracts.js";
import { sql, SqliteClient, toSqlLiteral } from "./sqlite.cjs";

type ProjectionRow = {
  id: string;
  job_id: string | null;
  context: ResumeProjectionRecord["context"];
  page_format: ResumeProjectionRecord["pageFormat"];
  source_projection_id: string | null;
  status: ResumeProjectionRecord["status"];
  sections_json: string;
  selected_evidence_ids_json: string;
  template_id: ResumeTemplateId;
  contact_json: string;
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

type ArtifactRow = {
  id: string;
  projection_id: string;
  version: number;
  format: ResumeArtifactRecord["format"];
  managed_path: string;
  content_hash: string;
  page_count: number | null;
  truth_gate_result: string | null;
  parseability_result: string | null;
  relevance_review_result: string | null;
  projection_snapshot_json: string;
  created_at: string;
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

function parseContact(value: string): ResumeContactSnapshot {
  try {
    const parsed = JSON.parse(value) as Partial<ResumeContactSnapshot>;
    return {
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      links: Array.isArray(parsed.links)
        ? parsed.links.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return { fullName: "", email: "", phone: "", location: "", links: [] };
  }
}

function mapProjection(row: ProjectionRow): ResumeProjectionRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    context: row.context,
    pageFormat: row.page_format,
    sourceProjectionId: row.source_projection_id,
    status: row.status,
    sections: parseStringArray(row.sections_json),
    selectedEvidenceIds: parseStringArray(row.selected_evidence_ids_json),
    templateId: row.template_id,
    contact: parseContact(row.contact_json),
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

function parseSnapshot(value: string): ResumeArtifactSnapshot {
  return JSON.parse(value) as ResumeArtifactSnapshot;
}

function mapArtifact(row: ArtifactRow): ResumeArtifactRecord {
  return {
    id: row.id,
    projectionId: row.projection_id,
    version: row.version,
    format: row.format,
    managedPath: row.managed_path,
    contentHash: row.content_hash,
    pageCount: row.page_count,
    truthGateResult: row.truth_gate_result,
    parseabilityResult: row.parseability_result,
    relevanceReviewResult: row.relevance_review_result,
    projectionSnapshot: parseSnapshot(row.projection_snapshot_json),
    createdAt: row.created_at,
  };
}

const projectionSelect = `
  SELECT
    p.id,
    p.job_id,
    p.context,
    p.page_format,
    p.source_projection_id,
    p.status,
    p.sections_json,
    p.selected_evidence_ids_json,
    p.created_at,
    p.updated_at,
    m.template_id,
    m.contact_json
  FROM resume_projections p
  JOIN resume_projection_metadata m ON m.projection_id = p.id
`;

const artifactSelect = `
  SELECT
    a.id,
    a.projection_id,
    a.version,
    a.format,
    a.managed_path,
    a.content_hash,
    a.page_count,
    a.truth_gate_result,
    a.parseability_result,
    a.relevance_review_result,
    a.created_at,
    s.projection_snapshot_json
  FROM resume_artifacts a
  JOIN resume_artifact_snapshots s ON s.artifact_id = a.id
`;

export class ResumeRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  async createProjection(
    projection: ResumeProjectionRecord,
    statements: ResumeStatement[],
  ): Promise<ResumeProjectionRecord> {
    await this.sqlite.exec("BEGIN IMMEDIATE;");
    try {
      await this.sqlite.exec(sql`
        INSERT INTO resume_projections (
          id, job_id, context, page_format, source_projection_id, status,
          sections_json, selected_evidence_ids_json, created_at, updated_at
        ) VALUES (
          ${projection.id}, ${projection.jobId}, ${projection.context},
          ${projection.pageFormat}, ${projection.sourceProjectionId},
          ${projection.status}, ${JSON.stringify(projection.sections)},
          ${JSON.stringify(projection.selectedEvidenceIds)}, ${projection.createdAt},
          ${projection.updatedAt}
        );
      `);

      await this.sqlite.exec(sql`
        INSERT INTO resume_projection_metadata (
          projection_id, template_id, contact_json
        ) VALUES (
          ${projection.id}, ${projection.templateId}, ${JSON.stringify(projection.contact)}
        );
      `);

      for (const statement of statements) {
        await this.sqlite.exec(sql`
          INSERT INTO resume_statements (
            id, projection_id, section, display_order, text,
            evidence_ids_json, generation_mode, user_edited
          ) VALUES (
            ${statement.id}, ${statement.projectionId}, ${statement.section},
            ${statement.order}, ${statement.text},
            ${JSON.stringify(statement.evidenceIds)}, ${statement.generationMode},
            ${statement.userEdited}
          );
        `);
      }
      await this.sqlite.exec("COMMIT;");
    } catch (error) {
      await this.sqlite.exec("ROLLBACK;").catch(() => undefined);
      throw error;
    }

    const created = await this.getProjection(projection.id);
    if (!created) throw new Error("Failed to create resume projection");
    return created;
  }

  async listProjections(): Promise<ResumeProjectionRecord[]> {
    const rows = await this.sqlite.queryAll<ProjectionRow>(
      `${projectionSelect} ORDER BY p.updated_at DESC;`,
    );
    return rows.map(mapProjection);
  }

  async getProjection(id: string): Promise<ResumeProjectionRecord | null> {
    const rows = await this.sqlite.queryAll<ProjectionRow>(
      `${projectionSelect} WHERE p.id = ${toSqlLiteral(id)} LIMIT 1;`,
    );
    return rows[0] ? mapProjection(rows[0]) : null;
  }

  async listStatements(projectionId: string): Promise<ResumeStatement[]> {
    const rows = await this.sqlite.queryAll<StatementRow>(sql`
      SELECT * FROM resume_statements
      WHERE projection_id = ${projectionId}
      ORDER BY display_order ASC, id ASC;
    `);
    return rows.map(mapStatement);
  }

  async updateStatement(
    id: string,
    text: string,
  ): Promise<ResumeStatement> {
    const row = await this.sqlite.queryOne<StatementRow>(sql`
      UPDATE resume_statements
      SET text = ${text}, user_edited = 1
      WHERE id = ${id}
      RETURNING *;
    `);
    if (!row) throw new Error(`Resume statement ${id} not found`);
    return mapStatement(row);
  }

  async setProjectionStatus(
    id: string,
    status: ResumeProjectionRecord["status"],
  ): Promise<ResumeProjectionRecord> {
    await this.sqlite.exec(sql`
      UPDATE resume_projections
      SET status = ${status}, updated_at = ${new Date().toISOString()}
      WHERE id = ${id};
    `);
    const row = await this.getProjection(id);
    if (!row) throw new Error(`Resume projection ${id} not found`);
    return row;
  }

  async nextArtifactVersion(projectionId: string): Promise<number> {
    const row = await this.sqlite.queryOne<{ next_version: number }>(sql`
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM resume_artifacts
      WHERE projection_id = ${projectionId};
    `);
    return row?.next_version ?? 1;
  }

  async createArtifact(artifact: ResumeArtifactRecord): Promise<ResumeArtifactRecord> {
    await this.sqlite.exec("BEGIN IMMEDIATE;");
    try {
      await this.sqlite.exec(sql`
        INSERT INTO resume_artifacts (
          id, projection_id, version, format, managed_path, content_hash,
          page_count, truth_gate_result, parseability_result,
          relevance_review_result, created_at
        ) VALUES (
          ${artifact.id}, ${artifact.projectionId}, ${artifact.version},
          ${artifact.format}, ${artifact.managedPath}, ${artifact.contentHash},
          ${artifact.pageCount}, ${artifact.truthGateResult},
          ${artifact.parseabilityResult}, ${artifact.relevanceReviewResult},
          ${artifact.createdAt}
        );
      `);
      await this.sqlite.exec(sql`
        INSERT INTO resume_artifact_snapshots (
          artifact_id, projection_snapshot_json
        ) VALUES (
          ${artifact.id}, ${JSON.stringify(artifact.projectionSnapshot)}
        );
      `);
      await this.sqlite.exec("COMMIT;");
    } catch (error) {
      await this.sqlite.exec("ROLLBACK;").catch(() => undefined);
      throw error;
    }
    const created = await this.getArtifact(artifact.id);
    if (!created) throw new Error("Failed to create resume artifact");
    return created;
  }

  async listArtifacts(projectionId: string): Promise<ResumeArtifactRecord[]> {
    const rows = await this.sqlite.queryAll<ArtifactRow>(
      `${artifactSelect} WHERE a.projection_id = ${toSqlLiteral(projectionId)} ORDER BY a.version DESC, a.created_at DESC;`,
    );
    return rows.map(mapArtifact);
  }

  async getArtifact(id: string): Promise<ResumeArtifactRecord | null> {
    const rows = await this.sqlite.queryAll<ArtifactRow>(
      `${artifactSelect} WHERE a.id = ${toSqlLiteral(id)} LIMIT 1;`,
    );
    return rows[0] ? mapArtifact(rows[0]) : null;
  }

  async linkArtifactToApplication(
    applicationId: string,
    resumeArtifactId: string,
    purpose: ApplicationArtifactPurpose,
  ): Promise<void> {
    await this.sqlite.exec(sql`
      INSERT OR IGNORE INTO application_artifact_links (
        id, application_id, resume_artifact_id, purpose, recorded_at
      ) VALUES (
        ${`application-artifact-${randomUUID()}`}, ${applicationId},
        ${resumeArtifactId}, ${purpose}, ${new Date().toISOString()}
      );
    `);
  }
}
