const assert = require('node:assert/strict');

const {
  validateApplicationContactInput,
  validateApplicationEventInput,
  validateApplicationEventUpdate,
} = require('../electron-runtime/electron/src/application-lifecycle-validator.cjs');

const contact = validateApplicationContactInput({
  name: '  Avery Recruiter  ',
  role: ' Recruiter ',
  email: ' avery@example.com ',
  phone: '',
  notes: ' Scheduling contact. ',
});
assert.equal(contact.name, 'Avery Recruiter');
assert.equal(contact.role, 'Recruiter');
assert.equal(contact.email, 'avery@example.com');
assert.equal(contact.phone, null);

assert.throws(
  () => validateApplicationContactInput({ name: '   ' }),
  /Contact name is required/,
);

const event = validateApplicationEventInput({
  kind: 'interview',
  title: ' Panel interview ',
  eventAt: '2026-10-10T15:00:00-04:00',
  reminderAt: '2026-10-10T13:00:00-04:00',
  notes: ' Bring examples. ',
});
assert.equal(event.title, 'Panel interview');
assert.equal(event.eventAt, '2026-10-10T19:00:00.000Z');
assert.equal(event.reminderAt, '2026-10-10T17:00:00.000Z');

assert.throws(
  () =>
    validateApplicationEventInput({
      kind: 'meeting-but-make-it-vague',
      title: 'Mystery event',
      eventAt: '2026-10-10T15:00:00.000Z',
    }),
  /kind is invalid/,
);

assert.throws(
  () =>
    validateApplicationEventInput({
      kind: 'follow-up',
      title: 'Follow up',
      eventAt: 'not-a-date',
    }),
  /Event time must be a valid date\/time/,
);

const update = validateApplicationEventUpdate({
  completedAt: '2026-10-10T20:00:00.000Z',
  reminderAt: null,
});
assert.equal(update.completedAt, '2026-10-10T20:00:00.000Z');
assert.equal(update.reminderAt, null);
