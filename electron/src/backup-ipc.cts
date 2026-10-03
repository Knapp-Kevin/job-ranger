import { app, dialog, ipcMain } from "electron";
import { BackupService } from "./backup-service.cjs";

export function initializeBackupIpc(options: {
  dataDirectory: string;
  userDataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
  appVersion: string;
}): void {
  const service = new BackupService(options);

  ipcMain.handle("backups:create", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Choose where to create the Job Ranger backup",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return service.createBackup(selection.filePaths[0]);
  });

  ipcMain.handle("backups:select-restore", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Select a Job Ranger backup to restore",
      properties: ["openDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return service.validateBackup(selection.filePaths[0]);
  });

  ipcMain.handle("backups:stage-restore", async (_event, bundlePath: string) => {
    if (typeof bundlePath !== "string" || !bundlePath.trim()) {
      throw new Error("Backup path is required");
    }
    await service.stageRestore(bundlePath.trim());
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 150);
    return { restarting: true as const };
  });
}
