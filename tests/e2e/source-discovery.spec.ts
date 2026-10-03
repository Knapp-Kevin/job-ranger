import { test, expect } from "@playwright/test";
import type { CareerTargetTrackInput } from "../../src/shared/target-track-input";
import {
  closeElectronApp,
  launchElectronApp,
  navigateTo,
  type ElectronAppFixture,
} from "./electron-app";

let fixture: ElectronAppFixture;
let trackId = "";

const targetTrackInput: CareerTargetTrackInput = {
  name: "Customer success search",
  relation: "target",
  roleTitles: ["Customer Success Manager"],
  seniority: null,
  direction: null,
  constraints: {
    geography: {
      locations: ["Baltimore, MD"],
      radiusMiles: 40,
      strength: "preferred",
    },
    workModes: { values: ["remote"], strength: "preferred" },
    employmentArrangements: {
      values: ["full-time"],
      strength: "preferred",
    },
    schedules: { values: [], strength: "preferred" },
    compensation: {
      floor: null,
      target: null,
      basis: "annual",
      floorStrength: "preferred",
    },
    onCall: { value: "either", strength: "preferred" },
    industries: { values: [], strength: "preferred" },
  },
  isActive: true,
};

test.beforeAll(async () => {
  fixture = await launchElectronApp({ mockDiscovery: true });
  trackId = await fixture.page.evaluate(async (input) => {
    const track = await window.electronAPI.career.createTargetTrack(input);
    return track.id;
  }, targetTrackInput);
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("discovers opportunities, dismisses a lead, and approves a monitorable employer source", async () => {
  const { page } = fixture;
  await navigateTo(page, "/companies");

  await expect(
    page.getByRole("heading", {
      name: "Find places to look, then choose what Job Ranger should monitor.",
      exact: true,
    }),
  ).toBeVisible();

  const trackSelect = page.getByRole("combobox", {
    name: "Discovery target track",
    exact: true,
  });
  await expect(trackSelect).toHaveValue(trackId);
  await expect(page.getByText("Baltimore, MD", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Find opportunities", exact: true }).click();
  await expect(page.getByText("Partial coverage", { exact: true })).toBeVisible();

  const monitorableCard = page.locator("article").filter({ hasText: "Acme Discovery" });
  await expect(monitorableCard).toBeVisible();
  await expect(monitorableCard.getByText("Remote OK", { exact: false })).toBeVisible();
  await expect(
    monitorableCard.getByText("Monitorable employer source found", { exact: true }),
  ).toBeVisible();

  const opportunityOnlyCard = page.locator("article").filter({ hasText: "Beta Discovery" });
  await expect(opportunityOnlyCard).toBeVisible();
  await expect(opportunityOnlyCard.getByText("Arbeitnow", { exact: false })).toBeVisible();
  await expect(opportunityOnlyCard.getByText("Opportunity only", { exact: true })).toBeVisible();

  await opportunityOnlyCard
    .getByRole("button", {
      name: "Dismiss Customer Success Specialist at Beta Discovery",
      exact: true,
    })
    .click();
  await expect(opportunityOnlyCard).toHaveCount(0);
  await expect(page.getByText("1 dismissed this run", { exact: true })).toBeVisible();

  await monitorableCard
    .getByRole("button", { name: "Approve & monitor source", exact: true })
    .click();
  await expect(
    monitorableCard.getByText("Approved for monitoring", { exact: true }),
  ).toBeVisible();

  const companies = await page.evaluate(() => window.electronAPI.companies.list());
  const approved = companies.find((company) => company.name === "Acme Discovery");
  expect(approved).toBeTruthy();
  expect(approved?.sourceType).toBe("greenhouse");
  expect(approved?.sourceIdentifier).toBe("acme-discovery");
  expect(approved?.url).toBe("https://boards.greenhouse.io/acme-discovery");
  expect(approved?.isActive).toBe(true);

  await page.getByRole("button", { name: "Find opportunities", exact: true }).click();
  const rediscovered = page.locator("article").filter({ hasText: "Acme Discovery" });
  await expect(rediscovered).toBeVisible();
  await expect(rediscovered.getByText("Already monitored", { exact: true })).toBeVisible();
  await expect(
    rediscovered.getByRole("button", { name: "Approve & monitor source", exact: true }),
  ).toHaveCount(0);
});
