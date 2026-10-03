import type {
  CareerSearchConstraints,
  CareerTargetTrackInput,
  EmploymentArrangement,
  OnCallPreference,
  PayBasis,
  PreferenceStrength,
  TargetTrackRelation,
  WorkMode,
  WorkSchedule,
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

function preferenceStrength(value: unknown, label: string): PreferenceStrength {
  if (
    value !== "required" &&
    value !== "preferred" &&
    value !== "target" &&
    value !== "unspecified"
  ) {
    throw new Error(`${label} must be required, preferred, target, or unspecified`);
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

function requireValuesWhenRequired(
  values: readonly unknown[],
  strength: PreferenceStrength,
  label: string,
): void {
  if (strength === "required" && values.length === 0) {
    throw new Error(`${label} cannot be required without at least one value`);
  }
}

function validateConstraints(value: unknown): CareerSearchConstraints {
  const record = requireRecord(value, "Target track constraints");
  const geography = requireRecord(record.geography, "Geography preference");
  const workModes = requireRecord(record.workModes, "Work mode preference");
  const arrangements = requireRecord(
    record.employmentArrangements,
    "Employment arrangement preference",
  );
  const schedules = record.schedules === undefined
    ? null
    : requireRecord(record.schedules, "Schedule availability");
  const compensation = requireRecord(record.compensation, "Compensation preference");
  const onCall = requireRecord(record.onCall, "On-call preference");
  const industries = requireRecord(record.industries, "Industry preference");

  const geographyLocations = stringArray(geography.locations, "Geography locations");
  const geographyRadius = nullableNumber(geography.radiusMiles, "Geography radius");
  const geographyStrength = preferenceStrength(geography.strength, "Geography strength");
  if (
    geographyStrength === "required" &&
    geographyLocations.length === 0 &&
    geographyRadius === null
  ) {
    throw new Error("Geography cannot be required without a location or radius");
  }

  const workModeValues = enumArray<WorkMode>(
    workModes.values,
    "Work modes",
    ["remote", "hybrid", "on-site"],
  );
  const workModeStrength = preferenceStrength(workModes.strength, "Work mode strength");
  requireValuesWhenRequired(workModeValues, workModeStrength, "Work mode");

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
  const arrangementStrength = preferenceStrength(
    arrangements.strength,
    "Employment arrangement strength",
  );
  requireValuesWhenRequired(
    arrangementValues,
    arrangementStrength,
    "Employment arrangement",
  );

  let scheduleValues: WorkSchedule[] = [];
  let scheduleStrength: PreferenceStrength = "preferred";
  if (schedules) {
    scheduleValues = enumArray<WorkSchedule>(
      schedules.values,
      "Schedule availability",
      ["day", "evening", "night", "weekend", "rotating"],
    );
    scheduleStrength = preferenceStrength(schedules.strength, "Schedule strength");
    if (scheduleStrength === "unspecified") {
      throw new Error("Schedule strength cannot be unspecified because no legacy schedule meaning exists");
    }
    requireValuesWhenRequired(scheduleValues, scheduleStrength, "Schedule availability");
  }

  const floor = nullableNumber(compensation.floor, "Compensation floor");
  const target = nullableNumber(compensation.target, "Compensation target");
  const floorStrength = preferenceStrength(
    compensation.floorStrength,
    "Compensation floor strength",
  );
  if (floorStrength === "required" && floor === null) {
    throw new Error("Compensation floor cannot be required without a floor value");
  }
  if (floor !== null && target !== null && target < floor) {
    throw new Error("Compensation target cannot be below the compensation floor");
  }

  const industryValues = stringArray(industries.values, "Industries");
  const industryStrength = preferenceStrength(industries.strength, "Industry strength");
  requireValuesWhenRequired(industryValues, industryStrength, "Industry preference");

  return {
    geography: {
      locations: geographyLocations,
      radiusMiles: geographyRadius,
      strength: geographyStrength,
    },
    workModes: {
      values: workModeValues,
      strength: workModeStrength,
    },
    employmentArrangements: {
      values: arrangementValues,
      strength: arrangementStrength,
    },
    schedules: {
      values: scheduleValues,
      strength: scheduleStrength,
    },
    compensation: {
      floor,
      target,
      basis: payBasis(compensation.basis),
      floorStrength,
    },
    onCall: {
      value: onCallPreference(onCall.value),
      strength: preferenceStrength(onCall.strength, "On-call strength"),
    },
    industries: {
      values: industryValues,
      strength: industryStrength,
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
