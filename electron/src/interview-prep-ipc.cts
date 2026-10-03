import { ipcMain } from "electron";
import { validateCareerEntityId } from "./career-validators.cjs";
import { InterviewPrepBackend } from "./interview-prep-backend.cjs";

export function initializeInterviewPrepIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new InterviewPrepBackend(options);
  ipcMain.handle("interview-prep:get", (_event, applicationId: string) =>
    backend.get(validateCareerEntityId(applicationId, "Application id")),
  );
}
