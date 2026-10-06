// Preload hook (`node -r`) used when running a baseline release's smoke tests
// to generate upgrade fixtures: temporary data directories are created under
// JOB_RANGER_KEEP_TEMP_ROOT and are not deleted when the test cleans up.

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const keepRoot = process.env.JOB_RANGER_KEEP_TEMP_ROOT;
if (!keepRoot) throw new Error("JOB_RANGER_KEEP_TEMP_ROOT is required");
const resolvedRoot = path.resolve(keepRoot);
let counter = 0;

fsp.mkdtemp = async () => {
  const directory = path.join(resolvedRoot, String(counter++));
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const originalRm = fsp.rm.bind(fsp);
fsp.rm = async (target, options) => {
  if (path.resolve(String(target)).startsWith(resolvedRoot)) return;
  return originalRm(target, options);
};
