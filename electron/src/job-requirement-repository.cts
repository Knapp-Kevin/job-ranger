import type {
  CandidateEvidence,
  JobRequirement,
  JobRequirementCoverageItem,
  RequirementEvidenceMap,
} from "../../src/shared/contracts.js";
import { sql, SqliteClient } from "./sqlite.cjs";
import type {
  DeterministicMappingDraft,
  NormalizedRequirementDraft,
} from "./requirement-normalizer.cjs";

type JobSourceRow = {
  id: number;
  title: string;
  description_text: string | null;
  description_snippet: string;
};

type AnalysisRow = {
  job_id: string;
  source_hash: string;
  normalizer_version: number;
  analyzed_at: string;
};

type RequirementRow = {
  id: string;
  job_id: string;
  kind: JobRequirement["kind"];
  text: string;
  normalized_term: string | null;
  importance: number | null;
  source_text: string;
  created_at: string;
};

type MappingRow = {
  id: string;
  job_requirement_id: string;
  evidence_id: string | null;
  classification: RequirementEvidenceMap["classification"];
  explanation: string;
  created_by: RequirementEvidenceMap["createdBy"];
  user_confirmed: number;
  created_at: string;
  updated_at: string;
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

function mapRequirement(row: RequirementRow): JobRequirement {
  return {
    id: row.id,
    jobId: row.job_id,
    kind: row.kind,
    text: row.text,
    normalizedTerm: row.normalized_term,
    importance: row.importance,
    sourceText: row.source_text,
    createdAt: row.created_at,
  };
}

function mapMapping(row: MappingRow): RequirementEvidenceMap {
  return {
    id: row.id,
    jobRequirementId: row.job_requirement_id,
    evidenceId: row.evidence_id,
    classification: row.classification,
    explanation: row.explanation,
    createdBy: row.created_by,
    userConfirmed: Boolean(row.user_confirmed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export class JobRequirementRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  async getJobSource(jobId: string): Promise<{
    id: string;
    title: string;
    descriptionText: string | null;
    descriptionSnippet: string;
  } | null> {
    const row = await this.sqlite.queryOne<JobSourceRow>(sql`
      SELECT id, title, description_text, description_snippet
      FROM jobs
      WHERE id = ${jobId}
      LIMIT 1;
    `);
    return row
      ? {
          id: String(row.id),
          title: row.title,
          descriptionText: row.description_text,
          descriptionSnippet: row.description_snippet,
        }
      : null;
  }

  async getAnalysis(jobId: string): Promise<AnalysisRow | null> {
    return this.sqlite.queryOne<AnalysisRow>(sql`
      SELECT * FROM job_requirement_analysis WHERE job_id = ${jobId} LIMIT 1;
    `);
  }

  async replaceRequirements(
    jobId: string,
    sourceHash: string,
    normalizerVersion: number,
    requirements: readonly NormalizedRequirementDraft[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const inserts = requirements
      .map(
        (item) => sql`
          INSERT INTO job_requirements (
            id, job_id, kind, text, normalized_term, importance, source_text, created_at
          ) VALUES (
            ${item.id}, ${item.jobId}, ${item.kind}, ${item.text}, ${item.normalizedTerm},
            ${item.importance}, ${item.sourceText}, ${item.createdAt}
          );
        `,
      )
      .join("\n");

    await this.sqlite.exec(`
      BEGIN IMMEDIATE;
      DELETE FROM job_requirements WHERE job_id = ${JSON.stringify(jobId)};
      ${inserts}
      INSERT INTO job_requirement_analysis (job_id, source_hash, normalizer_version, analyzed_at)
      VALUES (${JSON.stringify(jobId)}, ${JSON.stringify(sourceHash)}, ${normalizerVersion}, ${JSON.stringify(now)})
      ON CONFLICT(job_id) DO UPDATE SET
        source_hash = excluded.source_hash,
        normalizer_version = excluded.normalizer_version,
        analyzed_at = excluded.analyzed_at;
      COMMIT;
    `);
  }

  async listRequirements(jobId: string): Promise<JobRequirement[]> {
    const rows = await this.sqlite.queryAll<RequirementRow>(sql`
      SELECT * FROM job_requirements
      WHERE job_id = ${jobId}
      ORDER BY importance DESC, created_at ASC;
    `);
    return rows.map(mapRequirement);
  }

  async listConfirmedEvidence(): Promise<CandidateEvidence[]> {
    const rows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT * FROM candidate_evidence
      WHERE verification_state IN ('user-confirmed', 'user-authored')
      ORDER BY updated_at DESC;
    `);
    return rows.map(mapEvidence);
  }

  async replaceDeterministicMappings(
    jobId: string,
    mappings: readonly DeterministicMappingDraft[],
  ): Promise<void> {
    await this.sqlite.exec(sql`
      DELETE FROM requirement_evidence_maps
      WHERE user_confirmed = 0
        AND job_requirement_id IN (
          SELECT id FROM job_requirements WHERE job_id = ${jobId}
        );
    `);

    const confirmedRows = await this.sqlite.queryAll<MappingRow>(sql`
      SELECT maps.*
      FROM requirement_evidence_maps maps
      JOIN job_requirements requirements ON requirements.id = maps.job_requirement_id
      JOIN candidate_evidence evidence ON evidence.id = maps.evidence_id
      WHERE requirements.job_id = ${jobId}
        AND maps.user_confirmed = 1
        AND evidence.verification_state IN ('user-confirmed', 'user-authored');
    `);
    const confirmedRequirementIds = new Set(
      confirmedRows.map((row) => row.job_requirement_id),
    );

    for (const mapping of mappings) {
      if (confirmedRequirementIds.has(mapping.jobRequirementId)) continue;
      await this.sqlite.exec(sql`
        INSERT INTO requirement_evidence_maps (
          id, job_requirement_id, evidence_id, classification, explanation,
          created_by, user_confirmed, created_at, updated_at
        ) VALUES (
          ${mapping.id}, ${mapping.jobRequirementId}, ${mapping.evidenceId},
          ${mapping.classification}, ${mapping.explanation}, ${mapping.createdBy},
          ${mapping.userConfirmed}, ${mapping.createdAt}, ${mapping.updatedAt}
        )
        ON CONFLICT(id) DO UPDATE SET
          evidence_id = excluded.evidence_id,
          classification = excluded.classification,
          explanation = excluded.explanation,
          created_by = excluded.created_by,
          updated_at = excluded.updated_at;
      `);
    }
  }

  async listCoverage(jobId: string): Promise<JobRequirementCoverageItem[]> {
    const requirements = await this.listRequirements(jobId);
    const mappings = await this.sqlite.queryAll<MappingRow>(sql`
      SELECT maps.*
      FROM requirement_evidence_maps maps
      JOIN job_requirements requirements ON requirements.id = maps.job_requirement_id
      WHERE requirements.job_id = ${jobId}
      ORDER BY maps.user_confirmed DESC, maps.updated_at DESC;
    `);
    const evidenceRows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT * FROM candidate_evidence
      WHERE verification_state IN ('user-confirmed', 'user-authored');
    `);
    const evidenceById = new Map(evidenceRows.map((row) => [row.id, mapEvidence(row)]));
    const mappingByRequirement = new Map<string, RequirementEvidenceMap>();

    for (const row of mappings) {
      if (mappingByRequirement.has(row.job_requirement_id)) continue;
      const mapped = mapMapping(row);
      if (mapped.evidenceId && !evidenceById.has(mapped.evidenceId)) continue;
      mappingByRequirement.set(row.job_requirement_id, mapped);
    }

    return requirements.flatMap((requirement) => {
      const mapping = mappingByRequirement.get(requirement.id);
      if (!mapping) return [];
      return [
        {
          requirement,
          mapping,
          evidence: mapping.evidenceId
            ? evidenceById.get(mapping.evidenceId) ?? null
            : null,
        },
      ];
    });
  }

  async confirmAmbiguousMapping(mappingId: string): Promise<RequirementEvidenceMap> {
    const current = await this.sqlite.queryOne<MappingRow>(sql`
      SELECT * FROM requirement_evidence_maps WHERE id = ${mappingId} LIMIT 1;
    `);
    if (!current) throw new Error(`Requirement mapping ${mappingId} not found`);
    if (current.classification !== "ambiguous" || !current.evidence_id) {
      throw new Error("Only ambiguous evidence connections can be user-confirmed");
    }

    const evidence = await this.sqlite.queryOne<EvidenceRow>(sql`
      SELECT * FROM candidate_evidence
      WHERE id = ${current.evidence_id}
        AND verification_state IN ('user-confirmed', 'user-authored')
      LIMIT 1;
    `);
    if (!evidence) {
      throw new Error("The mapped Career Evidence is no longer confirmed");
    }

    const row = await this.sqlite.queryOne<MappingRow>(sql`
      UPDATE requirement_evidence_maps
      SET user_confirmed = 1, updated_at = ${new Date().toISOString()}
      WHERE id = ${mappingId}
      RETURNING *;
    `);
    if (!row) throw new Error(`Failed to confirm requirement mapping ${mappingId}`);
    return mapMapping(row);
  }
}
