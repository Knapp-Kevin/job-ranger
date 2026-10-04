import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_RESTORE_BUNDLE_ENTRIES = 100_005;

/**
 * Treat a user-selected restore bundle as untrusted input. Reject symbolic
 * links anywhere in the bundle before BackupService reads manifest-declared
 * paths so a nested link cannot redirect validation or staging outside the
 * directory the user selected.
 */
export async function assertRestoreBundleTreeSafe(bundlePath: string): Promise<void> {
  const root = await fs.realpath(bundlePath);
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("Restore bundle must be a normal local directory.");
  }

  const pending: string[] = [root];
  let entryCount = 0;

  while (pending.length > 0) {
    const currentDirectory = pending.pop();
    if (!currentDirectory) continue;

    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    entryCount += entries.length;
    if (entryCount > MAX_RESTORE_BUNDLE_ENTRIES) {
      throw new Error("Restore bundle contains too many filesystem entries.");
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error("Restore bundle cannot contain symbolic links.");
      }
      if (entry.isDirectory()) {
        pending.push(entryPath);
      }
    }
  }
}
