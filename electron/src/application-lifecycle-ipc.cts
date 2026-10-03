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

export function initializeApplicationLifecycleIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new ApplicationLifecycleBackend(
    options.databasePath,
    options.sqliteBinaryPath,
  );
  const ready = backend.initialize();
  initializeInterviewPrepIpc(options);
  initializeApplicationMaterialsIpc(options);

  ipcMain.handle("application-lifecycle:get", async (_event, applicationId: string) => {
    await ready;
    return backend.getLifecycle(
      validateCareerEntityId(applicationId, "Application id"),
    );
  });

  ipcMain.handle(
    "application-lifecycle:create-contact",
    async (_event, applicationId: string, input: unknown) => {
      await ready;
      return backend.createContact(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationContactInput(input),
      );
    },
  );

  ipcMain.handle(
    "application-lifecycle:update-contact",
    async (_event, contactId: string, input: unknown) => {
      await ready;
      return backend.updateContact(
        validateCareerEntityId(contactId, "Contact id"),
        validateApplicationContactInput(input),
      );
    },
  );

  ipcMain.handle("application-lifecycle:delete-contact", async (_event, contactId: string) => {
    await ready;
    await backend.deleteContact(validateCareerEntityId(contactId, "Contact id"));
  });

  ipcMain.handle(
    "application-lifecycle:create-event",
    async (_event, applicationId: string, input: unknown) => {
      await ready;
      return backend.createEvent(
        validateCareerEntityId(applicationId, "Application id"),
        validateApplicationEventInput(input),
      );
    },
  );

  ipcMain.handle(
    "application-lifecycle:update-event",
    async (_event, eventId: string, update: unknown) => {
      await ready;
      return backend.updateEvent(
        validateCareerEntityId(eventId, "Event id"),
        validateApplicationEventUpdate(update),
      );
    },
  );

  ipcMain.handle("application-lifecycle:delete-event", async (_event, eventId: string) => {
    await ready;
    await backend.deleteEvent(validateCareerEntityId(eventId, "Event id"));
  });
}
