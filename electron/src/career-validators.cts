import type {
  ApplicationStatus,
  ApplicationUpdate,
  CareerProfile,
  CredentialDetails,
  EvidenceReviewAction,
  EvidenceReviewUpdate,
  EvidenceSubjectType,
  LegacyCareerMigration,
  OnCallPreference,
  PastedResumeInput,
  PayBasis,
  TrackedApplication,
  UserAuthoredEvidenceInput,
} from "../../src/shared/contracts.js";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string, maxLength = 10000): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} is too long`);
  }
  return value;
}

function optionalString(
  value: unknown,
  label: string,
  maxLength = 1000,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, label, maxLength).trim() || undefined;
}

/**
 * Career-domain records use stable opaque string identifiers such as
 * `application-42` and `evidence-<uuid>`. They intentionally do not share the
 * numeric SQLite row-id contract used by jobs, companies, and filters.
 */
export function validateCareerEntityId(value: unknown, label: string): string {
  const id = requireString(value, label, 500).trim();
  if (!id) {
    throw new Error(`${label} cannot be empty`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw new Error(`${label} contains invalid characters`);
  }
  return id;
}

function nullableFiniteNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (value.length > 500) {
    throw new Error(`${label} contains too many items`);
  }
  return value.map((item, index) => requireString(item, `${label}[${index}]`, 500));
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  return value === undefined ? undefined : stringArray(value, label);
}

function applicationStatus(value: unknown): ApplicationStatus {
  const allowed: ApplicationStatus[] = [
    "interested",
    "applied",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ];
  if (typeof value !== "string" || !allowed.includes(value as ApplicationStatus)) {
    throw new Error("Application status is invalid");
  }
  return value as ApplicationStatus;
}

function evidenceSubjectType(value: unknown): EvidenceSubjectType {
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

function evidenceReviewAction(value: unknown): EvidenceReviewAction {
  const allowed: EvidenceReviewAction[] = ["confirm", "edit", "reject"];
  if (typeof value !== "string" || !allowed.includes(value as EvidenceReviewAction)) {
    throw new Error("Evidence review action is invalid");
  }
  return value as EvidenceReviewAction;
}

function payBasis(value: unknown): PayBasis {
  if (value !== "hourly" && value !== "annual") {
    throw new Error("Pay basis must be hourly or annual");
  }
  return value;
}

function onCallPreference(value: unknown): OnCallPreference {
  if (value !== "yes" && value !== "no" && value !== "either") {
    throw new Error("On-call preference is invalid");
  }
  return value;
}

function externalUrl(value: unknown, label: string): string {
  const raw = requireString(value, label, 5000).trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https`);
  }
  return parsed.toString();
}

function isoLikeString(value: unknown, label: string): string {
  const raw = requireString(value, label, 100);
  if (Number.isNaN(Date.parse(raw))) {
    throw new Error(`${label} must be a valid date/time`);
  }
  return raw;
}

function optionalIsoDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = requireString(value, label, 10).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new Error(`${label} must be a valid calendar date`);
  }
  return raw;
}

function credentialDetails(
  value: unknown,
  subjectType: EvidenceSubjectType,
): CredentialDetails | undefined {
  if (value === undefined || value === null) return undefined;
  if (subjectType !== "credential") {
    throw new Error("Credential details can only be attached to credential evidence");
  }
  const record = requireRecord(value, "Credential details");
  const issuer = optionalString(record.issuer, "Credential issuer", 500) ?? null;
  const jurisdiction = optionalString(record.jurisdiction, "Credential jurisdiction", 500) ?? null;
  const credentialId = optionalString(record.credentialId, "Credential identifier", 500) ?? null;
  const expirationDate = optionalIsoDate(record.expirationDate, "Credential expiration date");
  const status =
    record.status === undefined || record.status === null || record.status === ""
      ? null
      : record.status;
  if (
    status !== null &&
    status !== "active" &&
    status !== "expired" &&
    status !== "inactive" &&
    status !== "pending"
  ) {
    throw new Error("Credential status is invalid");
  }
  if (!issuer && !jurisdiction && !status && !expirationDate && !credentialId) {
    return undefined;
  }
  return { issuer, jurisdiction, status, expirationDate, credentialId };
}

export function validateCareerProfile(value: unknown): CareerProfile {
  const record = requireRecord(value, "Career Profile");
  if (record.version !== 2) {
    throw new Error("Career Profile version must be 2");
  }
  if (typeof record.fullTimeOnly !== "boolean") {
    throw new Error("Full-time preference must be a boolean");
  }

  const updatedAt =
    record.updatedAt === null || record.updatedAt === undefined
      ? null
      : isoLikeString(record.updatedAt, "Career Profile updatedAt");

  return {
    version: 2,
    fullName: requireString(record.fullName, "Full name", 500),
    homeLocation: requireString(record.homeLocation, "Home location", 500),
    radiusMiles: nullableFiniteNumber(record.radiusMiles, "Radius miles"),
    minimumPay: nullableFiniteNumber(record.minimumPay, "Minimum pay"),
    payBasis: payBasis(record.payBasis),
    targetTitles: stringArray(record.targetTitles, "Target titles"),
    skills: stringArray(record.skills, "Skills"),
    certifications: stringArray(record.certifications, "Certifications"),
    sectors: stringArray(record.sectors, "Sectors"),
    onCallPreference: onCallPreference(record.onCallPreference),
    fullTimeOnly: record.fullTimeOnly,
    updatedAt,
  };
}

export function validateApplicationUpdate(value: unknown): ApplicationUpdate {
  const record = requireRecord(value, "Application update");
  const update: ApplicationUpdate = {};
  if (record.status !== undefined) {
    update.status = applicationStatus(record.status);
  }
  if (record.notes !== undefined) {
    update.notes = requireString(record.notes, "Application notes", 50000);
  }
  return update;
}

export function validatePastedResumeInput(value: unknown): PastedResumeInput {
  const record = requireRecord(value, "Pasted resume input");
  const label = requireString(record.label, "Pasted resume label", 200).trim();
  const text = requireString(record.text, "Pasted resume text", 2_000_000);
  if (!text.trim()) {
    throw new Error("Pasted resume text cannot be empty");
  }
  return {
    label: label || "Pasted career evidence",
    text,
  };
}

export function validateUserAuthoredEvidenceInput(
  value: unknown,
): UserAuthoredEvidenceInput {
  const record = requireRecord(value, "User-authored Career Evidence");
  const statement = requireString(record.statement, "Evidence statement", 20_000).trim();
  if (!statement) {
    throw new Error("Evidence statement cannot be empty");
  }
  const subjectType = evidenceSubjectType(record.subjectType);

  return {
    subjectType,
    statement,
    organization: optionalString(record.organization, "Evidence organization"),
    titleOrName: optionalString(record.titleOrName, "Evidence title or name"),
    startDate: optionalString(record.startDate, "Evidence start date", 100),
    endDate: optionalString(record.endDate, "Evidence end date", 100),
    skills: optionalStringArray(record.skills, "Evidence skills"),
    methodsOrTools: optionalStringArray(record.methodsOrTools, "Evidence methods or tools"),
    scope: optionalStringArray(record.scope, "Evidence scope"),
    outcomes: optionalStringArray(record.outcomes, "Evidence outcomes"),
    metrics: optionalStringArray(record.metrics, "Evidence metrics"),
    credential: credentialDetails(record.credential, subjectType),
  };
}

export function validateEvidenceReviewUpdate(value: unknown): EvidenceReviewUpdate {
  const record = requireRecord(value, "Evidence review");
  const action = evidenceReviewAction(record.action);
  const update: EvidenceReviewUpdate = { action };

  if (record.subjectType !== undefined) {
    update.subjectType = evidenceSubjectType(record.subjectType);
  }
  if (record.statement !== undefined) {
    update.statement = requireString(record.statement, "Evidence statement", 20_000).trim();
  }
  if (action === "edit" && !update.statement) {
    throw new Error("Edited evidence statement cannot be empty");
  }
  return update;
}

function validateTrackedApplication(value: unknown): TrackedApplication {
  const record = requireRecord(value, "Legacy application");
  return {
    id: validateCareerEntityId(record.id, "Application id"),
    jobId: requireString(record.jobId, "Job id", 500).trim(),
    title: requireString(record.title, "Application title", 1000).trim(),
    companyName: requireString(record.companyName, "Company name", 1000).trim(),
    url: externalUrl(record.url, "Application URL"),
    status: applicationStatus(record.status),
    notes: requireString(record.notes, "Application notes", 50000),
    createdAt: isoLikeString(record.createdAt, "Application createdAt"),
    updatedAt: isoLikeString(record.updatedAt, "Application updatedAt"),
  };
}

export function validateLegacyCareerMigration(value: unknown): LegacyCareerMigration {
  const record = requireRecord(value, "Legacy career migration");
  if (!Array.isArray(record.applications)) {
    throw new Error("Legacy applications must be an array");
  }
  if (record.applications.length > 10000) {
    throw new Error("Legacy migration contains too many applications");
  }

  return {
    profile:
      record.profile === null || record.profile === undefined
        ? null
        : validateCareerProfile(record.profile),
    applications: record.applications.map(validateTrackedApplication),
  };
}
