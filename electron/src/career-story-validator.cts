import type { CareerStoryInput } from "../../src/shared/career-stories.js";
import { validateCareerEntityId } from "./career-validators.cjs";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} is too long`);
  }
  return value.trim();
}

function stringArray(
  value: unknown,
  label: string,
  options: { maxItems: number; maxLength: number; requireOne?: boolean },
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (options.requireOne && value.length === 0) {
    throw new Error(`${label} must contain at least one item`);
  }
  if (value.length > options.maxItems) {
    throw new Error(`${label} contains too many items`);
  }
  const result = value.map((item, index) =>
    requireString(item, `${label}[${index}]`, options.maxLength),
  );
  const deduped = Array.from(new Set(result.filter(Boolean)));
  if (options.requireOne && deduped.length === 0) {
    throw new Error(`${label} must contain at least one item`);
  }
  return deduped;
}

export function validateCareerStoryInput(value: unknown): CareerStoryInput {
  const record = requireRecord(value, "Career Story");
  const title = requireString(record.title, "Career Story title", 200);
  if (!title) {
    throw new Error("Career Story title cannot be empty");
  }

  const rawEvidenceIds = stringArray(record.evidenceIds, "Career Story evidence ids", {
    maxItems: 25,
    maxLength: 500,
    requireOne: true,
  });
  const evidenceIds = rawEvidenceIds.map((id, index) =>
    validateCareerEntityId(id, `Career Story evidence ids[${index}]`),
  );

  return {
    title,
    tags: stringArray(record.tags ?? [], "Career Story tags", {
      maxItems: 30,
      maxLength: 100,
    }),
    situation: requireString(record.situation ?? "", "Career Story situation", 5000),
    challenge: requireString(record.challenge ?? "", "Career Story challenge", 5000),
    action: requireString(record.action ?? "", "Career Story action", 5000),
    result: requireString(record.result ?? "", "Career Story result", 5000),
    reflection: requireString(record.reflection ?? "", "Career Story reflection", 5000),
    evidenceIds: Array.from(new Set(evidenceIds)),
  };
}
