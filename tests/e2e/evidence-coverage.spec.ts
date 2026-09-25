import { test, expect } from "@playwright/test";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { launchElectronApp, closeElectronApp, type ElectronAppFixture } from "./electron-app";

const execFile = promisify(execFileCallback);
let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("Find Jobs shows evidence coverage and Prepare resume handoff", async () => {
  const { page } = fixture;

  await page.getByRole("link", { name: "Career Profile", exact: true }).click();
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByText("Career history or resume text", { exact: true })
    .locator("..")
    .getByRole("textbox")
    .fill([
      "# Professional Experience",
      "Administrative Coordinator at Harbor Office Group | 2023 - Present",
      "- Coordinated vendor schedules and maintained office records for a regional team.",
    ].join("\n"));
  await page.getByRole("button", { name: "Extract evidence", exact: true }).click();

  const proposal = page.locator("article").filter({
    hasText: "Coordinated vendor schedules and maintained office records",
  });
  await expect(proposal).toBeVisible();
  await proposal.getByRole("button", { name: "Confirm", exact: true }).click();

  const status = await page.evaluate(() => window.electronAPI.system.getStatus());
  const now = "2026-09-25T17:00:00.000Z";
  const sql = `
    INSERT INTO companies (
      name, url, source_type, source_identifier, frequency_minutes, is_active,
      last_run_at, last_run_status, last_error_message, created_at, updated_at,
      consecutive_failures, circuit_open_until
    ) VALUES (
      'Coverage Test Employer', 'https://example.com/careers', 'generic-html', NULL,
      1440, 1, NULL, 'idle', NULL, '${now}', '${now}', 0, NULL
    );
    INSERT INTO jobs (
      company_id, source_job_id, source_type, title, location, employment_type,
      url, description_snippet, salary_min, salary_max, salary_currency, salary_text,
      post_date, created_at, last_seen_at, is_active, is_new, matched_filter_count
    ) VALUES (
      last_insert_rowid(), 'coverage-6201', 'generic-html', 'Administrative Coordinator',
      'Annapolis, MD', 'Full-time', 'https://example.com/jobs/coverage-6201',
      'Must coordinate vendor schedules and maintain office records. Project management certification preferred.',
      NULL, NULL, NULL, NULL, NULL, '${now}', '${now}', 1, 1, 0
    );
  `;
  await execFile(status.sqliteBinaryPath, [status.databasePath, sql]);

  await page.reload();
  await page.getByRole("link", { name: "Find Jobs", exact: true }).click();
  await expect(page.getByText("Administrative Coordinator", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Evidence coverage/ }).click();
  await expect(page.getByText(/supported/).first()).toBeVisible();
  await expect(page.getByText("Transferable", { exact: true }).or(page.getByText("Supported", { exact: true })).first()).toBeVisible();
  await expect(page.getByText(/Gaps stay gaps/)).toBeVisible();

  await page.getByRole("button", { name: "Prepare resume", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Build the document from facts you have actually confirmed.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Targeting tracked job/)).toBeVisible();
  await expect(page).toHaveURL(/\/resume\?job=/);
});
