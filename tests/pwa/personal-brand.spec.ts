import { expect, test } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
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
  const exportGuide = page.getByTestId("linkedin-analytics-export-guide");
  await expect(exportGuide.locator("summary")).toHaveText(/export your LinkedIn analytics/i);
  await exportGuide.locator("summary").click();
  await expect(exportGuide.getByRole("link", { name: /LinkedIn Help/i })).toHaveAttribute("href", "https://www.linkedin.com/help/linkedin/answer/a703268");
  await expect(exportGuide.getByText(/Import preview available below/i)).toBeVisible();
  await expect(exportGuide.getByText(/Past 365 days/)).toBeVisible();


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


test("LinkedIn XLSX requires review before saving and deduplicates repeat imports", async ({ page, context }) => {
  const outbound: string[] = [];
  context.on("request", request => {
    if (new URL(request.url()).origin !== new URL(server.url).origin) outbound.push(request.url());
  });
  const columns = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sheetXml = (rows: Array<Array<string | number | null>>) => {
    const xmlRows = rows.map((row, index) => {
      const cells = row.map((value, col) => {
        if (value === null) return "";
        const ref = columns[col] + (index + 1);
        return typeof value === "number"
          ? `<c r="${ref}" t="n"><v>${value}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`;
      }).join("");
      return `<row r="${index + 1}">${cells}</row>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
  };
  const fakeUrl = "https://www.linkedin.com/posts/example-jobs-share-98765-abc";
  const data: Record<string, Array<Array<string | number | null>>> = {
    "DISCOVERY": [["Overall Performance", "10/8/2026 - 10/9/2026"], ["Impressions", 12], ["Members reached", 8]],
    "ENGAGEMENT": [["Date", "Impressions", "Engagements"], ["10/8/2026", 4, 0], ["10/9/2026", 8, 2]],
    "TOP POSTS": [["Maximum of 50 posts available to include in this list"], [],
      ["Post URL", "Post Publish Date", "Engagements", "481", "Post URL", "Post Publish Date", "Impressions"],
      [fakeUrl, "10/9/2026", 2, "481", fakeUrl, "10/9/2026", 10]],
    "FOLLOWERS": [["Total followers on 10/9/2026", 101], [], ["Date", "New followers"],
      ["10/8/2026", 0], ["10/9/2026", 1]],
    "AUDIENCE DEMOGRAPHICS": [["Top Demographics", "Value", "Percentage"], ["Location", "Exampleville", "< 1%"]],
    "CONTENT DEMOGRAPHICS": [["Top Demographics", "Value", "Percentage"], ["Company size", "11-50", "12%"]],
  };
  const names = Object.keys(data);
  const book = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;
  const files: Record<string, Uint8Array> = {
    "xl/workbook.xml": strToU8(book),
    "xl/_rels/workbook.xml.rels": strToU8(rels),
  };
  names.forEach((name, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(data[name])); });
  const zip = Buffer.from(zipSync(files));
  await page.goto(server.url);
  await waitForRuntime(page);
  await page.goto(`${server.url}#/personal-brand`);
  const area = page.getByTestId("linkedin-xlsx-preview");
  await area.getByLabel("Choose exported LinkedIn XLSX (local preview only)").setInputFiles({
    name: "AggregateAnalytics_synthetic.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: zip,
  });
  await expect.poll(async () => ({
    preview: await area.getByTestId("linkedin-preview-results").count(),
    importError: (await area.getByRole("alert").allTextContents()).join(" | "),
  }), { timeout: 10_000 }).toEqual({ preview: 1, importError: "" });
  await expect(area.getByText(/Export review: 2026-10-08 through 2026-10-09/)).toBeVisible();
  await expect(area.getByText("12", { exact: true })).toBeVisible();
  await expect(area.getByText("101", { exact: true })).toBeVisible();
  await expect(area.getByRole("link", { name: "View post" })).toHaveAttribute("href", fakeUrl);
  expect(outbound).toEqual([]);
  await expect(area.getByTestId("linkedin-import-ledger").getByText(/Saved LinkedIn exports \(0\)/)).toBeVisible();
  await expect(area.getByRole("button", { name: "Review and save LinkedIn export" })).toBeDisabled();
  await area.getByRole("checkbox", { name: /I reviewed the reporting period/i }).check();
  await area.getByRole("button", { name: "Review and save LinkedIn export" }).click();
  await expect(area.getByText(/LinkedIn analytics saved in the local Job Ranger database/)).toBeVisible();
  await expect(area.getByTestId("linkedin-import-ledger").getByText(/Saved LinkedIn exports \(1\)/)).toBeVisible();
  await page.reload();
  await waitForRuntime(page);
  const newArea = page.getByTestId("linkedin-xlsx-preview");
  await expect(page.getByTestId("linkedin-preview-results")).toHaveCount(0);
  await expect(newArea.getByTestId("linkedin-import-ledger").getByText(/Saved LinkedIn exports \(1\)/)).toBeVisible();
  await newArea.getByLabel("Choose exported LinkedIn XLSX (local preview only)").setInputFiles({
    name: "AggregateAnalytics_synthetic.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: zip,
  });
  await expect(newArea.getByTestId("linkedin-preview-results")).toBeVisible();
  await newArea.getByRole("checkbox", { name: /I reviewed the reporting period/i }).check();
  await newArea.getByRole("button", { name: "Review and save LinkedIn export" }).click();
  await expect(newArea.getByText(/already saved. No duplicate records/)).toBeVisible();
  await expect(newArea.getByTestId("linkedin-import-ledger").getByText(/Saved LinkedIn exports \(1\)/)).toBeVisible();
  await newArea.getByLabel("Select an import to delete").selectOption({ index: 1 });
  await newArea.getByRole("checkbox", { name: /I confirm deletion of the selected/i }).check();
  await newArea.getByRole("button", { name: "Delete selected export" }).click();
  await expect(newArea.getByTestId("linkedin-import-ledger").getByText(/Saved LinkedIn exports \(0\)/)).toBeVisible();
});
