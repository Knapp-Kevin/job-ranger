import type { ApplicationMaterialGenerateInput } from "../../src/shared/application-materials.js";
import { validateCareerEntityId } from "./career-validators.cjs";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function validateApplicationMaterialGenerateInput(
  value: unknown,
): ApplicationMaterialGenerateInput {
  const record = requireRecord(value, "Application material input");
  const applicationId = validateCareerEntityId(
    record.applicationId,
    "Application material application id",
  );
  if (!Array.isArray(record.evidenceIds)) {
    throw new Error("Application material evidence ids must be an array");
  }
  if (record.evidenceIds.length === 0) {
    throw new Error("Application material evidence ids must contain at least one item");
  }
  if (record.evidenceIds.length > 25) {
    throw new Error("Application material evidence ids contains too many items");
  }
  const evidenceIds = Array.from(
    new Set(
      record.evidenceIds.map((id, index) =>
        validateCareerEntityId(id, `Application material evidence ids[${index}]`),
      ),
    ),
  );
  return { applicationId, evidenceIds };
}
