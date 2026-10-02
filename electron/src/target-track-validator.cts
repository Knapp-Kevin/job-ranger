import type {
  CareerSearchConstraints,
  CareerTargetTrackInput,
  EmploymentArrangement,
  OnCallPreference,
  PayBasis,
  PreferenceStrength,
  TargetTrackRelation,
  WorkMode,
} from "../../src/shared/contracts.js";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, maxLength = 1000): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (value.length > maxLength) throw new Error(`${label} is too long`);
  return value.trim();
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = stringValue(value, label, 2000);
  return normalized || null;
}

function stringArray(value: unknown, label: string, maxItems = 100): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maxItems) throw new Error(`${label} contains too many values`);
  return Array.from(
    new Set(
      value.map((entry, index) => stringValue(entry, `${label}[${index}]`, 500)).filter(Boolean),
    ),
  );
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number or null`);
  }
  return value;
}

function preferenceStrength(value: unknown, label: string): Exclude<PreferenceStrength, "unspecified"> {
  if (value !== "required" && value !== "preferred" && value !== "target") {
    throw new Error(`${label} must be required, preferred, or target`);
  }
  return value;
}

function relation(value: unknown): TargetTrackRelation {
  if (value !== "current" && value !== "adjacent" && value !== "stretch" && value !== "target") {
    throw new Error("Target track relation is invalid");
  }
  return value;
}

function payBasis(value: unknown): PayBasis {
  if (value !== "hourly" && value !== "annual") throw new Error("Pay basis is invalid");
  return value;
}

function onCallPreference(value: unknown): OnCallPreference {
  if (value !== "yes" && value !== "no" && value !== "either") {
    throw new Error("On-call preference is invalid");
  }
  return value;
}

function enumArray<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T[] {
  const values = stringArray(value, label, 20);
  for (const entry of values) {
    if (!allowed.includes(entry as T)) throw new Error(`${label} contains an invalid value`);
  }
  return values as T[];
}

function validateConstraints(value: unknown): CareerSearchConstraints {
  const record = requireRecord(value, "Target track constraints");
  const geography = requireRecord(record.geography, "Geography preference");
  const workModes = requireRecord(record.workModes, "Work mode preference");
  const arrangements = requireRecord(
    record.employmentArrangements,
    "Employment arrangement preference",
  );
  const compensation = requireRecord(record.compensation, "Compensation preference");
  const onCall = requireRecord(record.onCall, "On-call preference");
  const industries = requireRecord(record.industries, "Industry preference");

  const workModeValues = enumArray<WorkMode>(
    workModes.values,
    "Work modes",
    ["remote", "hybrid", "on-site"],
  );
  const arrangementValues = enumArray<EmploymentArrangement>(
    arrangements.values,
    "Employment arrangements",
    [
      "full-time",
      "part-time",
      "contract",
      "temporary",
      "internship",
      "freelance",
      "seasonal",
      "other",
    ],
  );

  return {
    geography: {
      locations: stringArray(geography.locations, "Geography locations"),
      radiusMiles: nullableNumber(geography.radiusMiles, "Geography radius"),
      strength: preferenceStrength(geography.strength, "Geography strength"),
    },
    workModes: {
      values: workModeValues,
      strength: preferenceStrength(workModes.strength, "Work mode strength"),
    },
    employmentArrangements: {
      values: arrangementValues,
      strength: preferenceStrength(arrangements.strength, "Employment arrangement strength"),
    },
    compensation: {
      floor: nullableNumber(compensation.floor, "Compensation floor"),
      target: nullableNumber(compensation.target, "Compensation target"),
      basis: payBasis(compensation.basis),
      floorStrength: preferenceStrength(
        compensation.floorStrength,
        "Compensation floor strength",
      ),
    },
    onCall: {
      value: onCallPreference(onCall.value),
      strength: preferenceStrength(onCall.strength, "On-call strength"),
    },
    industries: {
      values: stringArray(industries.values, "Industries"),
      strength: preferenceStrength(industries.strength, "Industry strength"),
    },
  };
}

export function validateCareerTargetTrackInput(value: unknown): CareerTargetTrackInput {
  const record = requireRecord(value, "Target track");
  const name = stringValue(record.name, "Target track name", 200);
  if (!name) throw new Error("Target track name is required");
  if (typeof record.isActive !== "boolean") throw new Error("Target track active flag must be true or false");

  return {
    name,
    relation: relation(record.relation),
    roleTitles: stringArray(record.roleTitles, "Target roles"),
    seniority: nullableString(record.seniority, "Seniority"),
    direction: nullableString(record.direction, "Career direction"),
    constraints: validateConstraints(record.constraints),
    isActive: record.isActive,
  };
}
