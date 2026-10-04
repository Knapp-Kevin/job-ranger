import { ipcMain } from "electron";
import { ApplicationInsightsBackend } from "./application-insights-backend.cjs";
import { validateApplicationOfferInput } from "./application-insights-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export async function initializeApplicationInsightsIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): Promise<void> {
  const backend = new ApplicationInsightsBackend(options.databasePath, options.sqliteBinaryPath);
  await backend.initialize();

  ipcMain.handle("application-insights:get", (_event, applicationId: string) =>
    backend.getApplicationDetail(validateCareerEntityId(applicationId, "Application id")),
  );
  ipcMain.handle(
    "application-insights:set-target-track",
    (_event, applicationId: string, targetTrackId: string | null) =>
      backend.setTargetTrack(
        validateCareerEntityId(applicationId, "Application id"),
        targetTrackId === null ? null : validateCareerEntityId(targetTrackId, "Target track id"),
      ),
  );
  ipcMain.handle(
    "application-insights:save-offer",
    (_event, applicationId: string, input: unknown) =>
      backend.saveOffer(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationOfferInput(input),
      ),
  );
  ipcMain.handle("application-insights:delete-offer", async (_event, applicationId: string) => {
    await backend.deleteOffer(validateCareerEntityId(applicationId, "Application id"));
  });
  ipcMain.handle("application-insights:search-learning", () => backend.getSearchLearning());
}
