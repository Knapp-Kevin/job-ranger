const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { JobScoutBackend } = require("../electron/backend.cjs");
const { CareerBackend } = require("../electron/career-backend.cjs");
const { SqliteClient, sql } = require("../electron/sqlite.cjs");
const {
  mapRequirementToEvidence,
  normalizeJobRequirements,
} = require("../electron/requirement-normalizer.cjs");
const { toDescriptionText } = require("../electron/extractors.cjs");

function assertKinds(label, text, expectedKinds) {
  const requirements = normalizeJobRequirements(`fixture-${label}`, text);
  const kinds = new Set(requirements.map((item) => item.kind));
  for (const kind of expectedKinds) {
    assert.equal(kinds.has(kind), true, `${label} should produce ${kind}`);
  }
  return requirements;
}

async function run() {
  const html = "<h2>Requirements</h2><ul><li>TypeScript and React required</li><li>3+ years API development</li></ul>";
  const normalizedHtml = toDescriptionText(html);
  assert.match(normalizedHtml, /Requirements\n- TypeScript and React required/);

  assertKinds("technical", "Requirements:\n- TypeScript and React required\nPreferred Qualifications:\n- AWS experience preferred", ["must-have", "preferred"]);
  assertKinds("trade", "Qualifications:\n- EPA 608 certification required\n- Valid driver's license\nResponsibilities:\n- Diagnose commercial HVAC systems", ["credential", "responsibility"]);
  assertKinds("administrative", "Minimum Qualifications:\n- Microsoft Excel required\nResponsibilities:\n- Coordinate vendor schedules and weekly reporting", ["must-have", "responsibility"]);
  assertKinds("service", "Requirements:\n- Customer service experience required\nResponsibilities:\n- Resolve customer escalations and document outcomes", ["must-have", "responsibility"]);
  assertKinds("credential-heavy", "Licenses:\n- Active RN license required\n- BLS certification required\nSchedule:\n- Weekend rotation required", ["credential", "logistics"]);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-ranger-r2-"));
  try {
    const jobBackend = new JobScoutBackend({
      dataDirectory: tempDir,
      schedulerEnabled: false,
    });
    await jobBackend.initialize();
    const status = await jobBackend.getSystemStatus(process.platform);
    const sqlite = new SqliteClient(status.databasePath, status.sqliteBinaryPath);
    const career = new CareerBackend({
      dataDirectory: tempDir,
      databasePath: status.databasePath,
      sqliteBinaryPath: status.sqliteBinaryPath,
    });
    await career.initialize();

    const company = await jobBackend.createCompany({
      name: "Synthetic Operations Co",
      url: "https://boards.greenhouse.io/synthetic-operations",
      frequencyMinutes: 60,
      isActive: true,
    });
    const now = new Date().toISOString();
    const descriptionText = [
      "Minimum Qualifications:",
      "- Microsoft Excel required",
      "- 3 years project coordination experience required",
      "Preferred Qualifications:",
      "- Bachelor's degree preferred",
      "Responsibilities:",
      "- Coordinate vendor schedules across regional locations",
    ].join("\n");

    await sqlite.exec(sql`
      INSERT INTO jobs (
        company_id, source_job_id, source_type, title, location, employment_type,
        url, description_snippet, description_text, salary_min, salary_max,
        salary_currency, salary_text, post_date, created_at, last_seen_at,
        is_active, is_new, matched_filter_count
      ) VALUES (
        ${company.id}, ${"synthetic-r2-job"}, ${"greenhouse"}, ${"Operations Coordinator"},
        ${"Baltimore, MD"}, ${"Full-time"}, ${"https://example.com/jobs/synthetic-r2-job"},
        ${"Excel, project coordination, vendor scheduling."}, ${descriptionText},
        ${null}, ${null}, ${null}, ${null}, ${null}, ${now}, ${now}, 1, 1, 0
      );
    `);
    const job = await sqlite.queryOne(sql`
      SELECT CAST(id AS TEXT) AS id FROM jobs WHERE source_job_id = ${"synthetic-r2-job"} LIMIT 1;
    `);
    assert.ok(job?.id);

    const imported = await career.importPastedText({
      label: "Synthetic confirmed evidence",
      text: [
        "# Skills",
        "Microsoft Excel",
        "# Professional Experience",
        "Operations Coordinator at Northstar Distribution | 2022 - Present",
        "- Coordinated vendor schedules across 12 regional locations.",
      ].join("\n"),
    });
    for (const evidence of imported.proposedEvidence) {
      if (
        evidence.statement === "Microsoft Excel" ||
        evidence.statement.includes("Coordinated vendor schedules")
      ) {
        await career.reviewEvidence(evidence.id, { action: "confirm" });
      }
    }

    const coverage = await career.getJobEvidenceCoverage(job.id);
    assert.equal(coverage.sourceStatus, "available");
    assert.ok(coverage.items.length >= 4, "expected normalized requirements");
    assert.ok(coverage.directCount >= 1, "Excel should map directly to confirmed evidence");
    const degree = coverage.items.find((item) => /degree/i.test(item.requirement.text));
    assert.ok(degree, "expected degree requirement");
    assert.equal(degree.mapping.classification, "gap");
    assert.equal(degree.mapping.evidenceId, null, "gaps must not carry factual evidence IDs");

    const confirmedEvidence = (await career.listEvidence())
      .map((item) => item.evidence)
      .filter((item) => item.verificationState === "user-confirmed");
    const degreeMapping = mapRequirementToEvidence(degree.requirement, confirmedEvidence);
    assert.equal(degreeMapping.classification, "gap");

    const insufficientNow = new Date().toISOString();
    await sqlite.exec(sql`
      INSERT INTO jobs (
        company_id, source_job_id, source_type, title, location, employment_type,
        url, description_snippet, description_text, salary_min, salary_max,
        salary_currency, salary_text, post_date, created_at, last_seen_at,
        is_active, is_new, matched_filter_count
      ) VALUES (
        ${company.id}, ${"summary-only"}, ${"smartrecruiters"}, ${"Customer Service Representative"},
        ${"Remote"}, ${"Full-time"}, ${"Short listing summary"}, ${"Short summary only"}, ${null},
        ${null}, ${null}, ${null}, ${null}, ${null}, ${insufficientNow}, ${insufficientNow}, 1, 1, 0
      );
    `);
    const summaryOnly = await sqlite.queryOne(sql`
      SELECT CAST(id AS TEXT) AS id FROM jobs WHERE source_job_id = ${"summary-only"} LIMIT 1;
    `);
    const insufficient = await career.getJobEvidenceCoverage(summaryOnly.id);
    assert.equal(insufficient.sourceStatus, "insufficient");
    assert.deepEqual(insufficient.items, []);

    await jobBackend.dispose();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
