const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildJobEvidenceCoverage,
  extractJobRequirements,
} = require('../electron-runtime/electron/src/requirement-mapper.cjs');

const fixturePath = path.join(__dirname, 'fixtures', 'universal-careers.v1.json');
const fixtureDocument = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const REQUIRED_CODES = ['HL', 'TR', 'HC', 'TE', 'GR', 'EX', 'CC', 'FG', 'CF', 'RT'];
const now = '2026-10-02T12:00:00.000Z';

function toTrack(fixture) {
  return {
    id: `fixture-track-${fixture.code.toLowerCase()}`,
    name: fixture.targetTrack.name,
    relation: fixture.targetTrack.relation,
    roleTitles: fixture.targetTrack.roleTitles,
    seniority: fixture.targetTrack.seniority ?? null,
    direction: fixture.targetTrack.direction ?? null,
    constraints: fixture.targetTrack.constraints,
    origin: 'user',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function toEvidence(fixture) {
  return fixture.evidence.map((item, index) => ({
    id: `fixture-evidence-${fixture.code.toLowerCase()}-${index + 1}`,
    subjectType: item.subjectType,
    organization: item.organization ?? null,
    titleOrName: item.titleOrName ?? null,
    startDate: item.startDate ?? null,
    endDate: item.endDate ?? null,
    statement: item.statement,
    action: item.action ?? null,
    context: item.context ?? null,
    skills: item.skills ?? [],
    methodsOrTools: item.methodsOrTools ?? [],
    scope: item.scope ?? [],
    outcomes: item.outcomes ?? [],
    metrics: item.metrics ?? [],
    verificationState: 'user-authored',
    confidence: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function toJob(fixture) {
  return {
    id: `fixture-job-${fixture.code.toLowerCase()}`,
    companyId: `fixture-company-${fixture.code.toLowerCase()}`,
    sourceJobId: `fixture-source-${fixture.code.toLowerCase()}`,
    sourceType: fixture.job.sourceType,
    title: fixture.job.title,
    location: fixture.job.location,
    employmentType: fixture.job.employmentType ?? null,
    url: `https://example.invalid/jobs/${fixture.code.toLowerCase()}`,
    descriptionSnippet: fixture.job.descriptionSnippet,
    salaryMin: fixture.job.salaryMin ?? null,
    salaryMax: fixture.job.salaryMax ?? null,
    salaryCurrency: fixture.job.salaryCurrency ?? 'USD',
    salaryText: fixture.job.salaryText ?? null,
    postDate: null,
    createdAt: now,
    lastSeenAt: now,
    isActive: true,
    isNew: true,
    matchedFilterCount: 0,
  };
}

(async () => {
  const { buildOpportunityAssessment } = await import(
    '../electron-runtime/src/shared/opportunity-assessment.js'
  );

  assert.equal(fixtureDocument.version, 1);
  assert.match(fixtureDocument.description, /Synthetic/);
  assert.equal(fixtureDocument.fixtures.length, REQUIRED_CODES.length);
  assert.deepEqual(
    fixtureDocument.fixtures.map((fixture) => fixture.code).sort(),
    [...REQUIRED_CODES].sort(),
  );

  const results = [];

  for (const fixture of fixtureDocument.fixtures) {
    assert.ok(fixture.context, `${fixture.code}: context is required`);
    assert.ok(fixture.targetTrack.name, `${fixture.code}: target-track name is required`);
    assert.ok(fixture.targetTrack.roleTitles.length > 0, `${fixture.code}: target roles are required`);
    assert.ok(fixture.evidence.length > 0, `${fixture.code}: evidence is required`);
    assert.ok(fixture.knownModelPressures.length > 0, `${fixture.code}: known model pressure is required`);

    const job = toJob(fixture);
    const track = toTrack(fixture);
    const evidence = toEvidence(fixture);
    const requirements = extractJobRequirements(job, now);
    const coverage = buildJobEvidenceCoverage(job.id, requirements, evidence, now);
    const assessment = buildOpportunityAssessment(job, track, coverage, now);

    assert.ok(requirements.length > 0, `${fixture.code}: should extract at least one requirement`);
    assert.ok(
      coverage.supportedCount >= fixture.expected.minSupportedRequirements,
      `${fixture.code}: expected at least ${fixture.expected.minSupportedRequirements} supported requirements, got ${coverage.supportedCount}`,
    );
    assert.equal(
      assessment.eligibility.status,
      fixture.expected.eligibility,
      `${fixture.code}: eligibility`,
    );
    assert.equal(
      assessment.careerAlignment.status,
      fixture.expected.careerAlignment,
      `${fixture.code}: career alignment`,
    );
    assert.equal(
      assessment.preferenceAlignment.status,
      fixture.expected.preferenceAlignment,
      `${fixture.code}: preference alignment`,
    );

    if (fixture.expected.hasCredentialRequirement) {
      assert.ok(
        requirements.some((requirement) => requirement.kind === 'credential'),
        `${fixture.code}: expected a credential requirement`,
      );
    }
    if (fixture.expected.hasTransferableRequirement) {
      assert.ok(
        coverage.items.some((item) => item.mapping.classification === 'transferable'),
        `${fixture.code}: expected transferable evidence coverage`,
      );
    }

    results.push({
      code: fixture.code,
      requirements: requirements.length,
      supported: coverage.supportedCount,
      eligibility: assessment.eligibility.status,
      career: assessment.careerAlignment.status,
      preferences: assessment.preferenceAlignment.status,
    });
  }

  console.log('universal career fixtures passed');
  console.table(results);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
