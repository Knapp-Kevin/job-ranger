import { promises as fs } from "node:fs";
import path from "node:path";

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Resolve a renderer-requested reveal path only when it is an existing regular
 * file inside Job Ranger's managed artifacts directory. Real-path comparison
 * prevents a symlink inside the managed tree from turning reveal into arbitrary
 * filesystem navigation.
 */
export async function resolveManagedArtifactRevealPath(
  userDataDirectory: string,
  rawPath: unknown,
): Promise<string> {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    throw new Error("Managed artifact path is required.");
  }

  const managedRoot = path.join(userDataDirectory, "data", "artifacts");
  const requested = path.resolve(rawPath.trim());
  const lexicalRoot = path.resolve(managedRoot);
  if (!isInside(lexicalRoot, requested)) {
    throw new Error("Only Job Ranger managed artifacts can be revealed.");
  }

  const [realRoot, realRequested, requestedStat] = await Promise.all([
    fs.realpath(lexicalRoot),
    fs.realpath(requested),
    fs.lstat(requested),
  ]);
  if (!requestedStat.isFile() || requestedStat.isSymbolicLink() || !isInside(realRoot, realRequested)) {
    throw new Error("Only regular Job Ranger managed artifact files can be revealed.");
  }
  return realRequested;
}
