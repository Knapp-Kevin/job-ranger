import { createHash } from "node:crypto";
import type { Company } from "../../src/shared/contracts.js";
import type {
  SourceDiscoveryCandidate,
  SourceDiscoveryRequest,
  SourceDiscoveryResult,
} from "../../src/shared/source-discovery.js";
import { getSourceProfile } from "../../src/shared/contracts.js";
import { detectSourceFromUrl } from "./scrapers.cjs";

const REMOTE_OK_ENDPOINT = "https://remoteok.com/api";
const ARBEITNOW_ENDPOINT = "https://www.arbeitnow.com/api/job-board-api?page=1";
const STRUCTURED_MONITORABLE_TYPES = new Set([
  "greenhouse",
  "lever",
  "smartrecruiters",
  "ashby",
]);

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "senior",
  "junior",
  "lead",
  "manager",
  "specialist",
  "engineer",
  "developer",
]);

interface DiscoveryContext {
  fetchImpl: typeof fetch;
  existingCompanies: Company[];
  now?: () => string;
}

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  company?: string;
  position?: string;
  location?: string;
  description?: string;
  tags?: string[];
  salary_min?: number | string;
  salary_max?: number | string;
  date?: string;
  url?: string;
  apply_url?: string;
}

interface ArbeitnowResponse {
  data?: Array<{
    slug?: string;
    company_name?: string;
    title?: string;
    description?: string;
    remote?: boolean;
    url?: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    created_at?: number;
  }>;
}

function stableId(value: string): string {
  return `discovery-${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function roleMatchScore(title: string, roleTitles: readonly string[]): number {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return 0;
  let best = 0;
  for (const role of roleTitles) {
    const normalizedRole = normalize(role);
    if (!normalizedRole) continue;
    if (normalizedTitle.includes(normalizedRole) || normalizedRole.includes(normalizedTitle)) {
      best = Math.max(best, 1);
      continue;
    }
    const tokens = meaningfulTokens(role);
    if (tokens.length === 0) continue;
    const matched = tokens.filter((token) => normalizedTitle.includes(token)).length;
    best = Math.max(best, matched / tokens.length);
  }
  return best;
}

function cleanHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function snippet(value: string | undefined): string {
  const text = cleanHtml(value);
  return text.length <= 260 ? text : `${text.slice(0, 257).trimEnd()}...`;
}

function toIsoFromEpoch(epoch: number | undefined): string | null {
  if (!epoch || !Number.isFinite(epoch)) return null;
  const date = new Date(epoch * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isAggregatorUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === "remoteok.com" || host.endsWith(".remoteok.com") || host === "arbeitnow.com" || host.endsWith(".arbeitnow.com");
  } catch {
    return true;
  }
}

function monitoringCandidate(
  applyUrl: string | undefined,
  employerName: string,
  existingCompanies: readonly Company[],
): Pick<
  SourceDiscoveryCandidate,
  | "sourceUrl"
  | "sourceType"
  | "sourceSupportLevel"
  | "sourceLabel"
  | "canMonitor"
  | "duplicateCompanyId"
> {
  if (!applyUrl || isAggregatorUrl(applyUrl)) {
    return {
      sourceUrl: null,
      sourceType: null,
      sourceSupportLevel: null,
      sourceLabel: null,
      canMonitor: false,
      duplicateCompanyId: null,
    };
  }

  const detected = detectSourceFromUrl(applyUrl);
  if (!STRUCTURED_MONITORABLE_TYPES.has(detected.sourceType) || !detected.sourceIdentifier) {
    return {
      sourceUrl: null,
      sourceType: null,
      sourceSupportLevel: null,
      sourceLabel: null,
      canMonitor: false,
      duplicateCompanyId: null,
    };
  }

  const profile = getSourceProfile(detected.sourceType);
  const duplicate = existingCompanies.find(
    (company) =>
      company.sourceType === detected.sourceType &&
      company.sourceIdentifier === detected.sourceIdentifier,
  );

  return {
    sourceUrl: applyUrl,
    sourceType: detected.sourceType,
    sourceSupportLevel: profile.supportLevel,
    sourceLabel: `${employerName} · ${profile.label}`,
    canMonitor: !duplicate,
    duplicateCompanyId: duplicate?.id ?? null,
  };
}

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Job Ranger Desktop/1.0 source discovery",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function remoteOkCandidates(
  rows: RemoteOkJob[],
  request: SourceDiscoveryRequest,
  companies: readonly Company[],
): SourceDiscoveryCandidate[] {
  return rows
    .filter((row) => row.position && row.company && row.url)
    .map((row) => ({ row, score: roleMatchScore(row.position ?? "", request.roleTitles) }))
    .filter(({ score }) => score >= 0.5)
    .map(({ row }) => {
      const employerName = row.company!.trim();
      const monitor = monitoringCandidate(row.apply_url, employerName, companies);
      const opportunityUrl = row.url!;
      return {
        id: stableId(`remoteok\n${String(row.id ?? row.slug ?? opportunityUrl)}`),
        providerId: "public-job-feeds" as const,
        providerName: "Public job feeds",
        employerName,
        opportunityTitle: row.position!.trim(),
        opportunityUrl,
        applyUrl: row.apply_url?.trim() || null,
        location: row.location?.trim() || "Remote / unspecified",
        employmentType: null,
        publishedAt: row.date?.trim() || null,
        ...monitor,
        provenanceUrl: opportunityUrl,
        summary: snippet(row.description) || `Remote OK listing tagged ${(row.tags ?? []).slice(0, 4).join(", ") || "without structured tags"}.`,
      };
    });
}

function arbeitnowCandidates(
  response: ArbeitnowResponse,
  request: SourceDiscoveryRequest,
): SourceDiscoveryCandidate[] {
  return (response.data ?? [])
    .filter((row) => row.title && row.company_name && row.url)
    .map((row) => ({ row, score: roleMatchScore(row.title ?? "", request.roleTitles) }))
    .filter(({ score }) => score >= 0.5)
    .map(({ row }) => {
      const opportunityUrl = row.url!;
      return {
        id: stableId(`arbeitnow\n${row.slug ?? opportunityUrl}`),
        providerId: "public-job-feeds" as const,
        providerName: "Public job feeds",
        employerName: row.company_name!.trim(),
        opportunityTitle: row.title!.trim(),
        opportunityUrl,
        applyUrl: null,
        location: row.location?.trim() || (row.remote ? "Remote" : "Unspecified"),
        employmentType: row.job_types?.[0]?.trim() || null,
        publishedAt: toIsoFromEpoch(row.created_at),
        sourceUrl: null,
        sourceType: null,
        sourceSupportLevel: null,
        sourceLabel: null,
        canMonitor: false,
        duplicateCompanyId: null,
        provenanceUrl: opportunityUrl,
        summary: snippet(row.description) || `Arbeitnow listing tagged ${(row.tags ?? []).slice(0, 4).join(", ") || "without structured tags"}.`,
      };
    });
}

export async function discoverPublicJobFeeds(
  request: SourceDiscoveryRequest,
  context: DiscoveryContext,
): Promise<SourceDiscoveryResult> {
  const warnings = [
    "Coverage is partial. Remote OK is remote-first and Arbeitnow skews toward Europe/remote roles; results are not an exhaustive job-market search.",
    "Location is shown from provider data but is not used as a hard discovery filter in this first provider because feed location fields are inconsistent.",
  ];

  const [remoteOk, arbeitnow] = await Promise.allSettled([
    fetchJson<RemoteOkJob[]>(REMOTE_OK_ENDPOINT, context.fetchImpl),
    fetchJson<ArbeitnowResponse>(ARBEITNOW_ENDPOINT, context.fetchImpl),
  ]);

  let candidates: SourceDiscoveryCandidate[] = [];
  let providerSuccesses = 0;

  if (remoteOk.status === "fulfilled") {
    providerSuccesses += 1;
    candidates.push(...remoteOkCandidates(remoteOk.value, request, context.existingCompanies));
  } else {
    warnings.push(`Remote OK was unavailable for this discovery run: ${remoteOk.reason instanceof Error ? remoteOk.reason.message : String(remoteOk.reason)}`);
  }

  if (arbeitnow.status === "fulfilled") {
    providerSuccesses += 1;
    candidates.push(...arbeitnowCandidates(arbeitnow.value, request));
  } else {
    warnings.push(`Arbeitnow was unavailable for this discovery run: ${arbeitnow.reason instanceof Error ? arbeitnow.reason.message : String(arbeitnow.reason)}`);
  }

  const seen = new Set<string>();
  candidates = candidates
    .filter((candidate) => {
      const key = `${normalize(candidate.employerName)}\n${normalize(candidate.opportunityTitle)}\n${normalize(candidate.opportunityUrl)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, request.limit);

  return {
    providerId: "public-job-feeds",
    providerName: "Public job feeds",
    coverage: providerSuccesses > 0 ? "partial" : "unavailable",
    generatedAt: (context.now ?? (() => new Date().toISOString()))(),
    candidates,
    warnings,
    searchedRoleTitles: [...request.roleTitles],
    searchedLocations: [...request.locations],
  };
}
