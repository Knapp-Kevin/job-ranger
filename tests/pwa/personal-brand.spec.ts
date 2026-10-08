import { expect, test } from "@playwright/test";
import { startPwaServer, type PwaServer } from "./support/server";
import { distPwa, waitForRuntime } from "./support/fixtures";

let server: PwaServer;
test.beforeAll(async () => { server = await startPwaServer(distPwa); });
test.afterAll(async () => { await server.close(); });

test("Personal Brand manual workflow persists exact copy, receipt and analytics after reload", async ({ page, context }) => {
  const outbound: string[] = [];
  context.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(server.url).origin)
      outbound.push(request.url());
  });
  await page.goto(server.url);
  await waitForRuntime(page);
  await page.goto(`${server.url}#/personal-brand`);
  await expect(page.getByRole("heading", { name: /Make the post useful/i })).toBeVisible();

  const text = "A rejection taught me that hiring signals can be incomplete. Here is what I learned.";
  await page.getByLabel("Post text (LinkedIn, text only)").fill(text);
  await page.getByLabel("Hook type").selectOption("concrete_experience");
  await page.getByLabel("Hypothesis to evaluate").fill("A concrete experience brings profile visits.");
  await expect(page.getByText("A human must review originality")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved in the Job Ranger database.")).toBeVisible();

  await page.reload();
  await waitForRuntime(page);
  await expect(page.getByLabel("Post text (LinkedIn, text only)")).toHaveValue(text);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Prepare and copy" }).click();
  await expect(page.getByLabel("Exact prepared post text")).toHaveValue(text);
  const apiPrepared = await page.evaluate(() => window.electronAPI.personalBrand.listPrepared());
  expect(apiPrepared).toHaveLength(1);
  expect(apiPrepared[0].body).toBe(text);

  await page.getByLabel("LinkedIn post URL").fill("https://www.linkedin.com/feed/update/urn:li:activity:15991");
  const publishTime = await page.evaluate(() => {
    const date = new Date(Date.now() - 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  await page.getByLabel("Local publication date and time").fill(publishTime);
  await expect(page.getByRole("button", { name: "Record manual publication" })).toBeDisabled();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Record manual publication" }).click();
  await expect(page.getByText(/publication was recorded as user-confirmed/i)).toBeVisible();
  const publications = await page.evaluate(() => window.electronAPI.personalBrand.listPublications());
  expect(publications).toHaveLength(1);

  await page.getByLabel("Impressions").fill("300");
  await page.getByLabel("Members reached").fill("200");
  await page.getByLabel("Profile views from post").fill("7");
  await page.getByRole("button", { name: "Save timestamped analytics" }).click();
  await expect(page.getByText("Profile visits/reached:")).toBeVisible();
  await expect(page.getByText("3.50%")).toBeVisible();
  const saved = await page.evaluate((id) => window.electronAPI.personalBrand.listSnapshots(id), publications[0].postId);
  expect(saved).toHaveLength(1);
  expect(saved[0].observations.find((m: { name: string }) => m.name === "followers_gained").state).toBe("unavailable");
  expect(saved[0].observations.find((m: { name: string }) => m.name === "reached").value).toBe(200);

  await page.reload();
  await waitForRuntime(page);
  await expect(page.getByLabel("Post text (LinkedIn, text only)")).toHaveValue(text);
  await expect(page.getByText("3.50%")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publication recorded" })).toBeDisabled();
  expect(outbound).toEqual([]);
});
