export type OfferStatus = "active" | "accepted" | "declined" | "withdrawn" | "expired";
export type OfferPayBasis = "annual" | "hourly" | "other";

export interface ApplicationOffer {
  applicationId: string;
  status: OfferStatus;
  basePay: number | null;
  payBasis: OfferPayBasis;
  currency: string;
  bonusNotes: string;
  equityNotes: string;
  benefitsNotes: string;
  startDate: string | null;
  responseDeadline: string | null;
  negotiationNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationOfferInput {
  status: OfferStatus;
  basePay?: number | null;
  payBasis: OfferPayBasis;
  currency?: string;
  bonusNotes?: string;
  equityNotes?: string;
  benefitsNotes?: string;
  startDate?: string | null;
  responseDeadline?: string | null;
  negotiationNotes?: string;
}

export interface ApplicationSearchContext {
  applicationId: string;
  targetTrackId: string | null;
  targetTrackName: string | null;
  updatedAt: string | null;
}

export interface ApplicationInsightDetail {
  applicationId: string;
  searchContext: ApplicationSearchContext;
  offer: ApplicationOffer | null;
}

export type LearningGroupDimension = "target-track" | "source-type" | "source-class" | "opportunity-category";

export interface OutcomeGroup {
  dimension: LearningGroupDimension;
  key: string;
  label: string;
  tracked: number;
  applied: number;
  interviews: number;
  offers: number;
  rejections: number;
  withdrawals: number;
}

export interface SearchLearningTotals {
  tracked: number;
  applied: number;
  interviews: number;
  offers: number;
  rejections: number;
  withdrawals: number;
}

export interface RecurringGapSignal {
  key: string;
  kind: "skill-or-requirement" | "credential";
  label: string;
  applicationCount: number;
  requirementCount: number;
  examples: string[];
}

export type StrategySignalKind = "insufficient-data" | "outcome-pattern" | "recurring-gap" | "source-pattern";

export interface StrategySignal {
  id: string;
  kind: StrategySignalKind;
  sampleSize: number;
  observation: string;
  recommendation: string | null;
  caveat: string;
}

export interface SearchLearningSnapshot {
  generatedAt: string;
  totals: SearchLearningTotals;
  repeatedGaps: RecurringGapSignal[];
  outcomeGroups: OutcomeGroup[];
  strategySignals: StrategySignal[];
}

export interface ApplicationInsightsDesktopApi {
  applicationInsights: {
    get: (applicationId: string) => Promise<ApplicationInsightDetail>;
    setTargetTrack: (
      applicationId: string,
      targetTrackId: string | null,
    ) => Promise<ApplicationSearchContext>;
    saveOffer: (
      applicationId: string,
      input: ApplicationOfferInput,
    ) => Promise<ApplicationOffer>;
    deleteOffer: (applicationId: string) => Promise<void>;
    getSearchLearning: () => Promise<SearchLearningSnapshot>;
  };
}
