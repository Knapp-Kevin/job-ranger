import type {
  ApplicationArtifactPurpose,
  ResumeContext,
  ResumePageFormat,
} from "../../src/shared/contracts.js";
import type {
  ResumeContactSnapshot,
  ResumeCreateInput,
  ResumeExportRequest,
  ResumeStatementUpdate,
  ResumeTemplateId,
} from "../../src/shared/resume-contracts.js";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, max = 5000): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (value.length > max) throw new Error(`${label} is too long`);
  return value;
}

function nullableId(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  return string(value, label, 500).trim();
}

function stringArray(value: unknown, label: string, maxItems = 500): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maxItems) throw new Error(`${label} has too many items`);
  return value.map((item, index) => string(item, `${label}[${index}]`, 1000));
}

function context(value: unknown): ResumeContext {
  if (value === "private-sector" || value === "hybrid" || value === "federal" || value === "academic") {
    return value;
  }
  throw new Error("Resume context is invalid");
}

function pageFormat(value: unknown): ResumePageFormat {
  if (value === "letter" || value === "a4") return value;
  throw new Error("Resume page format is invalid");
}

function templateId(value: unknown): ResumeTemplateId {
  if (value === "ats-standard-v1" || value === "ats-compact-v1") return value;
  throw new Error("Resume template is invalid");
}

function contact(value: unknown): ResumeContactSnapshot {
  const input = record(value, "Resume contact");
  return {
    fullName: string(input.fullName, "Full name", 500),
    email: string(input.email, "Email", 500),
    phone: string(input.phone, "Phone", 200),
    location: string(input.location, "Location", 500),
    links: stringArray(input.links, "Contact links", 20),
  };
}

export function validateResumeCreateInput(value: unknown): ResumeCreateInput {
  const input = record(value, "Resume create input");
  return {
    jobId: nullableId(input.jobId, "Job id"),
    context: context(input.context),
    pageFormat: pageFormat(input.pageFormat),
    templateId: templateId(input.templateId),
    contact: contact(input.contact),
    selectedEvidenceIds: stringArray(input.selectedEvidenceIds, "Selected evidence ids"),
  };
}

export function validateResumeStatementUpdate(value: unknown): ResumeStatementUpdate {
  const input = record(value, "Resume statement update");
  return { text: string(input.text, "Resume statement", 1000) };
}

function purpose(value: unknown): ApplicationArtifactPurpose {
  if (value === "submitted" || value === "recruiter-copy" || value === "interview-copy" || value === "other") {
    return value;
  }
  throw new Error("Application artifact purpose is invalid");
}

export function validateResumeExportRequest(value: unknown): ResumeExportRequest {
  const input = record(value, "Resume export request");
  return {
    projectionId: string(input.projectionId, "Projection id", 500).trim(),
    applicationId: nullableId(input.applicationId, "Application id"),
    purpose: input.purpose === undefined ? undefined : purpose(input.purpose),
  };
}
