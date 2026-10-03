import { ipcMain } from "electron";
import { ApplicationMaterialsBackend } from "./application-materials-backend.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export function initializeApplicationMaterialsIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new ApplicationMaterialsBackend(options);
  const ready = backend.initialize();

  ipcMain.handle("application-materials:list", async (_event, applicationId: string) => {
    await ready;
    return backend.list(validateCareerEntityId(applicationId, "Application id"));
  });

  ipcMain.handle(
    "application-materials:create-cover-letter",
    async (_event, applicationId: string) => {
      await ready;
      return backend.createCoverLetter(
        validateCareerEntityId(applicationId, "Application id"),
      );
    },
  );

  ipcMain.handle("application-materials:delete", async (_event, projectionId: string) => {
    await ready;
    await backend.delete(
      validateCareerEntityId(projectionId, "Application material id"),
    );
  });
}
