const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { resolveManagedArtifactRevealPath } = require('../electron-runtime/electron/src/managed-path-policy.cjs');

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'job-ranger-managed-path-'));
  try {
    const managedRoot = path.join(root, 'data', 'artifacts');
    const artifact = path.join(managedRoot, 'resumes', 'resume.pdf');
    const outside = path.join(root, 'outside.txt');
    await fs.mkdir(path.dirname(artifact), { recursive: true });
    await fs.writeFile(artifact, 'managed\n', 'utf8');
    await fs.writeFile(outside, 'outside\n', 'utf8');

    assert.equal(
      await resolveManagedArtifactRevealPath(root, artifact),
      await fs.realpath(artifact),
      'a normal managed artifact should be revealable',
    );

    await assert.rejects(
      resolveManagedArtifactRevealPath(root, outside),
      /only job ranger managed artifacts/i,
      'renderer input must not reveal arbitrary files outside managed storage',
    );

    await assert.rejects(
      resolveManagedArtifactRevealPath(root, managedRoot),
      /managed artifact/i,
      'the managed directory itself is not an artifact reveal target',
    );

    if (process.platform !== 'win32') {
      const escapedLink = path.join(managedRoot, 'escaped-link.txt');
      await fs.symlink(outside, escapedLink);
      await assert.rejects(
        resolveManagedArtifactRevealPath(root, escapedLink),
        /regular job ranger managed artifact|managed artifact/i,
        'a symlink in managed storage must not escape the managed real-path boundary',
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
