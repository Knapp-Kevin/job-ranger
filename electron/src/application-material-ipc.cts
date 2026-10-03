import { ipcMain } from "electron";
import { ApplicationMaterialBackend } from "./application-material-backend.cjs";
import { validateApplicationMaterialGenerateInput } from "./application-material-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export function initializeApplicationMaterialIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new ApplicationMaterialBackend(options);
  const ready = backend.initialize();

  ipcMain.handle("application-materials:get", async (_event, applicationId: string) => {
    await ready;
    return backend.get(
      validateCareerEntityId(applicationId, "Application material application id"),
    );
  });

  ipcMain.handle("application-materials:generate-cover-letter", async (_event, input: unknown) => {
    await ready;
    return backend.generateCoverLetter(validateApplicationMaterialGenerateInput(input));
  });

  ipcMain.handle("application-materials:record-submitted", async (_event, projectionId: string) => {
    await ready;
    return backend.recordSubmitted(
      validateCareerEntityId(projectionId, "Application material projection id"),
    );
  });
}
