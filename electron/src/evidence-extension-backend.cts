import { randomUUID } from "node:crypto";
import type {
  CandidateEvidence,
  EvidenceVerificationState,
} from "../../src/shared/contracts.js";
import type {
  EvidenceLineage,
  EvidenceMetadata,
  EvidenceReference,
  EvidenceReferenceInput,
  EvidenceSupersedeInput,
} from "../../src/shared/evidence-extensions.js";
import { CareerEvidenceRepository } from "./career-evidence-repository.cjs";
import { sql, SqliteClient } from "./sqlite.cjs";

type EvidenceStateRow = {
  id: string;
  verification_state: EvidenceVerificationState;
};

type ReferenceRow = {
  id: string;
  evidence_id: string;
  kind: EvidenceReference["kind"];
  label: string | null;
  value: string;
  created_at: string;
};

type LineageRow = {
  id: string;
  predecessor_evidence_id: string;
  successor_evidence_id: string;
  relation: EvidenceLineage["relation"];
  created_at: string;
};

function mapReference(row: ReferenceRow): EvidenceReference {
  return {
    id: row.id,
    evidenceId: row.evidence_id,
    kind: row.kind,
    label: row.label,
    value: row.value,
    createdAt: row.created_at,
  };
}

function mapLineage(row: LineageRow): EvidenceLineage {
  return {
    id: row.id,
    predecessorEvidenceId: row.predecessor_evidence_id,
    successorEvidenceId: row.successor_evidence_id,
    relation: row.relation,
    createdAt: row.created_at,
  };
}

export class EvidenceExtensionBackend {
  private readonly sqlite: SqliteClient;
  private readonly evidenceRepository: CareerEvidenceRepository;

  constructor(options: { databasePath: string; sqliteBinaryPath: string }) {
    this.sqlite = new SqliteClient(options.databasePath, options.sqliteBinaryPath);
    this.evidenceRepository = new CareerEvidenceRepository(this.sqlite);
  }

  async listMetadata(): Promise<EvidenceMetadata[]> {
    const evidenceRows = await this.sqlite.queryAll<{ id: string }>(
      "SELECT id FROM candidate_evidence ORDER BY created_at DESC;",
    );
    const referenceRows = await this.sqlite.queryAll<ReferenceRow>(
      "SELECT * FROM evidence_references ORDER BY created_at ASC;",
    );
    const lineageRows = await this.sqlite.queryAll<LineageRow>(
      "SELECT * FROM evidence_lineage ORDER BY created_at ASC;",
    );

    return evidenceRows.map(({ id }) => ({
      evidenceId: id,
      references: referenceRows
        .filter((row) => row.evidence_id === id)
        .map(mapReference),
      lineage: lineageRows
        .filter(
          (row) =>
            row.predecessor_evidence_id === id || row.successor_evidence_id === id,
        )
        .map(mapLineage),
    }));
  }

  async setReferences(
    evidenceId: string,
    references: EvidenceReferenceInput[],
  ): Promise<EvidenceReference[]> {
    const current = await this.sqlite.queryOne<EvidenceStateRow>(
      sql`SELECT id, verification_state FROM candidate_evidence WHERE id = ${evidenceId} LIMIT 1;`,
    );
    if (!current) throw new Error(`Evidence ${evidenceId} not found`);
    if (
      current.verification_state !== "user-authored" &&
      current.verification_state !== "user-confirmed"
    ) {
      throw new Error("References can only be attached to confirmed Career Evidence");
    }

    const now = new Date().toISOString();
    const statements = [sql`DELETE FROM evidence_references WHERE evidence_id = ${evidenceId};`];
    for (const reference of references) {
      statements.push(sql`
        INSERT INTO evidence_references (
          id, evidence_id, kind, label, value, created_at
        ) VALUES (
          ${`reference-${randomUUID()}`}, ${evidenceId}, ${reference.kind},
          ${reference.label ?? null}, ${reference.value}, ${now}
        );
      `);
    }
    await this.sqlite.transaction(statements);

    const rows = await this.sqlite.queryAll<ReferenceRow>(sql`
      SELECT * FROM evidence_references
      WHERE evidence_id = ${evidenceId}
      ORDER BY created_at ASC;
    `);
    return rows.map(mapReference);
  }

  async supersedeEvidence(
    predecessorId: string,
    input: EvidenceSupersedeInput,
  ): Promise<CandidateEvidence> {
    const current = await this.sqlite.queryOne<EvidenceStateRow>(
      sql`SELECT id, verification_state FROM candidate_evidence WHERE id = ${predecessorId} LIMIT 1;`,
    );
    if (!current) throw new Error(`Evidence ${predecessorId} not found`);
    if (
      current.verification_state !== "user-authored" &&
      current.verification_state !== "user-confirmed"
    ) {
      throw new Error("Only current confirmed Career Evidence can be replaced");
    }

    const successorId = `evidence-${randomUUID()}`;
    const lineageId = `lineage-${randomUUID()}`;
    const now = new Date().toISOString();
    const credentialExpression =
      input.subjectType === "credential" ? "credential_json" : "NULL";

    await this.sqlite.transaction([
      `
        INSERT INTO candidate_evidence (
          id, subject_type, organization, title_or_name, start_date, end_date,
          statement, action, context, skills_json, methods_or_tools_json,
          scope_json, outcomes_json, metrics_json, verification_state, confidence,
          created_at, updated_at, credential_json
        )
        SELECT
          ${sql`${successorId}`}, ${sql`${input.subjectType}`}, organization, title_or_name,
          start_date, end_date, ${sql`${input.statement}`}, action, context,
          skills_json, methods_or_tools_json, scope_json, outcomes_json, metrics_json,
          'user-authored', NULL, ${sql`${now}`}, ${sql`${now}`}, ${credentialExpression}
        FROM candidate_evidence
        WHERE id = ${sql`${predecessorId}`};
      `,
      sql`
        UPDATE candidate_evidence
        SET verification_state = 'rejected', updated_at = ${now}
        WHERE id = ${predecessorId};
      `,
      sql`
        INSERT INTO evidence_lineage (
          id, predecessor_evidence_id, successor_evidence_id, relation, created_at
        ) VALUES (
          ${lineageId}, ${predecessorId}, ${successorId}, 'supersedes', ${now}
        );
      `,
      `
        INSERT INTO evidence_references (
          id, evidence_id, kind, label, value, created_at
        )
        SELECT
          'reference-' || lower(hex(randomblob(16))),
          ${sql`${successorId}`}, kind, label, value, ${sql`${now}`}
        FROM evidence_references
        WHERE evidence_id = ${sql`${predecessorId}`};
      `,
    ]);

    const successor = await this.evidenceRepository.getEvidenceById(successorId);
    if (!successor) throw new Error("Replacement Career Evidence was not created");
    return successor;
  }
}
