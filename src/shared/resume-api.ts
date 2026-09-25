import type { ResumeStatement } from "./career-contracts.js";
import type {
  ResumeCreateInput,
  ResumeExportRequest,
  ResumeExportResult,
  ResumeProjectionDetail,
  ResumeProjectionRecord,
  ResumeStatementUpdate,
  ResumeVersionDiff,
} from "./resume-contracts.js";

export interface ResumeDesktopApi {
  resume: {
    list: () => Promise<ResumeProjectionRecord[]>;
    create: (input: ResumeCreateInput) => Promise<ResumeProjectionDetail>;
    get: (id: string) => Promise<ResumeProjectionDetail>;
    updateStatement: (
      id: string,
      update: ResumeStatementUpdate,
    ) => Promise<ResumeStatement>;
    exportPdf: (request: ResumeExportRequest) => Promise<ResumeExportResult>;
    compareVersions: (
      fromArtifactId: string,
      toArtifactId: string,
    ) => Promise<ResumeVersionDiff>;
  };
}
