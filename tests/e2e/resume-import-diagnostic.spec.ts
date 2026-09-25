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

  await proposal.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect.poll(async () => {
    return page.evaluate(async (targetStatement) => {
      const records = await window.electronAPI.career.listEvidence();
      return records
        .filter((item) => item.evidence.statement === targetStatement)
        .map((item) => item.evidence.verificationState)
        .join(",");
    }, statement);
  }).toContain("user-confirmed");

  const after = await page.evaluate(async (targetStatement) => {
    const records = await window.electronAPI.career.listEvidence();
    return records
      .filter((item) => item.evidence.statement === targetStatement)
      .map((item) => ({ id: item.evidence.id, state: item.evidence.verificationState }));
  }, statement);
  console.log("DIAGNOSTIC after confirm", JSON.stringify(after));
  console.log("DIAGNOSTIC proposal count", await proposal.count());
  console.log("DIAGNOSTIC proposal text", await proposal.allInnerTexts());
  console.log("DIAGNOSTIC page confirmed labels", await page.getByText(/Confirmed career evidence/).allInnerTexts());
  console.log("DIAGNOSTIC page needs review text", await page.getByText("Needs review", { exact: true }).locator("..").allInnerTexts());

  await expect(
    page.getByText("Confirmed career evidence (1)", { exact: true }),
  ).toBeVisible();
});
