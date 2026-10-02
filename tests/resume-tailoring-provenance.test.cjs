const assert = require("node:assert/strict");

const {
  buildTailoredStatementDrafts,
} = require("../electron-runtime/electron/src/resume-tailoring-service.cjs");

function evidence(id, statement) {
  return {
    id,
    subjectType: "achievement",
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
    verificationState: "user-confirmed",
    confidence: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const delivery = evidence(
  "evidence-delivery",
  "Coordinated delivery schedules across regional teams.",
);
const escalation = evidence(
  "evidence-escalation",
  "Resolved customer escalations across field operations.",
);
const reporting = evidence(
  "evidence-reporting",
  "Built weekly operational reporting for leadership.",
);

const combinedEdit = {
  id: "statement-combined",
  projectionId: "resume-source",
  section: "Experience",
  order: 0,
  text: "Coordinated regional delivery schedules while resolving field escalations.",
  evidenceIds: [delivery.id, escalation.id],
  generationMode: "deterministic",
  userEdited: true,
};

const ranks = new Map([
  [delivery.id, 0],
  [escalation.id, 1],
  [reporting.id, 2],
]);

const fullyRetained = buildTailoredStatementDrafts(
  [combinedEdit],
  [delivery, escalation, reporting],
  ranks,
);
assert.equal(fullyRetained.length, 2);
assert.equal(
  fullyRetained.filter((item) => item.text === combinedEdit.text).length,
  1,
  "a multi-evidence user edit must be preserved exactly once",
);
assert.deepEqual(
  fullyRetained.find((item) => item.text === combinedEdit.text)?.evidenceIds,
  [delivery.id, escalation.id],
  "preserved user edits must retain their complete evidence linkage",
);
assert.equal(
  fullyRetained.find((item) => item.evidenceIds.includes(reporting.id))?.text,
  reporting.statement,
);

const partiallyRetained = buildTailoredStatementDrafts(
  [combinedEdit],
  [delivery, reporting],
  ranks,
);
assert.equal(
  partiallyRetained.some((item) => item.text === combinedEdit.text),
  false,
  "a user edit must not survive when only part of its supporting evidence is selected",
);
assert.equal(
  partiallyRetained.find((item) => item.evidenceIds.includes(delivery.id))?.text,
  delivery.statement,
  "partial retention must fall back to canonical evidence text",
);

console.log("resume-tailoring-provenance.test.cjs passed");
