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
  id: "application-e2e-interview-prep",
  jobId: "7201",
  title: "AI Product Engineer",
  companyName: "Grounded Systems",
  url: "https://example.com/jobs/ai-product-engineer",
  status: "interview" as const,
  notes: "",
  createdAt: "2026-10-03T02:15:00.000Z",
  updatedAt: "2026-10-03T02:15:00.000Z",
};

test.beforeAll(async () => {
  fixture = await launchElectronApp();
  const status = await fixture.page.evaluate(() => window.electronAPI.system.getStatus());
  const now = "2026-10-03T02:15:00.000Z";
  const seedSql = `
    PRAGMA busy_timeout = 5000;
    BEGIN IMMEDIATE;
    INSERT INTO companies (
      id, name, url, source_type, source_identifier, frequency_minutes, is_active,
      last_run_at, last_run_status, last_error_message, consecutive_failures,
      circuit_open_until, created_at, updated_at
    ) VALUES (
      7200, 'Grounded Systems', 'https://example.com/careers', 'generic-html', NULL,
      1440, 1, NULL, 'idle', NULL, 0, NULL, '${now}', '${now}'
    );
    INSERT INTO jobs (
      id, company_id, source_job_id, source_type, title, location, employment_type,
      url, description_snippet, salary_min, salary_max, salary_currency, salary_text,
      post_date, created_at, last_seen_at, is_active, is_new, matched_filter_count
    ) VALUES (
      7201, 7200, 'interview-prep-e2e', 'generic-html', 'AI Product Engineer',
      'Remote', 'Full-time', 'https://example.com/jobs/ai-product-engineer',
      'Must have built production TypeScript services and APIs. Must have designed AI workflow orchestration for customer-facing products. Python preferred.',
      NULL, NULL, NULL, NULL, NULL, '${now}', '${now}', 1, 1, 0
    );
    COMMIT;
  `;
  await execFile(status.sqliteBinaryPath, [status.databasePath, seedSql]);

  await fixture.page.evaluate(async (seedApplication) => {
    await window.electronAPI.career.migrateLegacy({
      profile: null,
      applications: [seedApplication],
    });
    const submittedEvidence = await window.electronAPI.career.createUserEvidence({
      subjectType: "achievement",
      statement: "Built production TypeScript services and APIs.",
      titleOrName: "TypeScript platform delivery",
      organization: "Example Labs",
      skills: ["TypeScript", "APIs"],
    });
    await window.electronAPI.career.createUserEvidence({
      subjectType: "achievement",
      statement: "Designed AI workflow orchestration for customer-facing products.",
      titleOrName: "AI workflow orchestration",
      organization: "Example Labs",
      skills: ["AI workflows", "orchestration"],
    });

    const resume = await window.electronAPI.resume.create({
      jobId: seedApplication.jobId,
      context: "private-sector",
      pageFormat: "letter",
      templateId: "ats-standard-v1",
      contact: {
        fullName: "Taylor Example",
        email: "taylor@example.com",
        phone: "555-0100",
        location: "Annapolis, MD",
        links: [],
      },
      selectedEvidenceIds: [submittedEvidence.id],
    });
    const exported = await window.electronAPI.resume.exportPdf({
      projectionId: resume.projection.id,
      applicationId: seedApplication.id,
      purpose: "submitted",
    });
    if (!exported.artifact) throw new Error("Failed to seed exact submitted artifact");
  }, application);
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("interview prep distinguishes submitted claims from additional confirmed evidence", async () => {
  const { page } = fixture;
  await navigateTo(page, "/applications");

  const card = page.locator("article").filter({ hasText: application.title });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Interview prep", exact: false }).click();

  await expect(card.getByText("Exact PDF v1 recorded", { exact: true })).toBeVisible();
  await expect(card.getByText("Built production TypeScript services and APIs.", { exact: true })).toBeVisible();
  await expect(card.getByText("Evidence was submitted", { exact: true }).first()).toBeVisible();

  await expect(
    card.getByText("Designed AI workflow orchestration for customer-facing products.", { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Evidence not on submitted resume", { exact: true }).first()).toBeVisible();
  await expect(card.getByText(/additional context/i).first()).toBeVisible();

  await expect(card.getByText(/not predicted interview questions or hiring probabilities/i)).toBeVisible();
  await expect(card).not.toContainText(/\d+%/);
});
