const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  assertRestoreBundleTreeSafe,
} = require("../electron-runtime/electron/src/backup-bundle-policy.cjs");

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "job-ranger-backup-policy-"));
  try {
    const bundle = path.join(root, "safe.jobranger-backup");
    await fs.mkdir(path.join(bundle, "artifacts", "resumes"), { recursive: true });
    await fs.writeFile(path.join(bundle, "manifest.json"), "{}\n", "utf8");
    await fs.writeFile(path.join(bundle, "jobscout.sqlite3"), "db\n", "utf8");
    await fs.writeFile(path.join(bundle, "artifacts", "resumes", "resume.pdf"), "pdf\n", "utf8");

    await assert.doesNotReject(assertRestoreBundleTreeSafe(bundle));

    if (process.platform !== "win32") {
      const outside = path.join(root, "outside");
      await fs.mkdir(outside);
      await fs.writeFile(path.join(outside, "secret.txt"), "secret\n", "utf8");
      await fs.symlink(outside, path.join(bundle, "artifacts", "escaped"));
      await assert.rejects(
        assertRestoreBundleTreeSafe(bundle),
        /cannot contain symbolic links/i,
        "restore validation must reject an intermediate directory symlink before reading bundle files",
      );
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
