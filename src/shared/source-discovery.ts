import type { CompanySourceType, SourceSupportLevel } from "./contracts.js";

export type SourceDiscoveryProviderId = "public-job-feeds";
export type SourceDiscoveryCoverage = "partial" | "unavailable";

export interface SourceDiscoveryRequest {
  targetTrackId: string;
  roleTitles: string[];
  locations: string[];
  limit: number;
}

export interface SourceDiscoveryCandidate {
  id: string;
  providerId: SourceDiscoveryProviderId;
  providerName: string;
  employerName: string;
  opportunityTitle: string;
  opportunityUrl: string;
  applyUrl: string | null;
  location: string;
  employmentType: string | null;
  publishedAt: string | null;
  sourceUrl: string | null;
  sourceType: CompanySourceType | null;
  sourceSupportLevel: SourceSupportLevel | null;
  sourceLabel: string | null;
  canMonitor: boolean;
  duplicateCompanyId: string | null;
  provenanceUrl: string;
  summary: string;
}

export interface SourceDiscoveryResult {
  providerId: SourceDiscoveryProviderId;
  providerName: string;
  coverage: SourceDiscoveryCoverage;
  generatedAt: string;
  candidates: SourceDiscoveryCandidate[];
  warnings: string[];
  searchedRoleTitles: string[];
  searchedLocations: string[];
}

export interface SourceDiscoveryDesktopApi {
  discovery: {
    discover: (request: SourceDiscoveryRequest) => Promise<SourceDiscoveryResult>;
  };
}
