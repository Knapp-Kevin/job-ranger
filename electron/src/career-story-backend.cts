import { randomUUID } from "node:crypto";
import type {
  CareerStory,
  CareerStoryEvidence,
  CareerStoryInput,
} from "../../src/shared/career-stories.js";
import type {
  EvidenceSubjectType,
  EvidenceVerificationState,
} from "../../src/shared/contracts.js";
import { sql, SqliteClient, toSqlLiteral } from "./sqlite.cjs";
import { FEATURE_MIGRATIONS } from "./feature-migrations.cjs";

const CAREER_STORY_MIGRATION_VERSION = FEATURE_MIGRATIONS.careerStories.version;
const CAREER_STORY_MIGRATION_NAME = FEATURE_MIGRATIONS.careerStories.name;

const CAREER_STORY_SCHEMA = `
  CREATE TABLE IF NOT EXISTS career_stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    situation TEXT NOT NULL DEFAULT '',
    challenge TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    reflection TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_career_stories_updated
    ON career_stories(updated_at DESC);

  CREATE TABLE IF NOT EXISTS career_story_evidence_links (
    story_id TEXT NOT NULL REFERENCES career_stories(id) ON DELETE CASCADE,
    evidence_id TEXT NOT NULL REFERENCES candidate_evidence(id) ON DELETE RESTRICT,
    display_order INTEGER NOT NULL,
    PRIMARY KEY (story_id, evidence_id)
  );

  CREATE INDEX IF NOT EXISTS idx_career_story_evidence_links_evidence
    ON career_story_evidence_links(evidence_id, story_id);
`;

type StoryRow = {
  id: string;
  title: string;
  tags_json: string;
  situation: string;
  challenge: string;
  action: string;
  result: string;
  reflection: string;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  story_id: string;
  evidence_id: string;
  display_order: number;
};

type EvidenceRow = {
  id: string;
  subject_type: EvidenceSubjectType;
  statement: string;
  verification_state: EvidenceVerificationState;
};

type LineageRow = {
  predecessor_evidence_id: string;
  successor_evidence_id: string;
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

function cleanTags(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isCurrentEvidence(state: EvidenceVerificationState): boolean {
  return state === "user-authored" || state === "user-confirmed";
}

function currentDescendants(
  evidenceId: string,
  evidenceById: Map<string, EvidenceRow>,
  successorsByPredecessor: Map<string, string[]>,
): string[] {
  const current = new Set<string>();
  const visited = new Set<string>();
  const pending = [...(successorsByPredecessor.get(evidenceId) ?? [])];

  while (pending.length > 0) {
    const successorId = pending.pop();
    if (!successorId || visited.has(successorId)) continue;
    visited.add(successorId);
    const row = evidenceById.get(successorId);
    if (row && isCurrentEvidence(row.verification_state)) {
      current.add(successorId);
      continue;
    }
    pending.push(...(successorsByPredecessor.get(successorId) ?? []));
  }

  return Array.from(current).sort();
}

export class CareerStoryBackend {
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
      WHERE version = ${CAREER_STORY_MIGRATION_VERSION}
      LIMIT 1;
    `);
    if (existing) return;

    await this.sqlite.exec(CAREER_STORY_SCHEMA);
    await this.sqlite.exec(sql`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (
        ${CAREER_STORY_MIGRATION_VERSION},
        ${CAREER_STORY_MIGRATION_NAME},
        ${new Date().toISOString()}
      );
    `);
  }

  private async assertCurrentEvidence(evidenceIds: string[]): Promise<void> {
    if (evidenceIds.length === 0) {
      throw new Error("Career Stories must link to at least one confirmed Career Evidence item");
    }
    const rows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT id, subject_type, statement, verification_state
      FROM candidate_evidence
      WHERE id IN (${evidenceIds.map(toSqlLiteral).join(", ")});
    `);
    if (rows.length !== evidenceIds.length) {
      throw new Error("One or more linked Career Evidence items do not exist");
    }
    const unavailable = rows.filter((row) => !isCurrentEvidence(row.verification_state));
    if (unavailable.length > 0) {
      throw new Error(
        "Career Stories can only be saved against current user-confirmed or user-authored Career Evidence",
      );
    }
  }

  async listStories(): Promise<CareerStory[]> {
    return this.loadStories();
  }

  async createStory(input: CareerStoryInput): Promise<CareerStory> {
    await this.assertCurrentEvidence(input.evidenceIds);
    const id = `story-${randomUUID()}`;
    const now = new Date().toISOString();
    await this.sqlite.transaction([
      sql`
        INSERT INTO career_stories (
          id, title, tags_json, situation, challenge, action, result, reflection,
          created_at, updated_at
        ) VALUES (
          ${id}, ${input.title.trim()}, ${JSON.stringify(cleanTags(input.tags))},
          ${input.situation.trim()}, ${input.challenge.trim()}, ${input.action.trim()},
          ${input.result.trim()}, ${input.reflection.trim()}, ${now}, ${now}
        );
      `,
      ...input.evidenceIds.map((evidenceId, index) => sql`
        INSERT INTO career_story_evidence_links (story_id, evidence_id, display_order)
        VALUES (${id}, ${evidenceId}, ${index});
      `),
    ]);
    const story = (await this.loadStories(id))[0];
    if (!story) throw new Error("Failed to create Career Story");
    return story;
  }

  async updateStory(storyId: string, input: CareerStoryInput): Promise<CareerStory> {
    const existing = await this.sqlite.queryOne<{ id: string }>(sql`
      SELECT id FROM career_stories WHERE id = ${storyId} LIMIT 1;
    `);
    if (!existing) throw new Error(`Career Story ${storyId} not found`);
    await this.assertCurrentEvidence(input.evidenceIds);
    const now = new Date().toISOString();
    await this.sqlite.transaction([
      sql`
        UPDATE career_stories
        SET title = ${input.title.trim()},
            tags_json = ${JSON.stringify(cleanTags(input.tags))},
            situation = ${input.situation.trim()},
            challenge = ${input.challenge.trim()},
            action = ${input.action.trim()},
            result = ${input.result.trim()},
            reflection = ${input.reflection.trim()},
            updated_at = ${now}
        WHERE id = ${storyId};
      `,
      sql`DELETE FROM career_story_evidence_links WHERE story_id = ${storyId};`,
      ...input.evidenceIds.map((evidenceId, index) => sql`
        INSERT INTO career_story_evidence_links (story_id, evidence_id, display_order)
        VALUES (${storyId}, ${evidenceId}, ${index});
      `),
    ]);
    const story = (await this.loadStories(storyId))[0];
    if (!story) throw new Error(`Career Story ${storyId} not found after update`);
    return story;
  }

  async deleteStory(storyId: string): Promise<void> {
    await this.sqlite.exec(sql`DELETE FROM career_stories WHERE id = ${storyId};`);
  }

  private async loadStories(storyId?: string): Promise<CareerStory[]> {
    const stories = await this.sqlite.queryAll<StoryRow>(`
      SELECT * FROM career_stories
      ${storyId ? `WHERE id = ${toSqlLiteral(storyId)}` : ""}
      ORDER BY updated_at DESC, created_at ASC;
    `);
    if (stories.length === 0) return [];

    const storyIds = stories.map((story) => story.id);
    const links = await this.sqlite.queryAll<LinkRow>(`
      SELECT story_id, evidence_id, display_order
      FROM career_story_evidence_links
      WHERE story_id IN (${storyIds.map(toSqlLiteral).join(", ")})
      ORDER BY story_id, display_order ASC;
    `);
    // Load the evidence universe, not only linked rows. Explicit lineage may point
    // from a stale linked predecessor to a current successor that is not linked yet.
    const evidenceRows = await this.sqlite.queryAll<EvidenceRow>(`
      SELECT id, subject_type, statement, verification_state
      FROM candidate_evidence;
    `);
    const lineageRows = await this.sqlite.queryAll<LineageRow>(`
      SELECT predecessor_evidence_id, successor_evidence_id
      FROM evidence_lineage
      WHERE relation = 'supersedes';
    `);

    const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));
    const successorsByPredecessor = new Map<string, string[]>();
    for (const row of lineageRows) {
      const values = successorsByPredecessor.get(row.predecessor_evidence_id) ?? [];
      values.push(row.successor_evidence_id);
      successorsByPredecessor.set(row.predecessor_evidence_id, values);
    }

    return stories.map((story) => {
      const storyLinks = links.filter((link) => link.story_id === story.id);
      const evidence: CareerStoryEvidence[] = storyLinks.map((link) => {
        const row = evidenceById.get(link.evidence_id);
        const stale = !row || !isCurrentEvidence(row.verification_state);
        return {
          evidenceId: link.evidence_id,
          subjectType: row?.subject_type ?? "other",
          statement: row?.statement ?? "Linked Career Evidence is unavailable.",
          verificationState: row?.verification_state ?? "rejected",
          stale,
          replacementEvidenceIds: stale
            ? currentDescendants(link.evidence_id, evidenceById, successorsByPredecessor)
            : [],
        };
      });
      return {
        id: story.id,
        title: story.title,
        tags: parseStringArray(story.tags_json),
        situation: story.situation,
        challenge: story.challenge,
        action: story.action,
        result: story.result,
        reflection: story.reflection,
        evidence,
        staleEvidenceIds: evidence.filter((item) => item.stale).map((item) => item.evidenceId),
        createdAt: story.created_at,
        updatedAt: story.updated_at,
      };
    });
  }
}
