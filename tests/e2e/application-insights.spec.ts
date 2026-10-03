import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import {
  closeElectronApp,
  launchElectronApp,
  navigateTo,
  type ElectronAppFixture,
} from "./electron-app";

const execFile = promisify(execFileCallback);
let fixture: ElectronAppFixture;

const application = {
  id: "application-e2e-insights",
  jobId: "8201",
  title: "Platform Engineer",
  companyName: "Insight Systems",
  url: "https://example.com/jobs/platform-insights",
  status: "interested" as const,
  notes: "",
  createdAt: "2026-10-03T18:45:00.000Z",
  updatedAt: "2026-10-03T18:45:00.000Z",
};

test.beforeAll(async () => {
  fixture = await launchElectronApp();
  const status = await fixture.page.evaluate(() => window.electronAPI.system.getStatus());
  const now = application.createdAt;
  await execFile(status.sqliteBinaryPath, [status.databasePath, `
    PRAGMA busy_timeout = 5000;
    BEGIN IMMEDIATE;
    INSERT INTO companies (
      id, name, url, source_type, source_identifier, frequency_minutes, is_active,
      last_run_at, last_run_status, last_error_message, consecutive_failures,
      circuit_open_until, created_at, updated_at
    ) VALUES (
      8200, 'Insight Systems', 'https://example.com/careers', 'greenhouse', 'insight-systems',
      1440, 1, NULL, 'idle', NULL, 0, NULL, '${now}', '${now}'
    );
    INSERT INTO jobs (
      id, company_id, source_job_id, source_type, title, location, employment_type,
      url, description_snippet, salary_min, salary_max, salary_currency, salary_text,
      post_date, created_at, last_seen_at, is_active, is_new, matched_filter_count
    ) VALUES (
      8201, 8200, 'insights-e2e', 'greenhouse', 'Platform Engineer', 'Remote', 'Full-time',
      'https://example.com/jobs/platform-insights', 'TypeScript APIs required.',
      NULL, NULL, NULL, NULL, NULL, '${now}', '${now}', 1, 1, 0
    );
    COMMIT;
  `]);

  await fixture.page.evaluate(async (seedApplication) => {
    await window.electronAPI.career.migrateLegacy({ profile: null, applications: [seedApplication] });
    await window.electronAPI.career.createTargetTrack({
      name: "Platform roles",
      relation: "target",
      roleTitles: ["Platform Engineer"],
      seniority: null,
      direction: null,
      constraints: {
        geography: { locations: [], radiusMiles: null, strength: "preferred" },
        workModes: { values: ["remote"], strength: "preferred" },
        employmentArrangements: { values: ["full-time"], strength: "preferred" },
        schedules: { values: [], strength: "preferred" },
        compensation: { floor: null, target: null, basis: "annual", floorStrength: "preferred" },
        onCall: { value: "either", strength: "preferred" },
        industries: { values: [], strength: "preferred" },
      },
      isActive: true,
    });
  }, application);
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("application context and offer survive reload and feed cautious search insights", async () => {
  const { page } = fixture;
  await navigateTo(page, "/applications");
  const card = page.locator("article").filter({ hasText: application.title });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Search context & offer", exact: false }).click();

  await card.getByLabel("Application target track").selectOption({ label: "Platform roles" });
  await expect(card.getByLabel("Application target track")).toHaveValue(/.+/);

  await card.getByRole("button", { name: "Add offer details", exact: true }).click();
  await card.getByText("Base pay", { exact: true }).locator(".. ").getByRole("spinbutton").fill("145000").catch(async () => {
    await card.locator('input[type="number"]').fill("145000");
  });
  await card.getByText("Negotiation notes", { exact: true }).locator("..").getByRole("textbox").fill("Clarify remote policy.");
  await card.getByRole("button", { name: "Save offer details", exact: true }).click();

  await page.reload();
  await navigateTo(page, "/applications");
  const reloadedCard = page.locator("article").filter({ hasText: application.title });
  await reloadedCard.getByRole("button", { name: "Search context & offer", exact: false }).click();
  await expect(reloadedCard.getByLabel("Application target track")).toHaveValue(/.+/);
  await expect(reloadedCard.locator('input[type="number"]')).toHaveValue("145000");
  await expect(reloadedCard.getByText("Clarify remote policy.", { exact: true })).toBeVisible();

  await navigateTo(page, "/search-insights");
  await expect(page.getByRole("heading", { name: /saved search history actually shows/i })).toBeVisible();
  await expect(page.getByText(/only 1 tracked application/i)).toBeVisible();
  await expect(page.getByText("Platform roles", { exact: true })).toBeVisible();
  await expect(page.getByText(/not proof of causation/i)).toBeVisible();
});
