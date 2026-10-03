const assert = require('node:assert/strict');
const {
  validateEvidenceReferences,
  validateEvidenceSupersedeInput,
} = require('../electron-runtime/electron/src/evidence-extension-validators.cjs');

{
  const references = validateEvidenceReferences([
    { kind: 'url', label: 'Portfolio', value: 'https://example.com/work' },
    { kind: 'local', label: 'Local sample', value: 'Portfolio/demo.pdf' },
    { kind: 'url', label: 'Duplicate', value: 'https://example.com/work' },
  ]);
  assert.equal(references.length, 2, 'duplicate reference targets should collapse deterministically');
  assert.equal(references[0].value, 'https://example.com/work');
  assert.equal(references[1].kind, 'local');
}

assert.throws(
  () => validateEvidenceReferences([{ kind: 'url', value: 'javascript:alert(1)' }]),
  /http or https/,
);
assert.throws(
  () => validateEvidenceReferences([{ kind: 'url', value: 'file:///tmp/sample.pdf' }]),
  /http or https/,
);
assert.throws(
  () => validateEvidenceReferences(new Array(11).fill({ kind: 'local', value: 'sample' })),
  /at most 10/,
);

{
  const replacement = validateEvidenceSupersedeInput({
    subjectType: 'project',
    statement: 'Built and maintained a public deployment tool.',
  });
  assert.equal(replacement.subjectType, 'project');
  assert.match(replacement.statement, /maintained/);
}

assert.throws(
  () => validateEvidenceSupersedeInput({ subjectType: 'project', statement: '   ' }),
  /cannot be empty/,
);

console.log('evidence extension validator tests passed');
