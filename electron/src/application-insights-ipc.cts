import { ipcMain } from "electron";
import { ApplicationInsightsBackend } from "./application-insights-backend.cjs";
import { validateApplicationOfferInput } from "./application-insights-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export function initializeApplicationInsightsIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new ApplicationInsightsBackend(options.databasePath, options.sqliteBinaryPath);
  const ready = backend.initialize();

  ipcMain.handle("application-insights:get", async (_event, applicationId: string) => {
    await ready;
    return backend.getApplicationDetail(validateCareerEntityId(applicationId, "Application id"));
  });
  ipcMain.handle(
    "application-insights:set-target-track",
    async (_event, applicationId: string, targetTrackId: string | null) => {
      await ready;
      return backend.setTargetTrack(
        validateCareerEntityId(applicationId, "Application id"),
        targetTrackId === null ? null : validateCareerEntityId(targetTrackId, "Target track id"),
      );
    },
  );
  ipcMain.handle(
    "application-insights:save-offer",
    async (_event, applicationId: string, input: unknown) => {
      await ready;
      return backend.saveOffer(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationOfferInput(input),
      );
    },
  );
  ipcMain.handle("application-insights:delete-offer", async (_event, applicationId: string) => {
    await ready;
    await backend.deleteOffer(validateCareerEntityId(applicationId, "Application id"));
  });
  ipcMain.handle("application-insights:search-learning", async () => {
    await ready;
    return backend.getSearchLearning();
  });
}
