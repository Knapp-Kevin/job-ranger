import { expect, test } from "@playwright/test";
import { startPwaServer, type PwaServer } from "./support/server";
import { distPwa, greenhouseFixture, waitForRuntime } from "./support/fixtures";

let server: PwaServer;
test.beforeAll(async () => { server = await startPwaServer(distPwa); });
test.afterAll(async () => { await server.close(); });

async function seedTrackedApplication(page: import("@playwright/test").Page) {
  await page.route("https://boards-api.greenhouse.io/**", async (route) => route.fulfill({
    status: 200, contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(greenhouseFixture),
  }));
  await page.goto(server.url);
  await waitForRuntime(page);
  const application = await page.evaluate(async () => {
    const api = window.electronAPI;
    const source = await api.companies.create({
      name: "Harbor Health", url: "https://boards.greenhouse.io/harbor-health",
      frequencyMinutes: 1440, isActive: false,
    });
    if ((await api.companies.runScrape(source.id)).status !== "success") throw Error("Fixture source unavailable");
    const [job] = await api.jobs.list();
    if (!job) throw Error("Fixture has no job");
    return api.applications.track(job.id);
  });
  await page.goto(`${server.url}#/applications`);
  await page.reload();
  await waitForRuntime(page);
  return application.id;
}

test("a rejected notes save blocks leaving until the user explicitly chooses what to do", async ({ page }) => {
  const id = await seedTrackedApplication(page);
  await page.evaluate(() => {
    window.electronAPI.applications.update = async () => { throw new Error("Synthetic offline notes save"); };
  });
  const notes = page.getByRole("textbox", { name: "Notes" });
  await notes.fill("Carefully recorded interview notes not yet persisted");
  await expect(page.getByRole("alert")).toContainText("Synthetic offline notes save");
  expect((await page.evaluate(() => window.electronAPI.applications.list()))
    .find((row) => row.id === id)?.notes).toBe("");

  await page.getByRole("link", { name: "Find Jobs" }).click();
  // This fails on baseline. Declarative HashRouter currently unmounts the
  // unsaved editor without any consent, losing the in-memory draft.
  await expect(page).toHaveURL(/#\/applications$/);
  await expect(page.getByRole("dialog", { name: "Leave with unsaved changes?" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Stay on this page" }).click();
  await expect(notes).toHaveValue("Carefully recorded interview notes not yet persisted");
});

test("clean application navigation is not blocked", async ({ page }) => {
  await seedTrackedApplication(page);
  await page.getByRole("link", { name: "Find Jobs" }).click();
  await expect(page).toHaveURL(/#\/jobs$/);
});
