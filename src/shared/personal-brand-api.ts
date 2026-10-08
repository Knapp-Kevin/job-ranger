import type {
  AnalyticsSnapshot, ManualPostPackage, ManualPublicationReceipt,
  PersonalBrandDraft,
} from "./personal-brand.js";

export type PersonalBrandDraftInput = Omit<PersonalBrandDraft, "id" | "revision">;

export type AnalyticsSnapshotInput = Pick<AnalyticsSnapshot,
  "capturedAt" | "windowStart" | "windowEnd" | "sourceLabel" | "observations">;

export interface PersonalBrandDesktopApi {
  personalBrand: {
    listDrafts(): Promise<PersonalBrandDraft[]>;
    createDraft(input: PersonalBrandDraftInput): Promise<PersonalBrandDraft>;
    updateDraft(id: string, expectedRevision: number, input: PersonalBrandDraftInput): Promise<PersonalBrandDraft>;
    prepareDraft(id: string, expectedRevision: number, humanReviewConfirmed: boolean): Promise<ManualPostPackage>;
    listPrepared(): Promise<ManualPostPackage[]>;
    confirmPublication(input: {
      draftId: string;
      revision: number;
      publishedUrl: string;
      publishedAt: string;
      userConfirmed: boolean;
    }): Promise<ManualPublicationReceipt>;
    listPublications(): Promise<ManualPublicationReceipt[]>;
    appendSnapshot(postId: string, input: AnalyticsSnapshotInput): Promise<AnalyticsSnapshot>;
    listSnapshots(postId: string): Promise<AnalyticsSnapshot[]>;
  };
}
