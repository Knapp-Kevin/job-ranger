import { test, expect } from "@playwright/test";
import {
  closeElectronApp,
  launchElectronApp,
  navigateTo,
  type ElectronAppFixture,
} from "./electron-app";

let fixture: ElectronAppFixture;

const originalStatement = "Built a deployment dashboard for release operations.";
const replacementStatement =
  "Built and maintained a deployment dashboard for release operations.";

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("retains work-sample references and explicit supersede lineage", async () => {
  const { page } = fixture;
  await navigateTo(page, "/career-evidence/new");

  await expect(
    page.getByRole("heading", {
      name: "Build your career evidence one fact at a time.",
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: "Evidence type", exact: true })
    .selectOption("project");
  await page
    .getByText("What did you do, know, earn, or accomplish?", { exact: true })
    .locator("..")
    .getByRole("textbox")
    .fill(originalStatement);
  await page
    .getByText("Role, project, credential, or item name", { exact: true })
    .locator("..")
    .getByRole("textbox")
    .fill("Deployment dashboard");
  await page.getByLabel("Work sample link", { exact: true }).fill(
    "https://example.com/deployment-dashboard",
  );
  await page
    .getByLabel("Local evidence reference", { exact: true })
    .fill("Portfolio/deployment-dashboard.pdf");

  await page.getByRole("button", { name: "Add career evidence", exact: true }).click();
  await expect(page.getByText("Saved as user-authored evidence", { exact: true })).toBeVisible();
  await expect(page.getByText(originalStatement, { exact: true })).toBeVisible();

  const initial = await page.evaluate(async (statement) => {
    const [items, metadata] = await Promise.all([
      window.electronAPI.career.listEvidence(),
      window.electronAPI.careerEvidence.listMetadata(),
    ]);
    const item = items.find(({ evidence }) => evidence.statement === statement) ?? null;
    const details = item
      ? metadata.find((entry) => entry.evidenceId === item.evidence.id) ?? null
      : null;
    return { item, details };
  }, originalStatement);

  expect(initial.item).not.toBeNull();
  expect(initial.item?.evidence.verificationState).toBe("user-authored");
  expect(initial.details?.references).toHaveLength(2);
  expect(initial.details?.references.map((reference) => reference.kind).sort()).toEqual([
    "local",
    "url",
  ]);
  expect(
    initial.details?.references.some(
      (reference) => reference.value === "https://example.com/deployment-dashboard",
    ),
  ).toBe(true);
  expect(
    initial.details?.references.some(
      (reference) => reference.value === "Portfolio/deployment-dashboard.pdf",
    ),
  ).toBe(true);

  await page
    .getByRole("button", { name: `Replace evidence: ${originalStatement}`, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Replacement evidence statement", exact: true })
    .fill(replacementStatement);
  await page.getByRole("button", { name: "Save replacement", exact: true }).click();

  await expect(page.getByText(replacementStatement, { exact: true })).toBeVisible();
  await expect(
    page.getByText("Replaces an earlier version of this fact", { exact: true }),
  ).toBeVisible();

  const afterReplacement = await page.evaluate(
    async ({ oldStatement, newStatement }) => {
      const [items, metadata] = await Promise.all([
        window.electronAPI.career.listEvidence(),
        window.electronAPI.careerEvidence.listMetadata(),
      ]);
      const oldItem = items.find(({ evidence }) => evidence.statement === oldStatement) ?? null;
      const newItem = items.find(({ evidence }) => evidence.statement === newStatement) ?? null;
      const oldMetadata = oldItem
        ? metadata.find((entry) => entry.evidenceId === oldItem.evidence.id) ?? null
        : null;
      const newMetadata = newItem
        ? metadata.find((entry) => entry.evidenceId === newItem.evidence.id) ?? null
        : null;
      return { oldItem, newItem, oldMetadata, newMetadata };
    },
    { oldStatement: originalStatement, newStatement: replacementStatement },
  );

  expect(afterReplacement.oldItem?.evidence.verificationState).toBe("rejected");
  expect(afterReplacement.newItem?.evidence.verificationState).toBe("user-authored");
  expect(afterReplacement.newMetadata?.references).toHaveLength(2);
  expect(
    afterReplacement.oldMetadata?.lineage.some(
      (entry) =>
        entry.predecessorEvidenceId === afterReplacement.oldItem?.evidence.id &&
        entry.successorEvidenceId === afterReplacement.newItem?.evidence.id &&
        entry.relation === "supersedes",
    ),
  ).toBe(true);

  await page.getByText(/Superseded history \(1\)/).click();
  await expect(page.getByText(originalStatement, { exact: true })).toBeVisible();
  await expect(page.getByText(`Replaced by: ${replacementStatement}`, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(replacementStatement, { exact: true })).toBeVisible();
  await expect(
    page.getByText("Replaces an earlier version of this fact", { exact: true }),
  ).toBeVisible();

  const persisted = await page.evaluate(async (statement) => {
    const [items, metadata] = await Promise.all([
      window.electronAPI.career.listEvidence(),
      window.electronAPI.careerEvidence.listMetadata(),
    ]);
    const item = items.find(({ evidence }) => evidence.statement === statement) ?? null;
    return item
      ? metadata.find((entry) => entry.evidenceId === item.evidence.id) ?? null
      : null;
  }, replacementStatement);
  expect(persisted?.references).toHaveLength(2);
  expect(
    persisted?.lineage.some(
      (entry) => entry.successorEvidenceId === persisted.evidenceId,
    ),
  ).toBe(true);
});
