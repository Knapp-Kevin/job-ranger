import { randomUUID } from "node:crypto";
import type {
  CandidateEvidence,
  CandidateEvidenceReviewItem,
  EvidenceReviewUpdate,
  EvidenceSourceLink,
  EvidenceReviewSource,
  ExtractionSnapshot,
  SourceArtifact,
} from "../../src/shared/contracts.js";
import { sql, SqliteClient } from "./sqlite.cjs";

type SourceArtifactRow = {
  id: string;
  kind: SourceArtifact["kind"];
  original_name: string;
  media_type: string;
  detected_format: string | null;
  content_hash: string;
  managed_path: string;
  byte_size: number;
  imported_at: string;
  parser_id: string | null;
  parser_version: string | null;
  extraction_state: SourceArtifact["extractionState"];
  warnings_json: string;
};

type ExtractionSnapshotRow = {
  id: string;
  source_artifact_id: string;
  parser_id: string;
  parser_version: string;
  raw_text: string;
  structured_payload_json: string | null;
  warnings_json: string;
  created_at: string;
};

type CandidateEvidenceRow = {
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

type EvidenceSourceRow = {
  id: string;
  evidence_id: string;
  source_artifact_id: string;
  original_name: string;
  extraction_snapshot_id: string | null;
  source_locator: string | null;
  source_text: string | null;
  relation: EvidenceSourceLink["relation"];
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

function parseUnknown(value: string | null): unknown | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function mapArtifact(row: SourceArtifactRow): SourceArtifact {
  return {
    id: row.id,
    kind: row.kind,
    originalName: row.original_name,
    mediaType: row.media_type,
    detectedFormat: row.detected_format,
    contentHash: row.content_hash,
    managedPath: row.managed_path,
    byteSize: row.byte_size,
    importedAt: row.imported_at,
    parserId: row.parser_id,
    parserVersion: row.parser_version,
    extractionState: row.extraction_state,
    warnings: parseStringArray(row.warnings_json),
  };
}

function mapSnapshot(row: ExtractionSnapshotRow): ExtractionSnapshot {
  return {
    id: row.id,
    sourceArtifactId: row.source_artifact_id,
    parserId: row.parser_id,
    parserVersion: row.parser_version,
    rawText: row.raw_text,
    structuredPayload: parseUnknown(row.structured_payload_json),
    warnings: parseStringArray(row.warnings_json),
    createdAt: row.created_at,
  };
}

function mapEvidence(row: CandidateEvidenceRow): CandidateEvidence {
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

function mapReviewSource(row: EvidenceSourceRow): EvidenceReviewSource {
  return {
    sourceArtifactId: row.source_artifact_id,
    originalName: row.original_name,
    extractionSnapshotId: row.extraction_snapshot_id,
    sourceLocator: row.source_locator,
    sourceText: row.source_text,
    relation: row.relation,
  };
}

export class CareerEvidenceRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  async listSourceArtifacts(): Promise<SourceArtifact[]> {
    const rows = await this.sqlite.queryAll<SourceArtifactRow>(
      "SELECT * FROM source_artifacts ORDER BY imported_at DESC;",
    );
    return rows.map(mapArtifact);
  }

  async getSourceArtifactById(id: string): Promise<SourceArtifact | null> {
    const row = await this.sqlite.queryOne<SourceArtifactRow>(
      sql`SELECT * FROM source_artifacts WHERE id = ${id} LIMIT 1;`,
    );
    return row ? mapArtifact(row) : null;
  }

  async getSourceArtifactByHash(contentHash: string): Promise<SourceArtifact | null> {
    const row = await this.sqlite.queryOne<SourceArtifactRow>(
      sql`SELECT * FROM source_artifacts WHERE content_hash = ${contentHash} LIMIT 1;`,
    );
    return row ? mapArtifact(row) : null;
  }

  async createSourceArtifact(artifact: SourceArtifact): Promise<SourceArtifact> {
    const row = await this.sqlite.queryOne<SourceArtifactRow>(sql`
      INSERT INTO source_artifacts (
        id, kind, original_name, media_type, detected_format, content_hash,
        managed_path, byte_size, imported_at, parser_id, parser_version,
        extraction_state, warnings_json
      ) VALUES (
        ${artifact.id}, ${artifact.kind}, ${artifact.originalName}, ${artifact.mediaType},
        ${artifact.detectedFormat}, ${artifact.contentHash}, ${artifact.managedPath},
        ${artifact.byteSize}, ${artifact.importedAt}, ${artifact.parserId},
        ${artifact.parserVersion}, ${artifact.extractionState},
        ${JSON.stringify(artifact.warnings)}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to create source artifact");
    return mapArtifact(row);
  }

  async updateSourceArtifactExtraction(
    id: string,
    update: Pick<
      SourceArtifact,
      | "detectedFormat"
      | "parserId"
      | "parserVersion"
      | "extractionState"
      | "warnings"
    >,
  ): Promise<SourceArtifact> {
    const row = await this.sqlite.queryOne<SourceArtifactRow>(sql`
      UPDATE source_artifacts
      SET
        detected_format = ${update.detectedFormat},
        parser_id = ${update.parserId},
        parser_version = ${update.parserVersion},
        extraction_state = ${update.extractionState},
        warnings_json = ${JSON.stringify(update.warnings)}
      WHERE id = ${id}
      RETURNING *;
    `);
    if (!row) throw new Error(`Source artifact ${id} not found`);
    return mapArtifact(row);
  }

  async createExtractionSnapshot(
    snapshot: ExtractionSnapshot,
  ): Promise<ExtractionSnapshot> {
    const row = await this.sqlite.queryOne<ExtractionSnapshotRow>(sql`
      INSERT INTO extraction_snapshots (
        id, source_artifact_id, parser_id, parser_version, raw_text,
        structured_payload_json, warnings_json, created_at
      ) VALUES (
        ${snapshot.id}, ${snapshot.sourceArtifactId}, ${snapshot.parserId},
        ${snapshot.parserVersion}, ${snapshot.rawText},
        ${snapshot.structuredPayload === null ? null : JSON.stringify(snapshot.structuredPayload)},
        ${JSON.stringify(snapshot.warnings)}, ${snapshot.createdAt}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to create extraction snapshot");
    return mapSnapshot(row);
  }

  async getLatestExtractionSnapshot(
    sourceArtifactId: string,
  ): Promise<ExtractionSnapshot | null> {
    const row = await this.sqlite.queryOne<ExtractionSnapshotRow>(sql`
      SELECT * FROM extraction_snapshots
      WHERE source_artifact_id = ${sourceArtifactId}
      ORDER BY created_at DESC
      LIMIT 1;
    `);
    return row ? mapSnapshot(row) : null;
  }

  async createEvidenceProposal(
    evidence: CandidateEvidence,
    link: Omit<EvidenceSourceLink, "id" | "evidenceId" | "createdAt">,
  ): Promise<CandidateEvidence> {
    const inserted = await this.sqlite.queryOne<CandidateEvidenceRow>(sql`
      INSERT INTO candidate_evidence (
        id, subject_type, organization, title_or_name, start_date, end_date,
        statement, action, context, skills_json, methods_or_tools_json,
        scope_json, outcomes_json, metrics_json, verification_state, confidence,
        created_at, updated_at
      ) VALUES (
        ${evidence.id}, ${evidence.subjectType}, ${evidence.organization},
        ${evidence.titleOrName}, ${evidence.startDate}, ${evidence.endDate},
        ${evidence.statement}, ${evidence.action}, ${evidence.context},
        ${JSON.stringify(evidence.skills)}, ${JSON.stringify(evidence.methodsOrTools)},
        ${JSON.stringify(evidence.scope)}, ${JSON.stringify(evidence.outcomes)},
        ${JSON.stringify(evidence.metrics)}, ${evidence.verificationState},
        ${evidence.confidence}, ${evidence.createdAt}, ${evidence.updatedAt}
      )
      RETURNING *;
    `);
    if (!inserted) throw new Error("Failed to create candidate evidence");

    await this.sqlite.exec(sql`
      INSERT INTO evidence_source_links (
        id, evidence_id, source_artifact_id, extraction_snapshot_id,
        source_locator, source_text, relation, created_at
      ) VALUES (
        ${`link-${randomUUID()}`}, ${evidence.id}, ${link.sourceArtifactId},
        ${link.extractionSnapshotId}, ${link.sourceLocator}, ${link.sourceText},
        ${link.relation}, ${evidence.createdAt}
      );
    `);

    return mapEvidence(inserted);
  }

  async getEvidenceById(id: string): Promise<CandidateEvidence | null> {
    const row = await this.sqlite.queryOne<CandidateEvidenceRow>(
      sql`SELECT * FROM candidate_evidence WHERE id = ${id} LIMIT 1;`,
    );
    return row ? mapEvidence(row) : null;
  }

  async listEvidenceForArtifact(sourceArtifactId: string): Promise<CandidateEvidence[]> {
    const rows = await this.sqlite.queryAll<CandidateEvidenceRow>(sql`
      SELECT DISTINCT e.*
      FROM candidate_evidence e
      JOIN evidence_source_links l ON l.evidence_id = e.id
      WHERE l.source_artifact_id = ${sourceArtifactId}
      ORDER BY e.created_at ASC;
    `);
    return rows.map(mapEvidence);
  }

  async listEvidenceReviewItems(): Promise<CandidateEvidenceReviewItem[]> {
    const evidenceRows = await this.sqlite.queryAll<CandidateEvidenceRow>(
      "SELECT * FROM candidate_evidence ORDER BY created_at DESC;",
    );
    const sourceRows = await this.sqlite.queryAll<EvidenceSourceRow>(`
      SELECT
        l.id,
        l.evidence_id,
        l.source_artifact_id,
        a.original_name,
        l.extraction_snapshot_id,
        l.source_locator,
        l.source_text,
        l.relation,
        l.created_at
      FROM evidence_source_links l
      JOIN source_artifacts a ON a.id = l.source_artifact_id
      ORDER BY l.created_at ASC;
    `);

    const sourcesByEvidence = new Map<string, EvidenceReviewSource[]>();
    for (const row of sourceRows) {
      const existing = sourcesByEvidence.get(row.evidence_id) ?? [];
      existing.push(mapReviewSource(row));
      sourcesByEvidence.set(row.evidence_id, existing);
    }

    return evidenceRows.map((row) => ({
      evidence: mapEvidence(row),
      sources: sourcesByEvidence.get(row.id) ?? [],
    }));
  }

  async reviewEvidence(
    id: string,
    update: EvidenceReviewUpdate,
  ): Promise<CandidateEvidence> {
    const current = await this.getEvidenceById(id);
    if (!current) throw new Error(`Evidence ${id} not found`);

    const nextStatement =
      update.action === "edit" ? (update.statement ?? "").trim() : current.statement;
    if (update.action === "edit" && !nextStatement) {
      throw new Error("Edited evidence statement cannot be empty");
    }

    const verificationState =
      update.action === "reject" ? "rejected" : "user-confirmed";
    const row = await this.sqlite.queryOne<CandidateEvidenceRow>(sql`
      UPDATE candidate_evidence
      SET
        subject_type = ${update.subjectType ?? current.subjectType},
        statement = ${nextStatement},
        verification_state = ${verificationState},
        updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
      RETURNING *;
    `);
    if (!row) throw new Error(`Failed to review evidence ${id}`);
    return mapEvidence(row);
  }

  async mergeEvidence(
    sourceId: string,
    targetId: string,
  ): Promise<CandidateEvidence> {
    if (sourceId === targetId) {
      throw new Error("Evidence cannot be merged into itself");
    }

    const source = await this.getEvidenceById(sourceId);
    const target = await this.getEvidenceById(targetId);
    if (!source || !target) throw new Error("Merge evidence record not found");
    if (
      target.verificationState !== "user-confirmed" &&
      target.verificationState !== "user-authored"
    ) {
      throw new Error("Evidence can only be merged into a confirmed fact");
    }
    if (source.verificationState === "rejected") {
      throw new Error("Rejected evidence cannot be merged");
    }

    const now = new Date().toISOString();
    await this.sqlite.exec(sql`
      BEGIN IMMEDIATE;
      INSERT INTO evidence_source_links (
        id, evidence_id, source_artifact_id, extraction_snapshot_id,
        source_locator, source_text, relation, created_at
      )
      SELECT
        'link-' || lower(hex(randomblob(16))),
        ${targetId},
        source_artifact_id,
        extraction_snapshot_id,
        source_locator,
        source_text,
        'supports',
        ${now}
      FROM evidence_source_links source_link
      WHERE source_link.evidence_id = ${sourceId}
        AND NOT EXISTS (
          SELECT 1
          FROM evidence_source_links target_link
          WHERE target_link.evidence_id = ${targetId}
            AND target_link.source_artifact_id = source_link.source_artifact_id
            AND COALESCE(target_link.extraction_snapshot_id, '') = COALESCE(source_link.extraction_snapshot_id, '')
            AND COALESCE(target_link.source_locator, '') = COALESCE(source_link.source_locator, '')
            AND COALESCE(target_link.source_text, '') = COALESCE(source_link.source_text, '')
        );
      UPDATE candidate_evidence
      SET verification_state = 'rejected', updated_at = ${now}
      WHERE id = ${sourceId};
      UPDATE candidate_evidence
      SET updated_at = ${now}
      WHERE id = ${targetId};
      COMMIT;
    `);

    const merged = await this.getEvidenceById(targetId);
    if (!merged) throw new Error(`Merged evidence ${targetId} not found`);
    return merged;
  }
}
