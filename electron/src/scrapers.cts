import type { CompanySourceType } from "../../src/shared/contracts.js";
import { greenhouseAdapter } from "./adapters/greenhouse.cjs";
import { leverAdapter } from "./adapters/lever.cjs";
import { smartrecruitersAdapter } from "./adapters/smartrecruiters.cjs";
import { ashbyAdapter } from "./adapters/ashby.cjs";
import { createGenericHtmlAdapter, browserRequiredAdapter } from "./adapters/generic-html.cjs";
import { toSnippet, extractJobsFromHtml } from "./extractors.cjs";
import { PLATFORM_SELECTORS, getSelectorsForSource } from "./platform-selectors.cjs";
import { parseSalary } from "./salary-parser.cjs";
import {
  assertPublicAcquisitionUrl,
  validateAcquisitionUrlSyntax,
  type AcquisitionHostResolver,
} from "./acquisition-network-policy.cjs";

export { toSnippet, extractJobsFromHtml, PLATFORM_SELECTORS, getSelectorsForSource, parseSalary };

export const genericHtmlSourceTypes = [
  "workday",
  "icims",
  "bamboohr",
  "taleo",
  "oracle",
  "microsoft",
  "generic-html",
] as const;

export interface ScrapedJob {
  sourceJobId: string;
  sourceType: CompanySourceType;
  title: string;
  location: string;
  employmentType: string | null;
  url: string;
  descriptionSnippet: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryText: string | null;
  postDate: string | null;
}

export interface ScraperContext {
  fetchImpl: typeof fetch;
  userAgent: string;
  timeoutMs: number;
  retryCount: number;
  loadPageHtml?: (url: string) => Promise<string>;
  resolveHost?: AcquisitionHostResolver;
}

export interface SourceDetectionResult {
  sourceType: CompanySourceType;
  sourceIdentifier: string | null;
}

export interface ScraperAdapter {
  readonly sourceType: Exclude<CompanySourceType, "unsupported">;
  scrape: (sourceIdentifier: string, context: ScraperContext) => Promise<ScrapedJob[]>;
}

function normalizeToken(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^\/+|\/+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).toString();
  } catch {
    return null;
  }
}

export function isHostOrSubdomain(host: string, domain: string): boolean {
  const normalizedHost = host.toLowerCase().replace(/\.$/, "");
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, "");
  return (
    normalizedHost === normalizedDomain ||
    normalizedHost.endsWith(`.${normalizedDomain}`)
  );
}

function looksLikeCareersPath(pathname: string): boolean {
  return /\b(career|careers|jobs?|job-search|join-us|opportunit|opening|recruit)/i.test(pathname);
}

function isKnownBrowserPortal(host: string): boolean {
  return ["linkedin.com", "indeed.com", "glassdoor.com", "monster.com"].some(
    (domain) => isHostOrSubdomain(host, domain),
  );
}

export function detectSourceFromUrl(rawUrl: string): SourceDetectionResult {
  try {
    const parsed = validateAcquisitionUrlSyntax(rawUrl);
    const normalizedUrl = parsed.toString();
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    const firstSegment = normalizeToken(segments[0]);

    if (firstSegment && (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io")) {
      return { sourceType: "greenhouse", sourceIdentifier: firstSegment };
    }
    if (firstSegment && (host === "jobs.lever.co" || host === "jobs.eu.lever.co")) {
      return { sourceType: "lever", sourceIdentifier: firstSegment };
    }
    if (
      host === "careers.microsoft.com" ||
      (isHostOrSubdomain(host, "microsoft.com") &&
        (host.startsWith("careers.") || looksLikeCareersPath(pathname)))
    ) {
      return { sourceType: "microsoft", sourceIdentifier: normalizedUrl };
    }
    if (
      isHostOrSubdomain(host, "myworkdayjobs.com") ||
      isHostOrSubdomain(host, "workday.com")
    ) {
      return { sourceType: "workday", sourceIdentifier: normalizedUrl };
    }
    if (isHostOrSubdomain(host, "icims.com")) {
      return { sourceType: "icims", sourceIdentifier: normalizedUrl };
    }
    if (isHostOrSubdomain(host, "smartrecruiters.com")) {
      return { sourceType: "smartrecruiters", sourceIdentifier: normalizedUrl };
    }
    if (isHostOrSubdomain(host, "ashbyhq.com")) {
      return { sourceType: "ashby", sourceIdentifier: normalizedUrl };
    }
    if (isHostOrSubdomain(host, "bamboohr.com")) {
      return { sourceType: "bamboohr", sourceIdentifier: normalizedUrl };
    }
    if (
      isHostOrSubdomain(host, "taleo.net") ||
      isHostOrSubdomain(host, "oraclecloud.com")
    ) {
      return { sourceType: "taleo", sourceIdentifier: normalizedUrl };
    }
    if (
      isHostOrSubdomain(host, "oracle.com") &&
      (looksLikeCareersPath(pathname) || pathname.startsWith("/careers"))
    ) {
      return { sourceType: "oracle", sourceIdentifier: normalizedUrl };
    }
    if (isKnownBrowserPortal(host)) {
      return { sourceType: "browser-required", sourceIdentifier: normalizedUrl };
    }
  } catch {
    return { sourceType: "unsupported", sourceIdentifier: null };
  }
  return { sourceType: "unsupported", sourceIdentifier: null };
}

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const maxRedirects = 5;

async function validateContextUrl(url: string, context: ScraperContext): Promise<string> {
  if (context.resolveHost) {
    return assertPublicAcquisitionUrl(url, context.resolveHost);
  }
  if (context.fetchImpl === globalThis.fetch) {
    return assertPublicAcquisitionUrl(url);
  }
  return validateAcquisitionUrlSyntax(url).toString();
}

async function fetchWithAcquisitionPolicy(
  url: string,
  context: ScraperContext,
  init: RequestInit,
): Promise<Response> {
  let currentUrl = await validateContextUrl(url, context);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await context.fetchImpl(currentUrl, {
      ...init,
      redirect: "manual",
    });

    if (!redirectStatuses.has(response.status)) return response;

    const location = response.headers.get("location");
    if (!location) return response;
    if (redirectCount === maxRedirects) {
      throw new Error("Too many redirects while fetching this source.");
    }

    currentUrl = await validateContextUrl(new URL(location, currentUrl).toString(), context);
  }

  throw new Error("Too many redirects while fetching this source.");
}

export async function fetchJson<T>(url: string, context: ScraperContext): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= context.retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const response = await fetchWithAcquisitionPolicy(url, context, {
        headers: { Accept: "application/json", "User-Agent": context.userAgent },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} while fetching a source endpoint`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Failed to fetch source data");
}

async function fetchText(url: string, context: ScraperContext): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= context.retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const response = await fetchWithAcquisitionPolicy(url, context, {
        headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": context.userAgent },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} while fetching a source page`);
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Failed to fetch source page");
}

export async function extractJobsFromRemotePage(
  url: string,
  sourceType: CompanySourceType,
  context: ScraperContext,
  preferBrowser = false,
): Promise<ScrapedJob[]> {
  const safeUrl = await validateContextUrl(url, context);
  const loaders: Array<() => Promise<string>> = [];
  if (preferBrowser && context.loadPageHtml) loaders.push(() => context.loadPageHtml!(safeUrl));
  loaders.push(() => fetchText(safeUrl, context));
  if (!preferBrowser && context.loadPageHtml) loaders.push(() => context.loadPageHtml!(safeUrl));

  let lastError: Error | null = null;
  for (const loadHtml of loaders) {
    try {
      const html = await loadHtml();
      const jobs = extractJobsFromHtml(safeUrl, html, sourceType);
      if (jobs.length > 0) return jobs;
      lastError = new Error("No job listings extracted. A dedicated adapter may be required.");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("Failed to extract job listings from the source page.");
}

export const scraperAdapters: Record<Exclude<CompanySourceType, "unsupported">, ScraperAdapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  smartrecruiters: smartrecruitersAdapter,
  ashby: ashbyAdapter,
  workday: createGenericHtmlAdapter("workday"),
  icims: createGenericHtmlAdapter("icims"),
  bamboohr: createGenericHtmlAdapter("bamboohr"),
  taleo: createGenericHtmlAdapter("taleo"),
  oracle: createGenericHtmlAdapter("oracle"),
  microsoft: createGenericHtmlAdapter("microsoft", true),
  "generic-html": createGenericHtmlAdapter("generic-html"),
  "browser-required": browserRequiredAdapter,
};
