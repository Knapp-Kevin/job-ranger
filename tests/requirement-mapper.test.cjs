const assert = require('node:assert/strict');
const {
  buildJobEvidenceCoverage,
  extractJobRequirements,
} = require('../electron-runtime/electron/src/requirement-mapper.cjs');

function evidence(id, statement, options = {}) {
  return {
    id,
    subjectType: options.subjectType ?? 'achievement',
    organization: options.organization ?? null,
    titleOrName: options.titleOrName ?? null,
    startDate: null,
    endDate: null,
    statement,
    action: null,
    context: null,
    skills: options.skills ?? [],
    methodsOrTools: options.methodsOrTools ?? [],
    scope: [],
    outcomes: [],
    metrics: [],
    credential: options.credential ?? null,
    verificationState: options.verificationState ?? 'user-confirmed',
    confidence: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  };
}

function job(id, title, description, location = 'Annapolis, MD') {
  return {
    id,
    title,
    descriptionSnippet: description,
    location,
    employmentType: 'Full-time',
  };
}

const now = '2026-09-25T12:00:00.000Z';

{
  const target = job(
    '1',
    'AI Product Engineer',
    'Must have TypeScript experience. Build production AI workflows and APIs. Python preferred.',
  );
  const requirements = extractJobRequirements(target, now);
  const coverage = buildJobEvidenceCoverage(
    target.id,
    requirements,
    [
      evidence('e-ts', 'Built production TypeScript services and APIs.', { skills: ['TypeScript'] }),
      evidence('e-ai', 'Designed AI workflow orchestration for customer-facing products.', { skills: ['AI workflows'] }),
    ],
    now,
  );
  assert.ok(coverage.totalCount >= 2, 'software job should expose requirements');
  assert.ok(coverage.supportedCount >= 1, 'software evidence should support at least one requirement');
}

{
  const target = job(
    '2',
    'Commercial HVAC Technician',
    'EPA certification required. Must troubleshoot rooftop HVAC systems. On-call rotation required.',
  );
  const requirements = extractJobRequirements(target, now);
  const coverage = buildJobEvidenceCoverage(
    target.id,
    requirements,
    [
      evidence('e-epa', 'Maintained EPA Section 608 certification for refrigerant work.', { subjectType: 'credential', skills: ['EPA Section 608'] }),
      evidence('e-rtu', 'Diagnosed and repaired commercial rooftop HVAC units.', { skills: ['HVAC troubleshooting'] }),
    ],
    now,
  );
  assert.ok(requirements.some((item) => item.kind === 'credential'), 'trade role should classify credential requirement');
  assert.ok(requirements.some((item) => item.kind === 'logistics'), 'trade role should classify on-call requirement');
  assert.ok(coverage.supportedCount >= 1, 'trade evidence should support explicit requirements');
}

{
  const target = job(
    '3',
    'Administrative Coordinator',
    'Coordinate vendor invoices and maintain office records. Experience with scheduling preferred.',
  );
  const requirements = extractJobRequirements(target, now);
  const coverage = buildJobEvidenceCoverage(
    target.id,
    requirements,
    [
      evidence('e-admin', 'Coordinated vendor invoices, calendars, and administrative records.', { skills: ['scheduling', 'vendor invoices'] }),
    ],
    now,
  );
  assert.ok(coverage.supportedCount >= 1, 'administrative evidence should map without occupation-specific logic');
}

{
  const target = job(
    '4',
    'Customer Service Representative',
    'Must communicate with customers and resolve account issues. Evening shifts may be required.',
  );
  const requirements = extractJobRequirements(target, now);
  const coverage = buildJobEvidenceCoverage(
    target.id,
    requirements,
    [
      evidence('e-service', 'Resolved customer account issues by phone and email.', {
        verificationState: 'imported',
        skills: ['customer service'],
      }),
    ],
    now,
  );
  assert.ok(
    coverage.items.some((item) => item.mapping.classification === 'ambiguous'),
    'unconfirmed imported evidence must remain ambiguous',
  );
  assert.equal(coverage.directCount, 0, 'unconfirmed evidence cannot become direct support');
}

{
  const target = job(
    '5',
    'Registered Nurse',
    'Active RN license required. Must provide patient care and medication administration. BLS certification required.',
  );
  const requirements = extractJobRequirements(target, now);
  const coverage = buildJobEvidenceCoverage(
    target.id,
    requirements,
    [
      evidence('e-rn', 'Active Registered Nurse license.', { subjectType: 'credential', skills: ['RN license'] }),
      evidence('e-bls', 'Current BLS certification.', { subjectType: 'credential', skills: ['BLS'] }),
    ],
    now,
  );
  assert.ok(requirements.filter((item) => item.kind === 'credential').length >= 2, 'credential-heavy role should preserve distinct credential requirements');
  assert.ok(coverage.supportedCount >= 1, 'confirmed credentials should map to credential requirements');
  assert.ok(coverage.items.every((item) => item.mapping.classification !== 'ambiguous' || !item.mapping.userConfirmed), 'ambiguous mappings must not self-confirm');
}

{
  const target = job('6', 'Registered Nurse', 'Active Maryland RN license required.');
  const requirements = extractJobRequirements(target, now);
  const active = evidence('e-active-rn', 'Maryland Registered Nurse license.', {
    subjectType: 'credential',
    skills: ['RN license'],
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status: 'active',
      expirationDate: '2027-12-31',
      credentialId: null,
    },
  });
  const coverage = buildJobEvidenceCoverage(target.id, requirements, [active], now);
  assert.ok(coverage.directCount >= 1, 'active non-expired credential should support a matching requirement');
}

for (const status of ['expired', 'inactive', 'pending']) {
  const target = job(`7-${status}`, 'Registered Nurse', 'Active Maryland RN license required.');
  const requirements = extractJobRequirements(target, now);
  const saved = evidence(`e-rn-${status}`, 'Active Maryland Registered Nurse license.', {
    subjectType: 'credential',
    skills: ['RN license'],
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status,
      expirationDate: null,
      credentialId: null,
    },
  });
  const coverage = buildJobEvidenceCoverage(target.id, requirements, [saved], now);
  const credentialItem = coverage.items.find((item) => item.requirement.kind === 'credential');
  assert.ok(credentialItem, `${status}: credential requirement should exist`);
  assert.equal(credentialItem.mapping.classification, 'gap', `${status}: credential standing must not establish current eligibility`);
  assert.equal(credentialItem.evidence?.id, saved.id, `${status}: invalid matching credential should remain visible as evidence for the gap`);
  assert.match(credentialItem.mapping.explanation, new RegExp(status), `${status}: mapping should explain why standing does not qualify`);
}

{
  const target = job('8', 'Registered Nurse', 'Active Maryland RN license required.');
  const requirements = extractJobRequirements(target, now);
  const expiredByDate = evidence('e-date-expired', 'Active Maryland Registered Nurse license.', {
    subjectType: 'credential',
    skills: ['RN license'],
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status: 'active',
      expirationDate: '2026-09-24',
      credentialId: null,
    },
  });
  const coverage = buildJobEvidenceCoverage(target.id, requirements, [expiredByDate], now);
  const credentialItem = coverage.items.find((item) => item.requirement.kind === 'credential');
  assert.equal(credentialItem.mapping.classification, 'gap');
  assert.match(credentialItem.mapping.explanation, /expired on 2026-09-24/);
}

{
  const target = job('9', 'Registered Nurse', 'Active Maryland RN license required.');
  const requirements = extractJobRequirements(target, now);
  const expired = evidence('e-old-rn', 'Maryland Registered Nurse license.', {
    subjectType: 'credential',
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status: 'expired',
      expirationDate: '2024-12-31',
      credentialId: null,
    },
  });
  const active = evidence('e-current-rn', 'Registered Nurse license for Maryland.', {
    subjectType: 'credential',
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status: 'active',
      expirationDate: '2027-12-31',
      credentialId: null,
    },
  });
  const coverage = buildJobEvidenceCoverage(target.id, requirements, [expired, active], now);
  const credentialItem = coverage.items.find((item) => item.requirement.kind === 'credential');
  assert.notEqual(credentialItem.mapping.classification, 'gap', 'valid current credential should be preferred over an expired textual match');
  assert.equal(credentialItem.evidence?.id, active.id);
}

console.log('requirement mapper tests passed');
