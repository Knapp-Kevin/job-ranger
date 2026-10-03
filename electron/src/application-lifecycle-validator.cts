import type {
  ApplicationContactInput,
  ApplicationEventInput,
  ApplicationEventKind,
  ApplicationEventUpdate,
} from "../../src/shared/application-lifecycle.js";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized;
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized || null;
}

function notes(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Notes must be text");
  if (value.length > 50_000) throw new Error("Notes are too long");
  return value;
}

function eventKind(value: unknown): ApplicationEventKind {
  const allowed: ApplicationEventKind[] = [
    "follow-up",
    "interview",
    "deadline",
    "offer",
    "other",
  ];
  if (typeof value !== "string" || !allowed.includes(value as ApplicationEventKind)) {
    throw new Error("Application event kind is invalid");
  }
  return value as ApplicationEventKind;
}

function isoDateTime(value: unknown, label: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid date/time`);
  }
  return new Date(value).toISOString();
}

function optionalIsoDateTime(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return isoDateTime(value, label);
}

export function validateApplicationContactInput(value: unknown): ApplicationContactInput {
  const record = requireRecord(value, "Application contact");
  return {
    name: requireText(record.name, "Contact name", 500),
    role: optionalText(record.role, "Contact role", 500),
    email: optionalText(record.email, "Contact email", 1000),
    phone: optionalText(record.phone, "Contact phone", 200),
    notes: notes(record.notes),
  };
}

export function validateApplicationEventInput(value: unknown): ApplicationEventInput {
  const record = requireRecord(value, "Application event");
  const eventAt = isoDateTime(record.eventAt, "Event time");
  const reminderAt = optionalIsoDateTime(record.reminderAt, "Reminder time");
  return {
    kind: eventKind(record.kind),
    title: requireText(record.title, "Event title", 1000),
    eventAt,
    reminderAt,
    notes: notes(record.notes),
  };
}

export function validateApplicationEventUpdate(value: unknown): ApplicationEventUpdate {
  const record = requireRecord(value, "Application event update");
  const update: ApplicationEventUpdate = {};
  if (record.kind !== undefined) update.kind = eventKind(record.kind);
  if (record.title !== undefined) update.title = requireText(record.title, "Event title", 1000);
  if (record.eventAt !== undefined) update.eventAt = isoDateTime(record.eventAt, "Event time");
  if (record.reminderAt !== undefined) {
    update.reminderAt = optionalIsoDateTime(record.reminderAt, "Reminder time");
  }
  if (record.completedAt !== undefined) {
    update.completedAt = optionalIsoDateTime(record.completedAt, "Completion time");
  }
  if (record.notes !== undefined) update.notes = notes(record.notes);
  return update;
}
