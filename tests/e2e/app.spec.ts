import { test, expect } from "@playwright/test";
import { launchElectronApp, closeElectronApp, type ElectronAppFixture } from "./electron-app";

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

async function navigateTo(
  page: ElectronAppFixture["page"],
  destination:
    | "Home"
    | "Find Jobs"
    | "Applications"
    | "Career Profile"
    | "Companies"
    | "Filters"
    | "Settings",
) {
  await page.getByRole("link", { name: destination, exact: true }).click();
}

test.describe("Job Ranger E2E Tests", () => {
  test("app launches and shows dashboard", async () => {
    const { page } = fixture;

    await expect(page.getByRole("heading", { name: "Job Ranger", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Build a calmer review ritual around the jobs you actually want.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("navigation sidebar works", async () => {
    const { page } = fixture;

    await navigateTo(page, "Companies");
    await expect(
      page.getByRole("heading", {
        name: "Bring in real career pages, then let Job Ranger adapt its extraction strategy.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Find Jobs");
    await expect(
      page.getByRole("heading", {
        name: "Spend your time on the jobs that look worth it.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Applications");
    await expect(
      page.getByRole("heading", {
        name: "Keep track of what happens after a job looks promising.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Career Profile");
    await expect(
      page.getByRole("heading", {
        name: "Tell Job Ranger what good work looks like for you.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Filters");
    await expect(
      page.getByRole("heading", {
        name: "Build filters that coach the next scrape toward relevance.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Settings");
    await expect(
      page.getByRole("heading", {
        name: "Shape the workspace around how you actually review opportunities.",
        exact: true,
      }),
    ).toBeVisible();

    await navigateTo(page, "Home");
    await expect(
      page.getByRole("heading", {
        name: "Build a calmer review ritual around the jobs you actually want.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("companies page shows empty state", async () => {
    const { page } = fixture;

    await navigateTo(page, "Companies");
    await expect(page.getByText("Total sources", { exact: true })).toBeVisible();
  });

  test("can open add company modal", async () => {
    const { page } = fixture;

    await navigateTo(page, "Companies");
    await page.getByRole("button", { name: "Add source", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Add job source", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#company-name")).toBeVisible();
    await expect(dialog.locator("#company-url")).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("can add a company source", async () => {
    const { page } = fixture;

    await navigateTo(page, "Companies");
    await page.getByRole("button", { name: "Add source", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Add job source", exact: true });
    await dialog.locator("#company-name").fill("Test Company");
    await dialog.locator("#company-url").fill("https://boards.greenhouse.io/testcompany");
    await dialog.getByRole("button", { name: "Save source", exact: true }).click();

    await expect(page.getByText("Test Company", { exact: true })).toBeVisible();
    await expect(page.getByText("Greenhouse", { exact: true })).toBeVisible();
  });

  test("jobs page loads", async () => {
    const { page } = fixture;

    await navigateTo(page, "Find Jobs");
    await expect(
      page.getByRole("heading", {
        name: "Spend your time on the jobs that look worth it.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("filters page shows empty state", async () => {
    const { page } = fixture;

    await navigateTo(page, "Filters");
    await expect(page.getByRole("heading", { name: "No filters yet", exact: true })).toBeVisible();
  });

  test("can open add filter modal", async () => {
    const { page } = fixture;

    await navigateTo(page, "Filters");
    await page.getByRole("button", { name: "Create filter", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Create filter", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Filter name", { exact: true })).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("settings page shows configuration options", async () => {
    const { page } = fixture;

    await navigateTo(page, "Settings");

    await expect(page.getByRole("heading", { name: "Functional themes", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Runtime behavior", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save runtime settings", exact: true }),
    ).toBeVisible();
  });

  test("can toggle notification settings", async () => {
    const { page } = fixture;

    await navigateTo(page, "Settings");

    const notificationCheckbox = page.getByRole("checkbox", {
      name: "Enable desktop notifications",
      exact: true,
    });
    const initialChecked = await notificationCheckbox.isChecked();

    await notificationCheckbox.click();
    await expect(notificationCheckbox).toBeChecked({ checked: !initialChecked });
  });

  test("can delete a company", async () => {
    const { page } = fixture;

    await navigateTo(page, "Companies");

    const company = page.getByText("Test Company", { exact: true });
    if ((await company.count()) > 0) {
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await expect(company).toHaveCount(0);
    }
  });
});
