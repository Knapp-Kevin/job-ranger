import { test, expect } from "@playwright/test";
import { launchElectronApp, closeElectronApp, type ElectronAppFixture } from "./electron-app";

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("diagnose evidence confirmation state across IPC and DOM", async () => {
  const { page } = fixture;
  const statement = "Coordinated scheduling for regional field teams.";

  await page.getByRole("link", { name: "Career Profile", exact: true }).click();
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page.getByText("Career history or resume text", { exact: true }).locator("..").getByRole("textbox").fill([
    "# Professional Experience",
    "Operations Coordinator at Northstar Distribution | 2022 - Present",
    `- ${statement}`,
    "# Skills",
    "Scheduling, Vendor coordination",
  ].join("\n"));
  await page.getByRole("button", { name: "Extract evidence", exact: true }).click();

  const proposal = page.locator("article").filter({ hasText: statement });
  await expect(proposal).toBeVisible();

  const before = await page.evaluate(async (targetStatement) => {
    const records = await window.electronAPI.career.listEvidence();
    return records
      .filter((item) => item.evidence.statement === targetStatement)
      .map((item) => ({ id: item.evidence.id, state: item.evidence.verificationState }));
  }, statement);
  console.log("DIAGNOSTIC before confirm", JSON.stringify(before));
  expect(before).toHaveLength(1);

  await proposal.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForTimeout(750);

  const afterClick = await page.evaluate(async (targetStatement) => {
    const records = await window.electronAPI.career.listEvidence();
    return records
      .filter((item) => item.evidence.statement === targetStatement)
      .map((item) => ({ id: item.evidence.id, state: item.evidence.verificationState }));
  }, statement);
  console.log("DIAGNOSTIC after UI click", JSON.stringify(afterClick));
  console.log("DIAGNOSTIC proposal after click", await proposal.allInnerTexts());
  console.log("DIAGNOSTIC visible errors", await page.locator(".text-\\[var\\(--color-danger\\)\\]").allInnerTexts());

  const direct = await page.evaluate(async ({ id }) => {
    try {
      const reviewed = await window.electronAPI.career.reviewEvidence(id, { action: "confirm" });
      return { ok: true, reviewed, error: null };
    } catch (error) {
      return {
        ok: false,
        reviewed: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, { id: before[0].id });
  console.log("DIAGNOSTIC direct IPC review", JSON.stringify(direct));

  const afterDirect = await page.evaluate(async (targetStatement) => {
    const records = await window.electronAPI.career.listEvidence();
    return records
      .filter((item) => item.evidence.statement === targetStatement)
      .map((item) => ({ id: item.evidence.id, state: item.evidence.verificationState }));
  }, statement);
  console.log("DIAGNOSTIC after direct IPC", JSON.stringify(afterDirect));

  expect(direct.ok).toBe(true);
  expect(afterDirect.map((item) => item.state)).toContain("user-confirmed");
});
