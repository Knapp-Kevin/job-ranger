import { test, expect } from "@playwright/test";
import {
  closeElectronApp,
  launchElectronApp,
  type ElectronAppFixture,
} from "./electron-app";

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("authors structured credential evidence without flattening eligibility facts into prose", async () => {
  const { page } = fixture;
  await page.evaluate(() => {
    window.location.hash = "#/career-evidence/new";
  });
  await expect(
    page.getByRole("heading", {
      name: "Build your career evidence one fact at a time.",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Evidence type", exact: true }).selectOption("credential");
  await expect(page.getByRole("heading", { name: "Credential details", exact: true })).toBeVisible();

  await page
    .getByText("What did you do, know, earn, or accomplish?", { exact: true })
    .locator("..")
    .getByRole("textbox")
    .fill("Active Maryland Registered Nurse license.");
  await page
    .getByText("Role, project, credential, or item name", { exact: true })
    .locator("..")
    .getByRole("textbox")
    .fill("Registered Nurse License");
  await page.getByLabel("Credential issuer", { exact: true }).fill("Maryland Board of Nursing");
  await page.getByLabel("Credential jurisdiction", { exact: true }).fill("Maryland");
  await page.getByLabel("Credential status", { exact: true }).selectOption("active");
  await page.getByLabel("Credential expiration date", { exact: true }).fill("2027-12-31");
  await page.getByLabel("Credential identifier", { exact: true }).fill("RN-EXAMPLE-001");

  await page.getByRole("button", { name: "Add career evidence", exact: true }).click();
  await expect(page.getByText("Saved as user-authored evidence", { exact: true })).toBeVisible();

  const authored = await page.evaluate(async () => {
    const items = await window.electronAPI.career.listEvidence();
    return items.find(
      ({ evidence }) => evidence.titleOrName === "Registered Nurse License",
    ) ?? null;
  });

  expect(authored).not.toBeNull();
  expect(authored?.evidence.verificationState).toBe("user-authored");
  expect(authored?.evidence.credential).toEqual({
    issuer: "Maryland Board of Nursing",
    jurisdiction: "Maryland",
    status: "active",
    expirationDate: "2027-12-31",
    credentialId: "RN-EXAMPLE-001",
  });
  expect(authored?.sources).toEqual([]);

  await page.reload();
  const persisted = await page.evaluate(async () => {
    const items = await window.electronAPI.career.listEvidence();
    return items.find(
      ({ evidence }) => evidence.titleOrName === "Registered Nurse License",
    ) ?? null;
  });
  expect(persisted?.evidence.credential?.status).toBe("active");
  expect(persisted?.evidence.credential?.jurisdiction).toBe("Maryland");
});
