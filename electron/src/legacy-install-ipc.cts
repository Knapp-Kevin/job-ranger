import { app, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { RuntimeDistributionChannel } from "../../src/shared/runtime.js";
import type { LegacyInstallStatus } from "../../src/shared/legacy-install.js";
import { randomUUID } from "node:crypto";
import { BackupService } from "./backup-service.cjs";
import { resolveLegacyDirectUserDataDirectory } from "./distribution.cjs";

export interface LegacyInstallOptions {
  channel: RuntimeDistributionChannel;
  appDataDirectory: string;
  userDataDirectory: string;
  dataDirectory: string;
  sqliteBinaryPath: string;
  appVersion: string;
}

const DATABASE_FILE = "jobscout.sqlite3";

export async function detectLegacyInstall(
  options: LegacyInstallOptions,
): Promise<LegacyInstallStatus> {
  const legacyUserData = resolveLegacyDirectUserDataDirectory(options.appDataDirectory);
  const applicable =
    options.channel === "microsoft-store" &&
    path.resolve(legacyUserData) !== path.resolve(options.userDataDirectory);
  if (!applicable) {
    return { applicable: false, found: false, dataDirectory: null, databaseBytes: null, lastModified: null };
  }
  const legacyData = path.join(legacyUserData, "data");
  try {
    const stat = await fs.stat(path.join(legacyData, DATABASE_FILE));
    if (!stat.isFile()) throw new Error("not a file");
    return {
      applicable: true,
      found: true,
      dataDirectory: legacyData,
      databaseBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return { applicable: true, found: false, dataDirectory: legacyData, databaseBytes: null, lastModified: null };
  }
}

/**
 * Builds a validated backup bundle from the legacy installation (read-only),
 * then stages it through the normal restore path. The current Store data is
 * kept as the rollback candidate until the staged restore is applied.
 */
export async function stageLegacyImport(options: LegacyInstallOptions): Promise<void> {
  const status = await detectLegacyInstall(options);
  if (!status.applicable || !status.found || !status.dataDirectory) {
    throw new Error("No historical Job Ranger desktop installation data was found to import.");
  }
  const workDirectory = path.join(
    options.userDataDirectory,
    `.job-ranger-legacy-import-${randomUUID()}`,
  );
  await fs.mkdir(workDirectory, { recursive: true });
  try {
    const legacyService = new BackupService({
      dataDirectory: status.dataDirectory,
      userDataDirectory: workDirectory,
      databasePath: path.join(status.dataDirectory, DATABASE_FILE),
      sqliteBinaryPath: options.sqliteBinaryPath,
      appVersion: options.appVersion,
    });
    const bundle = await legacyService.createBackup(workDirectory);
    const storeService = new BackupService({
      dataDirectory: options.dataDirectory,
      userDataDirectory: options.userDataDirectory,
      databasePath: path.join(options.dataDirectory, DATABASE_FILE),
      sqliteBinaryPath: options.sqliteBinaryPath,
      appVersion: options.appVersion,
    });
    await storeService.stageRestore(bundle.summary.bundlePath);
  } finally {
    await fs.rm(workDirectory, { recursive: true, force: true });
  }
}

export function initializeLegacyInstallIpc(options: LegacyInstallOptions): void {
  ipcMain.handle("legacy-install:detect", () => detectLegacyInstall(options));
  ipcMain.handle("legacy-install:stage-import", async () => {
    await stageLegacyImport(options);
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 150);
    return { restarting: true as const };
  });
}
