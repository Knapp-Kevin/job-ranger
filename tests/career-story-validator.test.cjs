const assert = require('node:assert/strict');
const {
  validateCareerStoryInput,
} = require('../electron-runtime/electron/src/career-story-validator.cjs');

const valid = {
  title: 'Launching a difficult customer program',
  tags: ['leadership', 'customer success', 'leadership'],
  situation: 'A strategic customer program lacked a repeatable operating cadence.',
  challenge: '',
  action: 'Built a cross-functional operating rhythm and decision path.',
  result: 'The team gained a repeatable cadence.',
  reflection: '',
  evidenceIds: ['evidence-one', 'evidence-two', 'evidence-one'],
};

const normalized = validateCareerStoryInput(valid);
assert.equal(normalized.title, valid.title);
assert.deepEqual(normalized.tags, ['leadership', 'customer success']);
assert.deepEqual(normalized.evidenceIds, ['evidence-one', 'evidence-two']);
assert.equal(normalized.challenge, '');

assert.throws(
  () => validateCareerStoryInput({ ...valid, title: '   ' }),
  /title cannot be empty/i,
);
assert.throws(
  () => validateCareerStoryInput({ ...valid, evidenceIds: [] }),
  /at least one item/i,
);
assert.throws(
  () => validateCareerStoryInput({ ...valid, evidenceIds: ['bad id with spaces'] }),
  /invalid characters/i,
);
assert.throws(
  () => validateCareerStoryInput({ ...valid, tags: Array.from({ length: 31 }, (_, index) => `tag-${index}`) }),
  /too many items/i,
);
assert.throws(
  () => validateCareerStoryInput({ ...valid, action: 'x'.repeat(5001) }),
  /too long/i,
);

console.log('career story validator tests passed');
