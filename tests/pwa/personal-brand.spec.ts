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

  await page.getByRole("spinbutton", { name: "Impressions", exact: true }).fill("300");
  await page.getByRole("spinbutton", { name: "Members reached", exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Profile views from post", exact: true }).fill("7");
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
  // Restoring cached approval history must not auto-display selectable text
  // without another current-evidence check and editorial confirmation.
  await expect(page.getByLabel("Exact prepared post text")).toHaveCount(0);
  expect(outbound).toEqual([]);
});

test("linked factual claims fail closed after Career Evidence is superseded", async ({ page }) => {
  await page.goto(server.url);
  await waitForRuntime(page);

  const evidence = await page.evaluate(() => window.electronAPI.career.createUserEvidence({
    subjectType: "role",
    organization: "Sample Community Clinic",
    titleOrName: "Operations Coordinator",
    startDate: "2023-01",
    endDate: null,
    statement: "Coordinated appointment scheduling for a community clinic.",
    skills: ["Scheduling"],
    methodsOrTools: [],
    scope: [],
    outcomes: [],
    metrics: [],
    credential: null,
  }));

  await page.goto(`${server.url}#/personal-brand`);
  await expect(page.getByRole("heading", { name: /Make the post useful/i })).toBeVisible();
  await page.getByLabel("Post text (LinkedIn, text only)").fill(
    "I coordinated appointment scheduling for a community clinic.",
  );
  await page.getByRole("button", { name: "Add factual claim" }).click();
  await page.getByLabel("Claim being checked").fill(
    "I coordinated appointment scheduling for a community clinic.",
  );
  await page.getByLabel("Link Career Evidence for claim 1").selectOption(evidence.id);
  await page.getByRole("checkbox", { name: /personally checked this claim/i }).check();
  await page.getByRole("checkbox", { name: /private, confidential, or restricted/i }).check();
  await page.getByRole("checkbox", { name: /personally reviewed the exact content/i }).check();
  await page.getByRole("button", { name: "Prepare and copy" }).click();
  await expect(page.getByRole("button", { name: "Recheck evidence and copy" })).toBeVisible();

  const [draft] = await page.evaluate(() => window.electronAPI.personalBrand.listDrafts());
  expect(draft.claimChecks[0].evidenceIds).toEqual([evidence.id]);
  expect(draft.claimChecks[0].verified).toBe(true);

  const successor = await page.evaluate(({ id }) =>
    window.electronAPI.careerEvidence.supersedeEvidence(id, {
      subjectType: "role",
      statement: "Coordinated scheduling and referral tracking for a community clinic.",
    }), { id: evidence.id });
  await page.getByRole("button", { name: "Refresh Career Evidence" }).click();
  await expect(page.getByLabel("Exact prepared post text")).toHaveCount(0);
  await expect(page.getByText(/1 linked evidence record\(s\) are missing, rejected, or superseded/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Recheck evidence and copy" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Prepare and copy" })).toBeDisabled();

  const attempt = await page.evaluate(async ({ id, revision }) =>
    window.electronAPI.personalBrand.prepareDraft(id, revision, true).then(
      () => "allowed",
      (error: Error) => error.message,
    ), { id: draft.id, revision: draft.revision });
  expect(attempt).toMatch(/missing or no longer current/);

  await page.getByRole("button", { name: "Remove link" }).click();
  await page.getByLabel("Link Career Evidence for claim 1").selectOption(successor.id);
  await expect(page.getByRole("checkbox", { name: /personally checked this claim/i })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /private, confidential, or restricted/i })).not.toBeChecked();
  await page.getByRole("checkbox", { name: /personally checked this claim/i }).check();
  await page.getByRole("checkbox", { name: /private, confidential, or restricted/i }).check();
  await page.getByRole("checkbox", { name: /personally reviewed the exact content/i }).check();
  await page.getByRole("button", { name: "Prepare and copy" }).click();
  await expect(page.getByLabel("Exact prepared post text")).toHaveValue("I coordinated appointment scheduling for a community clinic.");
  const [updated] = await page.evaluate(() => window.electronAPI.personalBrand.listDrafts());
  expect(updated.revision).toBeGreaterThan(draft.revision);
  expect(updated.claimChecks[0].evidenceIds).toEqual([successor.id]);
});

test("comparison screen uses since-publication ages and shows non-causal suggestions", async ({ page }) => {
  await page.goto(server.url);
  await waitForRuntime(page);

  // Screenshots recorded days later should still compare at the time their
  // cumulative analytics window ended. User-entered metrics remain manual.
  await page.evaluate(async () => {
    const api = window.electronAPI.personalBrand;
    for (const [index, hook, views] of [
      [0, "concrete_experience", 10],
      [1, "contradiction", 3],
    ] as const) {
      const draft = await api.createDraft({
        body: `A verifiable experience from my professional journey ${index}.`,
        objective: "recruiter_discovery", audiences: ["hiring managers"],
        destination: "linkedin", format: "text", hookArchetype: hook,
        hypothesis: "Compare professional profile discovery.",
        claimChecks: [], mediaCount: 0, mediaAccessibilityReviewed: true,
      });
      await api.prepareDraft(draft.id, draft.revision, true);
      const publishedAt = new Date(Date.now() - (index + 5) * 86400000).toISOString();
      const receipt = await api.confirmPublication({
        draftId: draft.id, revision: draft.revision,
        publishedUrl: `https://www.linkedin.com/feed/update/urn:li:activity:learning-${index}`,
        publishedAt, userConfirmed: true,
      });
      await api.appendSnapshot(receipt.postId, {
        capturedAt: new Date().toISOString(),
        windowStart: publishedAt,
        windowEnd: new Date(Date.parse(publishedAt) + 24 * 3600000).toISOString(),
        sourceLabel: "Manually transcribed individual post metrics",
        observations: [
          { name: "profile_views", state: "manual", value: views },
          { name: "reached", state: "manual", value: 100 },
        ],
      });
    }
  });

  await page.goto(`${server.url}#/personal-brand`);
  await expect(page.getByRole("heading", { name: "4. Compare equivalent post ages" })).toBeVisible();
  await expect(page.getByText("2 comparable of 2 recorded LinkedIn posts")).toBeVisible();
  await expect(page.getByRole("cell", { name: "10.00%" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "3.00%" })).toBeVisible();
  await expect(page.getByText(/test one hook variation/i)).toBeVisible();
  await expect(page.getByText(/not proof of a winning hook/i)).toBeVisible();

  await page.getByLabel("Observation age").selectOption("48");
  await expect(page.getByText("0 comparable of 2 recorded LinkedIn posts")).toBeVisible();
  await expect(page.getByText(/Insufficient comparable data/)).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Observation age").selectOption("24");
  await page.getByLabel("Outcome measure").selectOption("engagements_per_reached");
  await expect(page.getByText("0 comparable of 2 recorded LinkedIn posts")).toBeVisible();
  await expect(page.getByText(/At least one required metric is unavailable/i).first()).toBeVisible();
  await page.reload();
  await waitForRuntime(page);
  await expect(page.getByRole("heading", { name: "4. Compare equivalent post ages" })).toBeVisible();
  await expect(page.getByText("2 comparable of 2 recorded LinkedIn posts")).toBeVisible();
});

test("career outcomes require manual confirmation and retain only user-attested post context", async ({ page }) => {
  await page.goto(server.url);
  await waitForRuntime(page);
  const publication = await page.evaluate(async () => {
    const api = window.electronAPI.personalBrand;
    const draft = await api.createDraft({
      body: "An example of my professional work.", objective: "career_narrative",
      audiences: ["recruiters"], destination: "linkedin", format: "text",
      hookArchetype: "lesson", hypothesis: "Professional context can lead to conversations.",
      claimChecks: [], mediaCount: 0, mediaAccessibilityReviewed: true,
    });
    await api.prepareDraft(draft.id, draft.revision, true);
    return api.confirmPublication({
      draftId: draft.id, revision: draft.revision,
      publishedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
      publishedUrl: "https://www.linkedin.com/feed/update/urn:li:activity:outcomes-1",
      userConfirmed: true,
    });
  });
  await page.goto(`${server.url}#/personal-brand`);
  await expect(page.getByRole("heading", { name: "5. Record real career outcomes" })).toBeVisible();
  await expect(page.getByText("No confirmed events recorded.")).toBeVisible();
  await page.getByLabel("Type of career outcome").selectOption("meaningful_conversation");
  const localTime = await page.evaluate(() => {
    const time = new Date(Date.now() - 60000);
    return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  await page.getByLabel("Local date and time of event").fill(localTime);
  await page.getByLabel("Related published post (optional)").selectOption(publication.postId);
  const save = page.getByRole("button", { name: "Save confirmed career outcome" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Observed post relationship").selectOption("post_mentioned");
  await page.getByRole("checkbox", { name: /I confirm the event actually happened/i }).check();
  await save.click();
  await expect(page.getByText("Career outcome recorded as user-attested, not attributed to a post.")).toBeVisible();

  let outcomes = await page.evaluate(() => window.electronAPI.personalBrand.listCareerOutcomes());
  expect(outcomes).toHaveLength(1);
  expect(outcomes[0].association).toBe("post_mentioned");
  expect(outcomes[0].relatedPostId).toBe(publication.postId);
  await expect(page.getByText(/1 confirmed events/)).toBeVisible();
  await expect(page.getByText(/not conversions attributable to a post/i)).toBeVisible();
  await page.reload();
  await waitForRuntime(page);
  await expect(page.getByRole("heading", { name: "5. Record real career outcomes" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Meaningful professional conversation" })).toBeVisible();

  const rejected = await page.evaluate(async (postId) => {
    const api = window.electronAPI.personalBrand;
    return api.recordCareerOutcome({
      kind: "offer", occurredAt: "2020-01-01T00:00:00.000Z",
      sourceLabel: "Personal journal", note: "",
      relatedPostId: postId, association: "post_mentioned", userConfirmed: true,
    }).then(() => "incorrectly allowed", (error: Error) => error.message);
  }, publication.postId);
  expect(rejected).toMatch(/post published later/);

  await page.getByRole("button", { name: "Remove outcome" }).click();
  await expect(page.getByRole("button", { name: "Confirm removal" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm removal" }).click();
  outcomes = await page.evaluate(() => window.electronAPI.personalBrand.listCareerOutcomes());
  expect(outcomes).toHaveLength(0);
  await expect(page.getByText("No confirmed events recorded.")).toBeVisible();
});
