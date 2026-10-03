const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildJobEvidenceCoverage,
  extractJobRequirements,
} = require('../electron-runtime/electron/src/requirement-mapper.cjs');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'military-transition.v1.json'), 'utf8'),
);
const now = '2026-10-03T00:00:00.000Z';

assert.equal(fixture.version, 1);
assert.match(fixture.validationIntent, /generic role\/evidence mapping boundary/);
assert.ok(fixture.evidence.every((item) => item.subjectType === 'role'));

const evidence = fixture.evidence.map((item, index) => ({
  id: `fixture-mt-${index + 1}`,
  subjectType: item.subjectType,
  organization: item.organization ?? null,
  titleOrName: item.titleOrName ?? null,
  startDate: null,
  endDate: null,
  statement: item.statement,
  action: null,
  context: null,
  skills: item.skills ?? [],
  methodsOrTools: [],
  scope: [],
  outcomes: [],
  metrics: [],
  credential: null,
  verificationState: 'user-authored',
  confidence: null,
  createdAt: now,
  updatedAt: now,
}));

const requirements = extractJobRequirements(fixture.job, now);
const coverage = buildJobEvidenceCoverage(fixture.job.id, requirements, evidence, now);

assert.ok(requirements.length > 0, 'civilian fixture should expose requirements');
assert.ok(
  coverage.supportedCount >= fixture.expected.minSupportedRequirements,
  `expected at least ${fixture.expected.minSupportedRequirements} supported requirement`,
);
assert.ok(
  coverage.items.some(
    (item) =>
      item.mapping.classification === 'direct' ||
      item.mapping.classification === 'transferable',
  ),
  'military role evidence should support civilian logistics work without a special schema fork',
);

console.log('military transition fixture passed');
