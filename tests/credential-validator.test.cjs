const assert = require('node:assert/strict');
const {
  validateUserAuthoredEvidenceInput,
} = require('../electron-runtime/electron/src/career-validators.cjs');

function base(overrides = {}) {
  return {
    subjectType: 'credential',
    statement: 'Active Maryland Registered Nurse license.',
    titleOrName: 'Registered Nurse License',
    credential: {
      issuer: 'Maryland Board of Nursing',
      jurisdiction: 'Maryland',
      status: 'active',
      expirationDate: '2027-12-31',
      credentialId: 'RN-EXAMPLE-001',
    },
    ...overrides,
  };
}

{
  const result = validateUserAuthoredEvidenceInput(base());
  assert.deepEqual(result.credential, {
    issuer: 'Maryland Board of Nursing',
    jurisdiction: 'Maryland',
    status: 'active',
    expirationDate: '2027-12-31',
    credentialId: 'RN-EXAMPLE-001',
  });
}

{
  const result = validateUserAuthoredEvidenceInput(base({ credential: {
    issuer: '',
    jurisdiction: '',
    status: null,
    expirationDate: null,
    credentialId: '',
  } }));
  assert.equal(
    result.credential,
    undefined,
    'empty optional credential structure should disappear at the IPC input boundary',
  );
}

assert.throws(
  () => validateUserAuthoredEvidenceInput({
    subjectType: 'project',
    statement: 'Built a project.',
    credential: { status: 'active' },
  }),
  /credential evidence/,
);

assert.throws(
  () => validateUserAuthoredEvidenceInput(base({ credential: { status: 'revoked' } })),
  /status is invalid/,
);

assert.throws(
  () => validateUserAuthoredEvidenceInput(base({ credential: { expirationDate: '2027-02-31' } })),
  /valid calendar date/,
);

console.log('credential validator tests passed');
