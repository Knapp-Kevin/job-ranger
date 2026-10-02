import type {
  CareerTargetTrack,
  EmploymentArrangement,
  PayBasis,
  PreferenceStrength,
  WorkMode,
} from "./career-contracts.js";
import type { JobEvidenceCoverage } from "./requirement-coverage.js";

export type EligibilityStatus = "likely" | "unclear" | "unlikely";
export type EvidenceCoverageStatus = "strong" | "partial" | "limited" | "unknown";
export type AlignmentStatus = "aligned" | "mixed" | "misaligned" | "unknown";

export interface AssessableJob {
  id: string;
  title: string;
  location: string;
  employmentType: string | null;
  descriptionSnippet: string;
  salaryMin: number | null;
  salaryText: string | null;
  sourceType: string;
}

export interface OpportunityAssessment {
  jobId: string;
  targetTrackId: string;
  targetTrackName: string;
  eligibility: {
    status: EligibilityStatus;
    blockers: string[];
    potentialBlockers: string[];
  };
  evidenceCoverage: {
    status: EvidenceCoverageStatus;
    directCount: number;
    transferableCount: number;
    ambiguousCount: number;
    gapCount: number;
    totalCount: number;
  };
  careerAlignment: {
    status: AlignmentStatus;
    reasons: string[];
  };
  preferenceAlignment: {
    status: AlignmentStatus;
    matches: string[];
    misses: string[];
    unknowns: string[];
  };
  unknowns: string[];
  generatedAt: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function titleSimilarity(jobTitle: string, targetTitle: string): number {
  const job = normalize(jobTitle);
  const target = normalize(targetTitle);
  if (!job || !target) return 0;
  if (job.includes(target) || target.includes(job)) return 1;

  const targetTokens = tokens(targetTitle);
  if (targetTokens.length === 0) return 0;
  const jobTokens = new Set(tokens(jobTitle));
  return targetTokens.filter((token) => jobTokens.has(token)).length / targetTokens.length;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatPay(value: number, basis: PayBasis): string {
  return `${formatMoney(value)}/${basis === "hourly" ? "hr" : "yr"}`;
}

function detectPayBasis(job: AssessableJob): PayBasis | null {
  const salaryText = normalize(job.salaryText ?? "");
  if (salaryText.includes("hour") || salaryText.includes("/hr") || salaryText.includes("hourly")) {
    return "hourly";
  }
  if (salaryText.includes("year") || salaryText.includes("annual") || salaryText.includes("salary")) {
    return "annual";
  }
  if (job.salaryMin !== null && job.salaryMin > 1000) return "annual";
  return null;
}

function payEquivalent(job: AssessableJob, targetBasis: PayBasis): number | null {
  if (job.salaryMin === null) return null;
  const sourceBasis = detectPayBasis(job);
  if (!sourceBasis) return null;
  if (sourceBasis === targetBasis) return job.salaryMin;
  return targetBasis === "hourly" ? job.salaryMin / 2080 : job.salaryMin * 2080;
}

function detectWorkMode(job: AssessableJob): WorkMode | null {
  const text = normalize(`${job.location} ${job.descriptionSnippet}`);
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\bremote\b|\bwork from home\b|\bwfh\b/.test(text)) return "remote";
  if (/\bon-site\b|\bonsite\b|\bon site\b|\bin-person\b|\bin person\b/.test(text)) {
    return "on-site";
  }
  return null;
}

type OnCallRequirement = "required" | "not-required" | "unknown";

function detectOnCallRequirement(job: AssessableJob): OnCallRequirement {
  const text = normalize(`${job.title} ${job.descriptionSnippet}`);
  if (!/\bon[- ]?call\b/.test(text)) return "unknown";

  const explicitlyNotRequired =
    /\b(no|without)\s+(?:regular\s+)?on[- ]?call\b/.test(text) ||
    /\bnot\s+(?:an?\s+)?on[- ]?call\b/.test(text) ||
    /\bdoes not require\b.{0,30}\bon[- ]?call\b/.test(text) ||
    /\bon[- ]?call\b.{0,40}\b(not required|not expected|optional|none)\b/.test(text);

  return explicitlyNotRequired ? "not-required" : "required";
}

function detectEmploymentArrangement(value: string | null): EmploymentArrangement | null {
  const text = normalize(value ?? "");
  if (!text) return null;
  if (text.includes("full time") || text.includes("full-time")) return "full-time";
  if (text.includes("part time") || text.includes("part-time")) return "part-time";
  if (text.includes("intern")) return "internship";
  if (text.includes("freelance")) return "freelance";
  if (text.includes("season")) return "seasonal";
  if (text.includes("temp")) return "temporary";
  if (text.includes("contract")) return "contract";
  return "other";
}

function supplied(strength: PreferenceStrength, hasValue: boolean): boolean {
  return hasValue && strength !== "unspecified";
}

function addConstraintResult(
  strength: PreferenceStrength,
  result: "match" | "miss" | "unknown",
  detail: string,
  matches: string[],
  misses: string[],
  unknowns: string[],
  blockers: string[],
  potentialBlockers: string[],
): void {
  if (result === "match") {
    matches.push(detail);
    return;
  }
  if (result === "miss") {
    misses.push(detail);
    if (strength === "required") blockers.push(detail);
    return;
  }
  unknowns.push(detail);
  if (strength === "required") potentialBlockers.push(detail);
}

function evidenceStatus(coverage: JobEvidenceCoverage): EvidenceCoverageStatus {
  if (coverage.totalCount === 0) return "unknown";
  if (coverage.gapCount === 0 && coverage.ambiguousCount === 0) return "strong";
  if (coverage.supportedCount > 0) return "partial";
  return "limited";
}

function sourceUncertainty(sourceType: string): string | null {
  const structured = new Set(["greenhouse", "lever", "smartrecruiters", "ashby"]);
  if (structured.has(sourceType)) return null;
  return "This source may not expose every requirement or field, so missing listing data remains uncertain.";
}

function requirementCanBlock(
  kind: JobEvidenceCoverage["items"][number]["requirement"]["kind"],
  text: string,
): boolean {
  if (kind === "must-have") return true;
  if (kind !== "credential") return false;
  const normalized = normalize(text);
  return !/\b(prefer|preferred|nice to have|plus|bonus|desirable)\b/.test(normalized);
}

export function buildOpportunityAssessment(
  job: AssessableJob,
  track: CareerTargetTrack,
  coverage: JobEvidenceCoverage,
  now = new Date().toISOString(),
): OpportunityAssessment {
  const blockers: string[] = [];
  const potentialBlockers: string[] = [];
  const matches: string[] = [];
  const misses: string[] = [];
  const preferenceUnknowns: string[] = [];
  let configuredPreferenceCount = 0;

  for (const item of coverage.items) {
    const unsupported =
      item.mapping.classification === "gap" || item.mapping.classification === "ambiguous";
    if (requirementCanBlock(item.requirement.kind, item.requirement.text) && unsupported) {
      potentialBlockers.push(
        `${item.requirement.text} (${item.mapping.classification === "gap" ? "no confirmed support" : "support needs confirmation"}).`,
      );
    }
  }

  const geography = track.constraints.geography;
  if (supplied(geography.strength, geography.locations.length > 0)) {
    configuredPreferenceCount += 1;
    const jobLocation = normalize(job.location);
    const matchedLocation = jobLocation
      ? geography.locations.find((location) => {
          const target = normalize(location);
          return Boolean(target && (jobLocation.includes(target) || target.includes(jobLocation)));
        })
      : undefined;

    if (matchedLocation) {
      addConstraintResult(
        geography.strength,
        "match",
        `Location matches ${matchedLocation}.`,
        matches,
        misses,
        preferenceUnknowns,
        blockers,
        potentialBlockers,
      );
    } else if (!jobLocation) {
      addConstraintResult(
        geography.strength,
        "unknown",
        `The listing does not provide enough location detail to evaluate ${geography.locations.join(", ")}.`,
        matches,
        misses,
        preferenceUnknowns,
        blockers,
        potentialBlockers,
      );
    } else {
      addConstraintResult(
        geography.strength,
        "unknown",
        `The listed location (${job.location}) does not textually establish whether it satisfies ${geography.locations.join(", ")}.`,
        matches,
        misses,
        preferenceUnknowns,
        blockers,
        potentialBlockers,
      );
    }
  }

  const workModes = track.constraints.workModes;
  if (supplied(workModes.strength, workModes.values.length > 0)) {
    configuredPreferenceCount += 1;
    const detected = detectWorkMode(job);
    addConstraintResult(
      workModes.strength,
      detected === null ? "unknown" : workModes.values.includes(detected) ? "match" : "miss",
      detected === null
        ? `The listing does not explicitly identify a work mode; your track allows ${workModes.values.join(", ")}.`
        : `Work mode is listed as ${detected}; your track allows ${workModes.values.join(", ")}.`,
      matches,
      misses,
      preferenceUnknowns,
      blockers,
      potentialBlockers,
    );
  }

  const arrangements = track.constraints.employmentArrangements;
  if (supplied(arrangements.strength, arrangements.values.length > 0)) {
    configuredPreferenceCount += 1;
    const detected = detectEmploymentArrangement(job.employmentType);
    addConstraintResult(
      arrangements.strength,
      detected === null
        ? "unknown"
        : arrangements.values.includes(detected)
          ? "match"
          : "miss",
      detected === null
        ? `The listing does not provide a usable employment arrangement; your track allows ${arrangements.values.join(", ")}.`
        : `Employment arrangement is ${detected}; your track allows ${arrangements.values.join(", ")}.`,
      matches,
      misses,
      preferenceUnknowns,
      blockers,
      potentialBlockers,
    );
  }

  const compensation = track.constraints.compensation;
  if (supplied(compensation.floorStrength, compensation.floor !== null)) {
    configuredPreferenceCount += 1;
    const floor = compensation.floor ?? 0;
    const comparable = payEquivalent(job, compensation.basis);
    addConstraintResult(
      compensation.floorStrength,
      comparable === null ? "unknown" : comparable >= floor ? "match" : "miss",
      comparable === null
        ? `The listing does not provide enough pay detail to verify your ${formatPay(floor, compensation.basis)} floor.`
        : `Listed starting pay is approximately ${formatPay(comparable, compensation.basis)} versus your ${formatPay(floor, compensation.basis)} floor.`,
      matches,
      misses,
      preferenceUnknowns,
      blockers,
      potentialBlockers,
    );
  }

  const onCall = track.constraints.onCall;
  if (supplied(onCall.strength, onCall.value !== "either")) {
    configuredPreferenceCount += 1;
    const requirement = detectOnCallRequirement(job);
    const result =
      requirement === "unknown"
        ? "unknown"
        : onCall.value === "yes" || requirement === "not-required"
          ? "match"
          : "miss";
    const detail =
      requirement === "unknown"
        ? `The listing does not establish whether on-call work is required; your track says ${onCall.value}.`
        : requirement === "not-required"
          ? `The listing explicitly says on-call work is not required; your track says ${onCall.value}.`
          : `The listing explicitly requires on-call work; your track says ${onCall.value}.`;
    addConstraintResult(
      onCall.strength,
      result,
      detail,
      matches,
      misses,
      preferenceUnknowns,
      blockers,
      potentialBlockers,
    );
  }

  const industries = track.constraints.industries;
  if (supplied(industries.strength, industries.values.length > 0)) {
    configuredPreferenceCount += 1;
    addConstraintResult(
      industries.strength,
      "unknown",
      `Industry preference (${industries.values.join(", ")}) cannot be verified from the normalized job record yet.`,
      matches,
      misses,
      preferenceUnknowns,
      blockers,
      potentialBlockers,
    );
  }

  const careerReasons: string[] = [];
  let careerStatus: AlignmentStatus = "unknown";
  if (track.roleTitles.length > 0) {
    const best = track.roleTitles
      .map((title) => ({ title, similarity: titleSimilarity(job.title, title) }))
      .sort((left, right) => right.similarity - left.similarity)[0];
    if (best && best.similarity >= 0.66) {
      careerStatus = "aligned";
      careerReasons.push(`The role title aligns with your ${best.title} target.`);
    } else if (best && best.similarity > 0) {
      careerStatus = "mixed";
      careerReasons.push(`The role title partially overlaps with your ${best.title} target.`);
    } else {
      careerStatus = "misaligned";
      careerReasons.push("The role title does not clearly overlap with this track's saved target roles.");
    }
  } else {
    careerReasons.push("This target track does not yet include a role title to compare.");
  }

  if (track.seniority) {
    const seniority = normalize(track.seniority);
    careerReasons.push(
      seniority && normalize(job.title).includes(seniority)
        ? `The job title explicitly matches the track's ${track.seniority} seniority.`
        : `The track requests ${track.seniority} seniority, but the normalized listing does not establish that clearly.`,
    );
  }
  if (track.direction) {
    careerReasons.push(
      `Track direction: ${track.direction}. This free-text direction is shown for context rather than semantically scored.`,
    );
  }

  let preferenceStatus: AlignmentStatus;
  if (configuredPreferenceCount === 0) {
    preferenceStatus = "unknown";
    preferenceUnknowns.push("This target track has no explicit comparable preferences or constraints yet.");
  } else if (blockers.length > 0) {
    preferenceStatus = "misaligned";
  } else if (misses.length > 0 || preferenceUnknowns.length > 0) {
    preferenceStatus = "mixed";
  } else {
    preferenceStatus = "aligned";
  }

  const unknowns = [...preferenceUnknowns];
  if (coverage.totalCount === 0) {
    unknowns.push("No explicit job requirements were identified in the listing text currently available.");
  }
  const sourceUnknown = sourceUncertainty(job.sourceType);
  if (sourceUnknown) unknowns.push(sourceUnknown);

  const eligibility: EligibilityStatus =
    blockers.length > 0
      ? "unlikely"
      : potentialBlockers.length > 0 || coverage.totalCount === 0
        ? "unclear"
        : "likely";

  return {
    jobId: job.id,
    targetTrackId: track.id,
    targetTrackName: track.name,
    eligibility: {
      status: eligibility,
      blockers: Array.from(new Set(blockers)),
      potentialBlockers: Array.from(new Set(potentialBlockers)),
    },
    evidenceCoverage: {
      status: evidenceStatus(coverage),
      directCount: coverage.directCount,
      transferableCount: coverage.transferableCount,
      ambiguousCount: coverage.ambiguousCount,
      gapCount: coverage.gapCount,
      totalCount: coverage.totalCount,
    },
    careerAlignment: {
      status: careerStatus,
      reasons: careerReasons,
    },
    preferenceAlignment: {
      status: preferenceStatus,
      matches: Array.from(new Set(matches)),
      misses: Array.from(new Set(misses)),
      unknowns: Array.from(new Set(preferenceUnknowns)),
    },
    unknowns: Array.from(new Set(unknowns)),
    generatedAt: now,
  };
}
