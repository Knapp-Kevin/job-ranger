import { app, dialog, ipcMain } from "electron";
import type { BackupRestorePreview } from "../../src/shared/backup.js";
import { BackupService } from "./backup-service.cjs";

export function initializeBackupIpc(options: {
  dataDirectory: string;
  userDataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
  appVersion: string;
}): void {
  const service = new BackupService(options);
  let selectedRestorePath: string | null = null;

  ipcMain.handle("backups:create", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Choose where to create the Job Ranger backup",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return service.createBackup(selection.filePaths[0]);
  });

  ipcMain.handle("backups:select-restore", async (): Promise<BackupRestorePreview | null> => {
    selectedRestorePath = null;
    const selection = await dialog.showOpenDialog({
      title: "Select a Job Ranger backup to restore",
      properties: ["openDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;

    const validated = await service.validateBackup(selection.filePaths[0]);
    selectedRestorePath = validated.bundlePath;
    const { bundlePath: _bundlePath, summary, ...preview } = validated;
    const { bundlePath: _summaryPath, ...summaryPreview } = summary;
    return { ...preview, summary: summaryPreview };
  });

  ipcMain.handle("backups:stage-restore", async () => {
    if (!selectedRestorePath) {
      throw new Error("Select and validate a backup before restoring it");
    }
    const bundlePath = selectedRestorePath;
    selectedRestorePath = null;
    await service.stageRestore(bundlePath);
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 150);
    return { restarting: true as const };
  });
}
