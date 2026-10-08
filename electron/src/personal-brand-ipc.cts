import { ipcMain } from "electron";
import { PersonalBrandBackend } from "./personal-brand-backend.cjs";

export function initializePersonalBrandIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const backend = new PersonalBrandBackend(options);
  const ready = backend.initialize();
  ipcMain.handle("personal-brand:list-drafts", async () => {
    await ready;
    return backend.listDrafts();
  });
  ipcMain.handle("personal-brand:create-draft", async (_event, input: unknown) => {
    await ready;
    return backend.createDraft(input);
  });
  ipcMain.handle("personal-brand:update-draft", async (_event, id: string, revision: number, input: unknown) => {
    await ready;
    return backend.updateDraft(id, revision, input);
  });
  ipcMain.handle("personal-brand:prepare-draft", async (_event, id: string, revision: number, reviewed: boolean) => {
    await ready;
    return backend.prepareDraft(id, revision, reviewed);
  });
  ipcMain.handle("personal-brand:list-prepared", async () => {
    await ready;
    return backend.listPrepared();
  });
  ipcMain.handle("personal-brand:confirm-publication", async (_event, input: unknown) => {
    await ready;
    return backend.confirmPublication(input as Parameters<typeof backend.confirmPublication>[0]);
  });
  ipcMain.handle("personal-brand:list-publications", async () => {
    await ready;
    return backend.listPublications();
  });
  ipcMain.handle("personal-brand:append-snapshot", async (_event, postId: string, input: unknown) => {
    await ready;
    return backend.appendSnapshot(postId, input as Parameters<typeof backend.appendSnapshot>[1]);
  });
  ipcMain.handle("personal-brand:list-snapshots", async (_event, postId: string) => {
    await ready;
    return backend.listSnapshots(postId);
  });
}
