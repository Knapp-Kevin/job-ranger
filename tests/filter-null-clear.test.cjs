const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { JobScoutBackend } = require("../electron/backend.cjs");

async function run() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-ranger-filter-null-"));
  try {
    const backend = new JobScoutBackend({
      dataDirectory: tempDir,
      schedulerEnabled: false,
    });
    await backend.initialize();

    const company = await backend.createCompany({
      name: "Example",
      url: "https://example.com/careers",
      frequencyMinutes: 60,
      isActive: true,
    });
    const filter = await backend.createFilter({
      name: "Scoped filter",
      companyId: company.id,
      titleInclude: [],
      titleExclude: [],
      keywordsInclude: [],
      keywordsExclude: [],
      salaryMin: 100000,
      locationInclude: [],
      locationExclude: [],
      isActive: true,
    });

    const cleared = await backend.updateFilter(filter.id, {
      companyId: null,
      salaryMin: null,
    });
    assert.equal(cleared.companyId, null);
    assert.equal(cleared.salaryMin, null);

    await backend.dispose();

    const reloaded = new JobScoutBackend({
      dataDirectory: tempDir,
      schedulerEnabled: false,
    });
    await reloaded.initialize();
    const persisted = (await reloaded.listFilters()).find((item) => item.id === filter.id);
    assert.ok(persisted);
    assert.equal(persisted.companyId, null);
    assert.equal(persisted.salaryMin, null);
    await reloaded.dispose();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
