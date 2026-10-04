import { app, dialog, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import { assertRestoreBundleTreeSafe } from "./backup-bundle-policy.cjs";
import { BackupService } from "./backup-service.cjs";

export function initializeBackupIpc(options: {
  dataDirectory: string;
  userDataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
  appVersion: string;
}): void {
  const service = new BackupService(options);
  let approvedRestorePath: string | null = null;

  ipcMain.handle("backups:create", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Choose where to create the Job Ranger backup",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return service.createBackup(selection.filePaths[0]);
  });

  ipcMain.handle("backups:select-restore", async () => {
    approvedRestorePath = null;
    const selection = await dialog.showOpenDialog({
      title: "Select a Job Ranger backup to restore",
      properties: ["openDirectory"],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;

    const selectedPath = await fs.realpath(selection.filePaths[0]);
    await assertRestoreBundleTreeSafe(selectedPath);
    const result = await service.validateBackup(selectedPath);
    approvedRestorePath = selectedPath;
    return result;
  });

  ipcMain.handle("backups:stage-restore", async (_event, bundlePath: unknown) => {
    if (typeof bundlePath !== "string" || !bundlePath.trim()) {
      throw new Error("Backup path is required");
    }
    if (!approvedRestorePath) {
      throw new Error("Select and validate a Job Ranger backup before restoring it.");
    }

    const requestedPath = await fs.realpath(bundlePath.trim());
    if (requestedPath !== approvedRestorePath) {
      throw new Error("The selected backup changed. Select the backup again before restoring it.");
    }

    await assertRestoreBundleTreeSafe(requestedPath);
    approvedRestorePath = null;
    await service.stageRestore(requestedPath);
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 150);
    return { restarting: true as const };
  });
}
