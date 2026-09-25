const assert = require('node:assert/strict');

const {
  buildResumeTailoringPlan,
} = require('../electron-runtime/electron/src/resume-tailoring.cjs');

function evidence(id, statement, subjectType = 'achievement') {
  return {
    id,
    subjectType,
    organization: null,
    titleOrName: null,
    startDate: null,
    endDate: null,
    statement,
    action: null,
    context: null,
    skills: [],
    methodsOrTools: [],
    scope: [],
    outcomes: [],
    metrics: [],
    verificationState: 'user-confirmed',
    confidence: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const source = {
  id: 'resume-source',
  jobId: null,
  context: 'private-sector',
  pageFormat: 'letter',
  sourceProjectionId: null,
  status: 'draft',
  sections: ['Experience'],
  selectedEvidenceIds: ['ev-direct', 'ev-unrelated'],
  templateId: 'ats-standard-v1',
  contact: {
    fullName: 'Taylor Example',
    email: 'taylor@example.test',
    phone: '',
    location: 'Annapolis, MD',
    links: [],
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const evDirect = evidence('ev-direct', 'Coordinated multi-team delivery schedules.');
const evTransfer = evidence('ev-transfer', 'Resolved customer escalations across field operations.');
const evUnrelated = evidence('ev-unrelated', 'Organized an internal volunteer event.');
const evAmbiguous = {
  ...evidence('ev-ambiguous', 'Worked with inventory systems.'),
  verificationState: 'imported',
};

const coverage = {
  jobId: 'job-42',
  items: [
    {
      requirement: {
        id: 'req-direct',
        jobId: 'job-42',
        kind: 'must-have',
        text: 'Coordinate cross-functional delivery schedules.',
        normalizedTerm: 'coordinate delivery schedules',
        importance: 1,
        sourceText: 'Coordinate cross-functional delivery schedules.',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      mapping: {
        id: 'map-direct',
        jobRequirementId: 'req-direct',
        evidenceId: 'ev-direct',
        classification: 'direct',
        explanation: 'Confirmed evidence directly supports this requirement.',
        createdBy: 'deterministic',
        userConfirmed: true,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      evidence: evDirect,
    },
    {
      requirement: {
        id: 'req-transfer',
        jobId: 'job-42',
        kind: 'responsibility',
        text: 'Handle complex stakeholder escalations.',
        normalizedTerm: 'stakeholder escalations',
        importance: 0.6,
        sourceText: 'Handle complex stakeholder escalations.',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      mapping: {
        id: 'map-transfer',
        jobRequirementId: 'req-transfer',
        evidenceId: 'ev-transfer',
        classification: 'transferable',
        explanation: 'Confirmed evidence transfers to this requirement.',
        createdBy: 'deterministic',
        userConfirmed: true,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      evidence: evTransfer,
    },
    {
      requirement: {
        id: 'req-gap',
        jobId: 'job-42',
        kind: 'credential',
        text: 'Current PMP certification required.',
        normalizedTerm: 'pmp certification',
        importance: 1,
        sourceText: 'Current PMP certification required.',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      mapping: {
        id: 'map-gap',
        jobRequirementId: 'req-gap',
        evidenceId: null,
        classification: 'gap',
        explanation: 'No saved Career Evidence supports this credential.',
        createdBy: 'deterministic',
        userConfirmed: false,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      evidence: null,
    },
    {
      requirement: {
        id: 'req-ambiguous',
        jobId: 'job-42',
        kind: 'preferred',
        text: 'Experience with enterprise inventory platforms preferred.',
        normalizedTerm: 'enterprise inventory platforms',
        importance: 0.7,
        sourceText: 'Experience with enterprise inventory platforms preferred.',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      mapping: {
        id: 'map-ambiguous',
        jobRequirementId: 'req-ambiguous',
        evidenceId: 'ev-ambiguous',
        classification: 'ambiguous',
        explanation: 'Imported evidence appears relevant but is not confirmed.',
        createdBy: 'deterministic',
        userConfirmed: false,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      evidence: evAmbiguous,
    },
  ],
  directCount: 1,
  transferableCount: 1,
  ambiguousCount: 1,
  gapCount: 1,
  supportedCount: 2,
  totalCount: 4,
  generatedAt: '2026-01-02T00:00:00.000Z',
};

const plan = buildResumeTailoringPlan(
  source,
  [evDirect, evTransfer, evUnrelated, evAmbiguous],
  coverage,
  '2026-01-03T00:00:00.000Z',
);

assert.deepEqual(plan.suggestedEvidenceIds, ['ev-direct', 'ev-transfer']);
assert.deepEqual(plan.retainedSourceEvidenceIds, ['ev-direct']);
assert.deepEqual(plan.addedEvidenceIds, ['ev-transfer']);
assert.deepEqual(plan.omittedSourceEvidenceIds, ['ev-unrelated']);
assert.equal(plan.candidates[0].evidenceId, 'ev-direct');
assert.equal(plan.candidates[0].support, 'direct');
assert.equal(plan.candidates[1].evidenceId, 'ev-transfer');
assert.equal(plan.candidates[1].support, 'transferable');
assert.equal(plan.gaps.length, 2);
assert.deepEqual(
  plan.gaps.map((gap) => gap.state).sort(),
  ['ambiguous', 'gap'],
);
assert.ok(plan.gaps.some((gap) => gap.text.includes('PMP')));

console.log('resume-tailoring.test.cjs passed');
