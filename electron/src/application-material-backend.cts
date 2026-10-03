import { createHash, randomUUID } from "node:crypto";
import type {
  ApplicationMaterialArtifact,
  ApplicationMaterialDetail,
  ApplicationMaterialGenerateInput,
  ApplicationMaterialKind,
  ApplicationMaterialProjection,
} from "../../src/shared/application-materials.js";
import type { EvidenceVerificationState } from "../../src/shared/contracts.js";
import { sql, SqliteClient, toSqlLiteral } from "./sqlite.cjs";

const APPLICATION_MATERIAL_MIGRATION_VERSION = 1003;
const APPLICATION_MATERIAL_MIGRATION_NAME = "application_material_projections";

const APPLICATION_MATERIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS application_material_projections (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind = 'cover-letter'),
    evidence_ids_json TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (application_id, kind)
  );

  CREATE INDEX IF NOT EXISTS idx_application_material_projections_application
    ON application_material_projections(application_id, kind);

  CREATE TABLE IF NOT EXISTS application_material_artifacts (
    id TEXT PRIMARY KEY,
    projection_id TEXT NOT NULL REFERENCES application_material_projections(id) ON DELETE RESTRICT,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind = 'cover-letter'),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose = 'submitted'),
    recorded_at TEXT NOT NULL,
    UNIQUE (application_id, kind, version)
  );

  CREATE INDEX IF NOT EXISTS idx_application_material_artifacts_application
    ON application_material_artifacts(application_id, kind, version DESC);
`;

type ProjectionRow = {
  id: string;
  application_id: string;
  kind: ApplicationMaterialKind;
  evidence_ids_json: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  id: string;
  projection_id: string;
  application_id: string;
  kind: ApplicationMaterialKind;
  version: number;
  content: string;
  content_hash: string;
  purpose: "submitted";
  recorded_at: string;
};

type ApplicationRow = {
  id: string;
  title: string;
  company_name: string;
};

type EvidenceRow = {
  id: string;
  statement: string;
  verification_state: EvidenceVerificationState;
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

function isCurrentEvidence(state: EvidenceVerificationState): boolean {
  return state === "user-authored" || state === "user-confirmed";
}

function composeCoverLetter(input: {
  title: string;
  companyName: string;
  fullName: string | null;
  evidence: EvidenceRow[];
}): string {
  const signoff = input.fullName?.trim() || "Applicant";
  const evidenceLines = input.evidence.map((item) => `• ${item.statement.trim()}`).join("\n");
  return [
    "Dear Hiring Team,",
    "",
    `Please consider my application for the ${input.title} role at ${input.companyName}. The following experience is drawn from Career Evidence I have confirmed in Job Ranger.`,
    "",
    evidenceLines,
    "",
    `I would welcome the opportunity to discuss how this experience applies to the ${input.title} role.`,
    "",
    "Sincerely,",
    signoff,
  ].join("\n");
}

function mapArtifact(row: ArtifactRow): ApplicationMaterialArtifact {
  return {
    id: row.id,
    projectionId: row.projection_id,
    applicationId: row.application_id,
    kind: row.kind,
    version: row.version,
    content: row.content,
    contentHash: row.content_hash,
    purpose: row.purpose,
    recordedAt: row.recorded_at,
  };
}

export class ApplicationMaterialBackend {
  private readonly sqlite: SqliteClient;

  constructor(options: { databasePath: string; sqliteBinaryPath: string }) {
    this.sqlite = new SqliteClient(options.databasePath, options.sqliteBinaryPath);
  }

  async initialize(): Promise<void> {
    await this.sqlite.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);",
    );
    const existing = await this.sqlite.queryOne<{ version: number }>(sql`
      SELECT version FROM schema_migrations
      WHERE version = ${APPLICATION_MATERIAL_MIGRATION_VERSION}
      LIMIT 1;
    `);
    if (existing) return;

    await this.sqlite.exec(APPLICATION_MATERIAL_SCHEMA);
    await this.sqlite.exec(sql`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (
        ${APPLICATION_MATERIAL_MIGRATION_VERSION},
        ${APPLICATION_MATERIAL_MIGRATION_NAME},
        ${new Date().toISOString()}
      );
    `);
  }

  async get(applicationId: string): Promise<ApplicationMaterialDetail> {
    const application = await this.sqlite.queryOne<{ id: string }>(sql`
      SELECT id FROM applications WHERE id = ${applicationId} LIMIT 1;
    `);
    if (!application) throw new Error(`Application ${applicationId} not found`);

    const projectionRow = await this.sqlite.queryOne<ProjectionRow>(sql`
      SELECT * FROM application_material_projections
      WHERE application_id = ${applicationId} AND kind = 'cover-letter'
      LIMIT 1;
    `);
    const artifacts = await this.sqlite.queryAll<ArtifactRow>(sql`
      SELECT * FROM application_material_artifacts
      WHERE application_id = ${applicationId} AND kind = 'cover-letter'
      ORDER BY version DESC, recorded_at DESC, id DESC;
    `);

    return {
      applicationId,
      projection: projectionRow ? await this.mapProjection(projectionRow) : null,
      artifacts: artifacts.map(mapArtifact),
    };
  }

  async generateCoverLetter(
    input: ApplicationMaterialGenerateInput,
  ): Promise<ApplicationMaterialProjection> {
    const application = await this.sqlite.queryOne<ApplicationRow>(sql`
      SELECT id, title, company_name
      FROM applications
      WHERE id = ${input.applicationId}
      LIMIT 1;
    `);
    if (!application) throw new Error(`Application ${input.applicationId} not found`);
    if (input.evidenceIds.length === 0) {
      throw new Error("Select at least one confirmed Career Evidence item for the cover letter");
    }

    const evidenceRows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT id, statement, verification_state
      FROM candidate_evidence
      WHERE id IN (${input.evidenceIds.map(toSqlLiteral).join(", ")});
    `);
    if (evidenceRows.length !== input.evidenceIds.length) {
      throw new Error("One or more selected Career Evidence items no longer exist");
    }
    const byId = new Map(evidenceRows.map((item) => [item.id, item]));
    const evidence = input.evidenceIds.map((id) => byId.get(id)).filter((item): item is EvidenceRow => Boolean(item));
    if (evidence.some((item) => !isCurrentEvidence(item.verification_state))) {
      throw new Error("Cover letters can only be generated from current confirmed Career Evidence");
    }

    const profile = await this.sqlite.queryOne<{ full_name: string }>(
      "SELECT full_name FROM career_profile WHERE id = 1 LIMIT 1;",
    );
    const content = composeCoverLetter({
      title: application.title,
      companyName: application.company_name,
      fullName: profile?.full_name ?? null,
      evidence,
    });
    const now = new Date().toISOString();
    const newId = `application-material-${randomUUID()}`;
    const row = await this.sqlite.queryOne<ProjectionRow>(sql`
      INSERT INTO application_material_projections (
        id, application_id, kind, evidence_ids_json, content, created_at, updated_at
      ) VALUES (
        ${newId}, ${application.id}, ${"cover-letter"},
        ${JSON.stringify(input.evidenceIds)}, ${content}, ${now}, ${now}
      )
      ON CONFLICT(application_id, kind) DO UPDATE SET
        evidence_ids_json = excluded.evidence_ids_json,
        content = excluded.content,
        updated_at = excluded.updated_at
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to generate cover letter projection");
    return this.mapProjection(row);
  }

  async recordSubmitted(projectionId: string): Promise<ApplicationMaterialArtifact> {
    const projectionRow = await this.sqlite.queryOne<ProjectionRow>(sql`
      SELECT * FROM application_material_projections
      WHERE id = ${projectionId}
      LIMIT 1;
    `);
    if (!projectionRow) throw new Error(`Application material ${projectionId} not found`);
    const projection = await this.mapProjection(projectionRow);
    if (projection.staleEvidenceIds.length > 0) {
      throw new Error(
        "This cover letter is stale because linked Career Evidence changed. Regenerate it before recording a submitted version.",
      );
    }
    const nextVersion = await this.sqlite.queryOne<{ next_version: number }>(sql`
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM application_material_artifacts
      WHERE application_id = ${projection.applicationId}
        AND kind = ${projection.kind};
    `);
    const version = nextVersion?.next_version ?? 1;
    const recordedAt = new Date().toISOString();
    const contentHash = createHash("sha256").update(projection.content).digest("hex");
    const row = await this.sqlite.queryOne<ArtifactRow>(sql`
      INSERT INTO application_material_artifacts (
        id, projection_id, application_id, kind, version, content,
        content_hash, purpose, recorded_at
      ) VALUES (
        ${`application-material-artifact-${randomUUID()}`}, ${projection.id},
        ${projection.applicationId}, ${projection.kind}, ${version}, ${projection.content},
        ${contentHash}, ${"submitted"}, ${recordedAt}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to record submitted application material");
    return mapArtifact(row);
  }

  private async mapProjection(row: ProjectionRow): Promise<ApplicationMaterialProjection> {
    const evidenceIds = parseStringArray(row.evidence_ids_json);
    const states = evidenceIds.length > 0
      ? await this.sqlite.queryAll<{ id: string; verification_state: EvidenceVerificationState }>(`
          SELECT id, verification_state
          FROM candidate_evidence
          WHERE id IN (${evidenceIds.map(toSqlLiteral).join(", ")});
        `)
      : [];
    const byId = new Map(states.map((item) => [item.id, item.verification_state]));
    const staleEvidenceIds = evidenceIds.filter((id) => {
      const state = byId.get(id);
      return !state || !isCurrentEvidence(state);
    });
    return {
      id: row.id,
      applicationId: row.application_id,
      kind: row.kind,
      evidenceIds,
      content: row.content,
      staleEvidenceIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
