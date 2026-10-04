import { ipcMain } from "electron";
import { ApplicationLifecycleBackend } from "./application-lifecycle-backend.cjs";
import {
  validateApplicationContactInput,
  validateApplicationEventInput,
  validateApplicationEventUpdate,
} from "./application-lifecycle-validator.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";
import { initializeInterviewPrepIpc } from "./interview-prep-ipc.cjs";
import { initializeApplicationMaterialsIpc } from "./application-materials-ipc.cjs";
import { initializeApplicationInsightsIpc } from "./application-insights-ipc.cjs";

export async function initializeApplicationLifecycleIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): Promise<void> {
  const backend = new ApplicationLifecycleBackend(
    options.databasePath,
    options.sqliteBinaryPath,
  );
  await backend.initialize();
  initializeInterviewPrepIpc(options);
  await initializeApplicationMaterialsIpc(options);
  await initializeApplicationInsightsIpc(options);

  ipcMain.handle("application-lifecycle:get", (_event, applicationId: string) =>
    backend.getLifecycle(
      validateCareerEntityId(applicationId, "Application id"),
    ),
  );

  ipcMain.handle(
    "application-lifecycle:create-contact",
    (_event, applicationId: string, input: unknown) =>
      backend.createContact(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationContactInput(input),
      ),
  );

  ipcMain.handle(
    "application-lifecycle:update-contact",
    (_event, contactId: string, input: unknown) =>
      backend.updateContact(
        validateCareerEntityId(contactId, "Contact id"),
        validateApplicationContactInput(input),
      ),
  );

  ipcMain.handle("application-lifecycle:delete-contact", async (_event, contactId: string) => {
    await backend.deleteContact(validateCareerEntityId(contactId, "Contact id"));
  });

  ipcMain.handle(
    "application-lifecycle:create-event",
    (_event, applicationId: string, input: unknown) =>
      backend.createEvent(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationEventInput(input),
      ),
  );

  ipcMain.handle(
    "application-lifecycle:update-event",
    (_event, eventId: string, update: unknown) =>
      backend.updateEvent(
        validateCareerEntityId(eventId, "Event id"),
        validateApplicationEventUpdate(update),
      ),
  );

  ipcMain.handle("application-lifecycle:delete-event", async (_event, eventId: string) => {
    await backend.deleteEvent(validateCareerEntityId(eventId, "Event id"));
  });
}
