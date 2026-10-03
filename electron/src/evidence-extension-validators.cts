import type {
  EvidenceReferenceInput,
  EvidenceSupersedeInput,
} from "../../src/shared/evidence-extensions.js";
import type { EvidenceSubjectType } from "../../src/shared/contracts.js";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (value.length > maxLength) throw new Error(`${label} is too long`);
  return value;
}

function subjectType(value: unknown): EvidenceSubjectType {
  const allowed: EvidenceSubjectType[] = [
    "role",
    "skill",
    "credential",
    "education",
    "project",
    "achievement",
    "publication",
    "other",
  ];
  if (typeof value !== "string" || !allowed.includes(value as EvidenceSubjectType)) {
    throw new Error("Evidence subject type is invalid");
  }
  return value as EvidenceSubjectType;
}

export function validateEvidenceReferences(value: unknown): EvidenceReferenceInput[] {
  if (!Array.isArray(value)) throw new Error("Evidence references must be an array");
  if (value.length > 10) throw new Error("Evidence can retain at most 10 references");

  const seen = new Set<string>();
  const references: EvidenceReferenceInput[] = [];
  for (const [index, item] of value.entries()) {
    const record = requireRecord(item, `Evidence reference ${index + 1}`);
    if (record.kind !== "url" && record.kind !== "local") {
      throw new Error(`Evidence reference ${index + 1} kind is invalid`);
    }
    const kind = record.kind;
    let referenceValue = requireString(
      record.value,
      `Evidence reference ${index + 1} value`,
      2000,
    ).trim();
    if (!referenceValue) continue;

    if (kind === "url") {
      let parsed: URL;
      try {
        parsed = new URL(referenceValue);
      } catch {
        throw new Error(`Evidence reference ${index + 1} must be a valid web URL`);
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(`Evidence reference ${index + 1} must use http or https`);
      }
      referenceValue = parsed.toString();
    } else if (referenceValue.includes("\u0000")) {
      throw new Error(`Evidence reference ${index + 1} contains invalid characters`);
    }

    const label =
      record.label === undefined || record.label === null
        ? null
        : requireString(record.label, `Evidence reference ${index + 1} label`, 200).trim() || null;
    const key = `${kind}\n${referenceValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    references.push({ kind, label, value: referenceValue });
  }
  return references;
}

export function validateEvidenceSupersedeInput(value: unknown): EvidenceSupersedeInput {
  const record = requireRecord(value, "Evidence replacement");
  const statement = requireString(record.statement, "Replacement statement", 20_000).trim();
  if (!statement) throw new Error("Replacement statement cannot be empty");
  return {
    subjectType: subjectType(record.subjectType),
    statement,
  };
}
