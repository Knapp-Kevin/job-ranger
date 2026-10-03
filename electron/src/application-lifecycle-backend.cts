import { randomUUID } from "node:crypto";
import type {
  ApplicationArtifactHistoryItem,
  ApplicationContact,
  ApplicationContactInput,
  ApplicationEvent,
  ApplicationEventInput,
  ApplicationEventUpdate,
  ApplicationLifecycle,
} from "../../src/shared/application-lifecycle.js";
import { sql, SqliteClient } from "./sqlite.cjs";

const APPLICATION_LIFECYCLE_MIGRATION_VERSION = 1001;
const APPLICATION_LIFECYCLE_MIGRATION_NAME = "application_lifecycle_foundation";

const APPLICATION_LIFECYCLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS application_contacts (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_application_contacts_application
    ON application_contacts(application_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS application_events (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('follow-up', 'interview', 'deadline', 'offer', 'other')),
    title TEXT NOT NULL,
    event_at TEXT NOT NULL,
    reminder_at TEXT,
    completed_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_application_events_application
    ON application_events(application_id, event_at ASC);
  CREATE INDEX IF NOT EXISTS idx_application_events_reminder
    ON application_events(reminder_at, completed_at);
`;

type ContactRow = {
  id: string;
  application_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  application_id: string;
  kind: ApplicationEvent["kind"];
  title: string;
  event_at: string;
  reminder_at: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  link_id: string;
  application_id: string;
  resume_artifact_id: string;
  projection_id: string;
  version: number;
  format: ApplicationArtifactHistoryItem["format"];
  purpose: ApplicationArtifactHistoryItem["purpose"];
  managed_path: string;
  content_hash: string;
  artifact_created_at: string;
  recorded_at: string;
};

function mapContact(row: ContactRow): ApplicationContact {
  return {
    id: row.id,
    applicationId: row.application_id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): ApplicationEvent {
  return {
    id: row.id,
    applicationId: row.application_id,
    kind: row.kind,
    title: row.title,
    eventAt: row.event_at,
    reminderAt: row.reminder_at,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArtifact(row: ArtifactRow): ApplicationArtifactHistoryItem {
  return {
    linkId: row.link_id,
    applicationId: row.application_id,
    resumeArtifactId: row.resume_artifact_id,
    projectionId: row.projection_id,
    version: row.version,
    format: row.format,
    purpose: row.purpose,
    managedPath: row.managed_path,
    contentHash: row.content_hash,
    artifactCreatedAt: row.artifact_created_at,
    recordedAt: row.recorded_at,
  };
}

function cleanOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

export class ApplicationLifecycleBackend {
  private readonly sqlite: SqliteClient;

  constructor(databasePath: string, sqliteBinaryPath: string) {
    this.sqlite = new SqliteClient(databasePath, sqliteBinaryPath);
  }

  async initialize(): Promise<void> {
    await this.sqlite.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);",
    );
    const existing = await this.sqlite.queryOne<{ version: number }>(sql`
      SELECT version FROM schema_migrations
      WHERE version = ${APPLICATION_LIFECYCLE_MIGRATION_VERSION}
      LIMIT 1;
    `);
    if (existing) return;

    await this.sqlite.exec(APPLICATION_LIFECYCLE_SCHEMA);
    await this.sqlite.exec(sql`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (
        ${APPLICATION_LIFECYCLE_MIGRATION_VERSION},
        ${APPLICATION_LIFECYCLE_MIGRATION_NAME},
        ${new Date().toISOString()}
      );
    `);
  }

  private async assertApplication(applicationId: string): Promise<void> {
    const row = await this.sqlite.queryOne<{ id: string }>(sql`
      SELECT id FROM applications WHERE id = ${applicationId} LIMIT 1;
    `);
    if (!row) throw new Error(`Application ${applicationId} not found`);
  }

  async getLifecycle(applicationId: string): Promise<ApplicationLifecycle> {
    await this.assertApplication(applicationId);
    const [contacts, events, artifacts] = await Promise.all([
      this.sqlite.queryAll<ContactRow>(sql`
        SELECT * FROM application_contacts
        WHERE application_id = ${applicationId}
        ORDER BY updated_at DESC, created_at ASC;
      `),
      this.sqlite.queryAll<EventRow>(sql`
        SELECT * FROM application_events
        WHERE application_id = ${applicationId}
        ORDER BY completed_at IS NOT NULL ASC, event_at ASC, created_at ASC;
      `),
      this.sqlite.queryAll<ArtifactRow>(sql`
        SELECT
          links.id AS link_id,
          links.application_id AS application_id,
          artifacts.id AS resume_artifact_id,
          artifacts.projection_id AS projection_id,
          artifacts.version AS version,
          artifacts.format AS format,
          links.purpose AS purpose,
          artifacts.managed_path AS managed_path,
          artifacts.content_hash AS content_hash,
          artifacts.created_at AS artifact_created_at,
          links.recorded_at AS recorded_at
        FROM application_artifact_links AS links
        JOIN resume_artifacts AS artifacts ON artifacts.id = links.resume_artifact_id
        WHERE links.application_id = ${applicationId}
        ORDER BY links.recorded_at DESC, artifacts.version DESC;
      `),
    ]);

    return {
      applicationId,
      contacts: contacts.map(mapContact),
      events: events.map(mapEvent),
      artifacts: artifacts.map(mapArtifact),
    };
  }

  async createContact(
    applicationId: string,
    input: ApplicationContactInput,
  ): Promise<ApplicationContact> {
    await this.assertApplication(applicationId);
    const now = new Date().toISOString();
    const row = await this.sqlite.queryOne<ContactRow>(sql`
      INSERT INTO application_contacts (
        id, application_id, name, role, email, phone, notes, created_at, updated_at
      ) VALUES (
        ${`contact-${randomUUID()}`}, ${applicationId}, ${input.name.trim()},
        ${cleanOptional(input.role)}, ${cleanOptional(input.email)}, ${cleanOptional(input.phone)},
        ${(input.notes ?? "").trim()}, ${now}, ${now}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to create application contact");
    return mapContact(row);
  }

  async updateContact(
    contactId: string,
    input: ApplicationContactInput,
  ): Promise<ApplicationContact> {
    const row = await this.sqlite.queryOne<ContactRow>(sql`
      UPDATE application_contacts
      SET
        name = ${input.name.trim()},
        role = ${cleanOptional(input.role)},
        email = ${cleanOptional(input.email)},
        phone = ${cleanOptional(input.phone)},
        notes = ${(input.notes ?? "").trim()},
        updated_at = ${new Date().toISOString()}
      WHERE id = ${contactId}
      RETURNING *;
    `);
    if (!row) throw new Error(`Application contact ${contactId} not found`);
    return mapContact(row);
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.sqlite.exec(sql`DELETE FROM application_contacts WHERE id = ${contactId};`);
  }

  async createEvent(
    applicationId: string,
    input: ApplicationEventInput,
  ): Promise<ApplicationEvent> {
    await this.assertApplication(applicationId);
    const now = new Date().toISOString();
    const row = await this.sqlite.queryOne<EventRow>(sql`
      INSERT INTO application_events (
        id, application_id, kind, title, event_at, reminder_at, completed_at,
        notes, created_at, updated_at
      ) VALUES (
        ${`event-${randomUUID()}`}, ${applicationId}, ${input.kind}, ${input.title.trim()},
        ${input.eventAt}, ${input.reminderAt ?? null}, ${null}, ${(input.notes ?? "").trim()},
        ${now}, ${now}
      )
      RETURNING *;
    `);
    if (!row) throw new Error("Failed to create application event");
    return mapEvent(row);
  }

  async updateEvent(
    eventId: string,
    update: ApplicationEventUpdate,
  ): Promise<ApplicationEvent> {
    const current = await this.sqlite.queryOne<EventRow>(sql`
      SELECT * FROM application_events WHERE id = ${eventId} LIMIT 1;
    `);
    if (!current) throw new Error(`Application event ${eventId} not found`);

    const row = await this.sqlite.queryOne<EventRow>(sql`
      UPDATE application_events
      SET
        kind = ${update.kind ?? current.kind},
        title = ${update.title?.trim() ?? current.title},
        event_at = ${update.eventAt ?? current.event_at},
        reminder_at = ${update.reminderAt === undefined ? current.reminder_at : update.reminderAt},
        completed_at = ${update.completedAt === undefined ? current.completed_at : update.completedAt},
        notes = ${update.notes === undefined ? current.notes : update.notes.trim()},
        updated_at = ${new Date().toISOString()}
      WHERE id = ${eventId}
      RETURNING *;
    `);
    if (!row) throw new Error(`Failed to update application event ${eventId}`);
    return mapEvent(row);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.sqlite.exec(sql`DELETE FROM application_events WHERE id = ${eventId};`);
  }
}
