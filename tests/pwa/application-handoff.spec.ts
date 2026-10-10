import { expect, test } from "@playwright/test";
import { startPwaServer, type PwaServer } from "./support/server";
import { distPwa, greenhouseFixture, healthcareProfile, waitForRuntime } from "./support/fixtures";

let server: PwaServer;
test.beforeAll(async () => { server = await startPwaServer(distPwa); });
test.afterAll(async () => { await server.close(); });

test("candidate-authorized handoff copies only a fresh saved material without submitting", async ({ page }) => {
  await page.route("https://boards-api.greenhouse.io/**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(greenhouseFixture),
  }));

  await page.goto(server.url);
  await waitForRuntime(page);
  await page.evaluate((profile) => window.electronAPI.career.saveProfile(profile), healthcareProfile);
  const ids = await page.evaluate(async () => {
    const api = window.electronAPI;
    const source = await api.companies.create({
      name: "Harbor Health", url: "https://boards.greenhouse.io/harbor-health",
      frequencyMinutes: 1440, isActive: false,
    });
    const result = await api.companies.runScrape(source.id);
    if (result.status !== "success") throw new Error("Fixture acquisition failed");
    const jobs = await api.jobs.list();
    const evidence = await api.career.createUserEvidence({
      subjectType: "role",
      organization: "Harbor Family Clinic",
      titleOrName: "Patient Services Coordinator",
      statement: "Coordinated patient scheduling, referrals, insurance verification, and front-desk workflows for a multi-provider clinic.",
      skills: ["Patient scheduling", "Insurance verification"],
    });
    const application = await api.applications.track(jobs[0].id);
    const draft = await api.applicationMaterials.createCoverLetter(application.id);
    if (draft.projection.staleEvidenceIds.length) throw new Error("Fixture material unexpectedly stale");
    return { applicationId: application.id, evidenceId: evidence.id };
  });

  await page.goto(server.url + "#/applications");
  await waitForRuntime(page);
  const card = page.locator("article").filter({ hasText: "Harbor Health" });
  await card.getByRole("button", { name: "Application materials", exact: false }).click();
  await expect(card.getByText("Cover letter v1", { exact: true })).toBeVisible();

  // Exercise Chromium's real clipboard path before introducing a synthetic denial.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(server.url).origin,
  });
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(server.url)) externalRequests.push(request.url());
  });
  await card.getByRole("button", { name: "Copy cover letter v1" }).click();
  await expect(card.getByRole("status", { name: "Cover letter copy status" })).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Coordinated patient scheduling");
  expect((await page.evaluate(() => window.electronAPI.applications.list()))
    .find((item) => item.id === ids.applicationId)?.status).toBe("interested");
  expect(externalRequests).toEqual([]);

  // A permission error must not be reported as success.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("Denied clipboard access"); } },
    });
  });
  await card.getByRole("button", { name: "Copy cover letter v1" }).click();
  await expect(card.getByRole("alert", { name: "Cover letter copy error" }))
    .toContainText("Denied clipboard access");

  // The previously rendered draft was valid; an authoritative re-read must now block it.
  await page.evaluate(async (id) => {
    await window.electronAPI.careerEvidence.supersedeEvidence(id, {
      subjectType: "role",
      statement: "Maintained patient communications and referral updates.",
    });
  }, ids.evidenceId);
  await card.getByRole("button", { name: "Copy cover letter v1" }).click();
  await expect(card.getByRole("alert", { name: "Cover letter copy error" }))
    .toContainText("changed");
  await expect(card.getByRole("button", { name: "Copy cover letter v1" })).toBeDisabled();
  expect((await page.evaluate(() => window.electronAPI.applications.list()))
    .find((item) => item.id === ids.applicationId)?.status).toBe("interested");
});
