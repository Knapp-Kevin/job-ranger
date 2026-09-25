import type {
  CreateResumeProjectionInput,
  ReviseResumeProjectionInput,
} from "../../src/shared/resume-workspace.js";
import { validateCareerEntityId } from "./career-validators.cjs";
import { validateId } from "./validators.cjs";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function validateCreateResumeProjectionInput(
  value: unknown,
): CreateResumeProjectionInput {
  const record = requireRecord(value, "Resume projection input");
  const context = record.context ?? "private-sector";
  if (
    context !== "private-sector" &&
    context !== "hybrid" &&
    context !== "federal" &&
    context !== "academic"
  ) {
    throw new Error("Resume context is invalid");
  }
  const pageFormat = record.pageFormat ?? "letter";
  if (pageFormat !== "letter" && pageFormat !== "a4") {
    throw new Error("Resume page format is invalid");
  }
  return {
    jobId: validateId(record.jobId, "Job id"),
    context,
    pageFormat,
  };
}

export function validateReviseResumeProjectionInput(
  value: unknown,
): ReviseResumeProjectionInput {
  const record = requireRecord(value, "Resume revision input");
  if (!Array.isArray(record.selectedEvidenceIds)) {
    throw new Error("Selected evidence ids must be an array");
  }
  if (record.selectedEvidenceIds.length > 100) {
    throw new Error("Too many evidence records were selected");
  }
  return {
    sourceProjectionId: validateCareerEntityId(
      record.sourceProjectionId,
      "Source projection id",
    ),
    selectedEvidenceIds: record.selectedEvidenceIds.map((value, index) =>
      validateCareerEntityId(value, `Selected evidence id ${index + 1}`),
    ),
  };
}
