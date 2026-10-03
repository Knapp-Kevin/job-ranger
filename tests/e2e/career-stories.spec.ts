import { test, expect } from "@playwright/test";
import {
  closeElectronApp,
  launchElectronApp,
  navigateTo,
  type ElectronAppFixture,
} from "./electron-app";

let fixture: ElectronAppFixture;
let firstEvidenceId = "";

const firstStatement = "Built a cross-functional customer operating cadence.";
const replacementStatement = "Built and maintained a cross-functional customer operating cadence.";
const secondStatement = "Reduced unresolved handoffs by clarifying ownership and escalation paths.";
const storyTitle = "Stabilizing a customer program";

test.beforeAll(async () => {
  fixture = await launchElectronApp();
  const seeded = await fixture.page.evaluate(async ({ first, second }) => {
    const firstEvidence = await window.electronAPI.career.createUserEvidence({
      subjectType: "achievement",
      statement: first,
      titleOrName: "Customer operating cadence",
      organization: "Example Company",
      skills: ["Customer Success", "Program Management"],
    });
    await window.electronAPI.career.createUserEvidence({
      subjectType: "achievement",
      statement: second,
      titleOrName: "Escalation ownership",
      organization: "Example Company",
      skills: ["Operations"],
    });
    return { firstEvidenceId: firstEvidence.id };
  }, { first: firstStatement, second: secondStatement });
  firstEvidenceId = seeded.firstEvidenceId;
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("Career Stories stay evidence-linked and require explicit repair after evidence changes", async () => {
  const { page } = fixture;
  await navigateTo(page, "/career-stories");

  await expect(
    page.getByRole("heading", { name: "Turn proven work into stories you can tell clearly.", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add story", exact: true }).click();
  await page.getByLabel("Career Story title", { exact: true }).fill(storyTitle);
  await page.getByLabel("Career Story tags", { exact: true }).fill("leadership, customer success");
  await page.getByLabel("Career Story situation", { exact: true }).fill("A strategic customer program had inconsistent handoffs.");
  await page.getByLabel("Career Story action", { exact: true }).fill("Built an operating cadence and clarified escalation ownership.");
  await page.getByLabel("Career Story result", { exact: true }).fill("The program gained a repeatable operating rhythm.");
  await page.getByLabel(`Use evidence: ${firstStatement}`, { exact: true }).check();
  await page.getByLabel(`Use evidence: ${secondStatement}`, { exact: true }).check();
  await page.getByRole("button", { name: "Create story", exact: true }).click();

  let storyCard = page.locator("article").filter({ hasText: storyTitle });
  await expect(storyCard).toBeVisible();
  await expect(storyCard.getByText(firstStatement, { exact: true })).toBeVisible();
  await expect(storyCard.getByText(secondStatement, { exact: true })).toBeVisible();
  await expect(storyCard).not.toContainText("Needs evidence review");

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await navigateTo(page, "/career-stories");
  storyCard = page.locator("article").filter({ hasText: storyTitle });
  await expect(storyCard).toBeVisible();
  await expect(storyCard.getByText(firstStatement, { exact: true })).toBeVisible();

  const replacement = await page.evaluate(
    async ({ evidenceId, statement }) =>
      window.electronAPI.careerEvidence.supersedeEvidence(evidenceId, {
        subjectType: "achievement",
        statement,
      }),
    { evidenceId: firstEvidenceId, statement: replacementStatement },
  );

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await navigateTo(page, "/career-stories");
  storyCard = page.locator("article").filter({ hasText: storyTitle });
  await expect(storyCard.getByText("Needs evidence review", { exact: true })).toBeVisible();
  await expect(storyCard.getByText(firstStatement, { exact: true })).toBeVisible();
  await expect(storyCard).not.toContainText(replacementStatement);

  await storyCard.getByRole("button", { name: `Edit Career Story ${storyTitle}`, exact: true }).click();
  await expect(page.getByText("This story references evidence that has changed.", { exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Suggested current replacement:.*${replacementStatement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))).toBeVisible();
  await expect(page.getByLabel(`Use evidence: ${replacementStatement}`, { exact: true })).not.toBeChecked();
  await expect(page.getByLabel(`Use evidence: ${secondStatement}`, { exact: true })).toBeChecked();

  await page.getByLabel(`Use evidence: ${replacementStatement}`, { exact: true }).check();
  await page.getByRole("button", { name: "Save story", exact: true }).click();

  storyCard = page.locator("article").filter({ hasText: storyTitle });
  await expect(storyCard).not.toContainText("Needs evidence review");
  await expect(storyCard.getByText(replacementStatement, { exact: true })).toBeVisible();
  await expect(storyCard).not.toContainText(firstStatement);

  const saved = await page.evaluate(() => window.electronAPI.careerStories.list());
  expect(saved).toHaveLength(1);
  expect(saved[0].staleEvidenceIds).toEqual([]);
  expect(saved[0].evidence.map((item) => item.evidenceId)).toContain(replacement.id);
});
