import { ipcMain } from "electron";
import { ApplicationMaterialsBackend } from "./application-materials-backend.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export async function initializeApplicationMaterialsIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): Promise<void> {
  const backend = new ApplicationMaterialsBackend(options);
  await backend.initialize();

  ipcMain.handle("application-materials:list", (_event, applicationId: string) =>
    backend.list(validateCareerEntityId(applicationId, "Application id")),
  );

  ipcMain.handle(
    "application-materials:create-cover-letter",
    (_event, applicationId: string) =>
      backend.createCoverLetter(
        validateCareerEntityId(applicationId, "Application id"),
      ),
  );

  ipcMain.handle("application-materials:delete", async (_event, projectionId: string) => {
    await backend.delete(
      validateCareerEntityId(projectionId, "Application material id"),
    );
  });
}
