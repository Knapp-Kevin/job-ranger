const assert = require('node:assert/strict');
const { validateApplicationOfferInput } = require('../electron-runtime/electron/src/application-insights-validator.cjs');

const valid = validateApplicationOfferInput({
  status: 'active',
  basePay: 42.5,
  payBasis: 'hourly',
  currency: 'usd',
  startDate: '2026-11-01',
  responseDeadline: '2026-10-15',
  negotiationNotes: 'Ask about schedule.',
});
assert.equal(valid.currency, 'USD');
assert.equal(valid.basePay, 42.5);
assert.equal(valid.negotiationNotes, 'Ask about schedule.');

assert.throws(
  () => validateApplicationOfferInput({ status: 'maybe', payBasis: 'annual' }),
  /status is invalid/i,
);
assert.throws(
  () => validateApplicationOfferInput({ status: 'active', payBasis: 'weekly' }),
  /pay basis is invalid/i,
);
assert.throws(
  () => validateApplicationOfferInput({ status: 'active', payBasis: 'annual', basePay: -1 }),
  /non-negative/i,
);
assert.throws(
  () => validateApplicationOfferInput({ status: 'active', payBasis: 'annual', currency: 'US' }),
  /three-letter/i,
);
assert.throws(
  () => validateApplicationOfferInput({ status: 'active', payBasis: 'annual', startDate: 'not-a-date' }),
  /valid date/i,
);

console.log('application insights validator tests passed');
