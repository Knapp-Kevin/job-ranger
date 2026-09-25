const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { JobScoutBackend } = require('../electron/backend.cjs');
const { CareerBackend } = require('../electron/career-backend.cjs');
const { ResumeBackend } = require('../electron-runtime/electron/src/resume-backend.cjs');

function createMockFetch() {
  return async (url) => {
    if (String(url).includes('boards-api.greenhouse.io/v1/boards/resumetest/jobs')) {
      return new Response(
        JSON.stringify({
          jobs: [
            {
              id: 6301,
              title: 'Operations Program Manager',
              location: { name: 'Baltimore, MD' },
              absolute_url: 'https://boards.greenhouse.io/resumetest/jobs/6301',
              content: '<p>Must coordinate cross-functional programs and improve operational workflows. Project management experience preferred.</p>',
              updated_at: '2026-09-25T12:00:00.000Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    throw new Error(`Unexpected fetch URL in resume projection test: ${url}`);
  };
}

async function run() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'job-ranger-resume-projection-'));
  try {
    const jobs = new JobScoutBackend({
      dataDirectory: tempDir,
      fetchImpl: createMockFetch(),
      schedulerEnabled: false,
    });
    await jobs.initialize();
    const company = await jobs.createCompany({
      name: 'Resume Test Employer',
      url: 'https://boards.greenhouse.io/resumetest',
      frequencyMinutes: 1440,
      isActive: true,
    });
    await jobs.runCompanyScrape(company.id);
    const [job] = await jobs.listJobs();
    assert.ok(job, 'fixture job should exist');

    const status = await jobs.getSystemStatus(process.platform);
    const career = new CareerBackend({
      dataDirectory: tempDir,
      databasePath: status.databasePath,
      sqliteBinaryPath: status.sqliteBinaryPath,
    });
    await career.initialize();

    const importResult = await career.importPastedText({
      label: 'Operations history',
      text: [
        '# Professional Experience',
        '- Coordinated cross-functional programs across customer and engineering teams.',
        '- Improved operational workflows and reduced handoff friction.',
        '# Skills',
        '- Project management',
      ].join('\n'),
    });
    assert.ok(importResult.proposedEvidence.length >= 2);

    const first = importResult.proposedEvidence[0];
    const second = importResult.proposedEvidence[1];
    await career.reviewEvidence(first.id, { action: 'confirm' });
    await career.reviewEvidence(second.id, { action: 'confirm' });

    const resume = new ResumeBackend({
      databasePath: status.databasePath,
      sqliteBinaryPath: status.sqliteBinaryPath,
    });

    const draft = await resume.createProjection({ jobId: job.id });
    assert.equal(draft.projection.status, 'draft');
    assert.equal(draft.projection.sourceProjectionId, null);
    assert.ok(draft.statements.length >= 1, 'confirmed evidence should create statements');
    assert.equal(draft.truthGate.passed, true, 'deterministic draft should pass truth gate');
    assert.ok(
      draft.statements.every((statement) => statement.evidenceIds.length === 1),
      'every deterministic statement should link exactly one evidence record',
    );

    const evidenceById = new Map(draft.evidence.map((item) => [item.id, item]));
    for (const statement of draft.statements) {
      const supporting = evidenceById.get(statement.evidenceIds[0]);
      assert.ok(supporting, 'statement evidence should be present in bundle');
      assert.equal(statement.text, supporting.statement, 'deterministic text must equal confirmed evidence');
      assert.ok(
        supporting.verificationState === 'user-confirmed' || supporting.verificationState === 'user-authored',
        'statement support must be confirmed',
      );
    }

    const reviewed = await resume.markReviewed(draft.projection.id);
    assert.equal(reviewed.projection.status, 'reviewed');
    assert.equal(reviewed.truthGate.passed, true);

    const selected = draft.projection.selectedEvidenceIds.slice(0, 1);
    const revision = await resume.reviseProjection({
      sourceProjectionId: draft.projection.id,
      selectedEvidenceIds: selected,
    });
    assert.notEqual(revision.projection.id, draft.projection.id, 'revision must be immutable/new');
    assert.equal(revision.projection.sourceProjectionId, draft.projection.id);
    assert.deepEqual(revision.projection.selectedEvidenceIds, selected);
    assert.equal(revision.truthGate.passed, true);

    const versions = await resume.listProjections(job.id);
    assert.equal(versions.length, 2, 'both immutable projection versions should remain available');
    assert.equal(versions[0].projection.id, revision.projection.id, 'latest revision should sort first');

    await jobs.dispose();
    console.log('resume projection smoke test passed');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
