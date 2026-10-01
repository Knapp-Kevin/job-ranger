import { test, expect } from "@playwright/test";
import { closeElectronApp, launchElectronApp, navigateTo, type ElectronAppFixture } from "./electron-app";

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp({ showOnboarding: true });
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test.describe("progressive first-run onboarding", () => {
  test("fresh users can start from a resume, manual entry, or goals", async () => {
    const { page } = fixture;

    await expect(
      page.getByRole("heading", { name: "Start with what you already have.", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "I already have a resume", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "I do not have a resume handy", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "I know what I want to look for", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import a resume", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter my background", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save goals and continue", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip setup for now", exact: true })).toBeVisible();
  });

  test("goal-first setup persists a partial profile and enters the workspace", async () => {
    const { page } = fixture;

    await page.getByLabel("Work I want to pursue", { exact: true }).fill(
      "Customer Success Manager\nImplementation Manager",
    );
    await page.getByLabel("Home area", { exact: true }).fill("Annapolis, MD");
    await page.locator('input[type="number"]').fill("90000");
    await page.getByRole("combobox", { name: "Onboarding pay basis", exact: true }).selectOption("annual");
    await page.getByRole("button", { name: "Save goals and continue", exact: true }).click();

    await expect(
      page.getByRole("heading", {
        name: "Build a calmer review ritual around the jobs you actually want.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "/career-profile");
    await expect(page.getByLabel("Home area", { exact: true })).toHaveValue("Annapolis, MD");
    await expect(
      page.getByText("Roles you would consider", { exact: true }).locator("..").getByRole("textbox"),
    ).toHaveValue("Customer Success Manager\nImplementation Manager");
    await expect(page.getByRole("combobox", { name: "Pay basis", exact: true })).toHaveValue("annual");

    await navigateTo(page, "/");
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Build a calmer review ritual around the jobs you actually want.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("manual-entry path hands off to the canonical Career Profile", async () => {
    const { page } = fixture;

    await page.evaluate(() => {
      window.location.hash = "#/onboarding";
    });
    await expect(
      page.getByRole("heading", { name: "Start with what you already have.", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Enter my background", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Tell Job Ranger what good work looks like for you.",
        exact: true,
      }),
    ).toBeVisible();
  });
});
