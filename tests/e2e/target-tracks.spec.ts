import { test, expect } from "@playwright/test";
import {
  closeElectronApp,
  launchElectronApp,
  navigateTo,
  type ElectronAppFixture,
} from "./electron-app";

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();

  await fixture.page.evaluate(async () => {
    await window.electronAPI.career.saveProfile({
      version: 2,
      fullName: "Taylor Example",
      homeLocation: "Annapolis, MD",
      radiusMiles: 25,
      minimumPay: 35,
      payBasis: "hourly",
      targetTitles: ["Operations Coordinator"],
      skills: [],
      certifications: [],
      sectors: ["Operations"],
      onCallPreference: "either",
      fullTimeOnly: true,
      updatedAt: null,
    });
  });
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

test("promotes the legacy bridge and maintains multiple independent target tracks", async () => {
  const { page } = fixture;
  await navigateTo(page, "/target-tracks");

  await expect(
    page.getByRole("heading", { name: "Keep different career directions separate.", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Imported from Career Profile", { exact: true })).toBeVisible();

  await page.getByLabel("Track name", { exact: true }).fill("Primary local search");
  await page.getByLabel("Roles in this track", { exact: true }).fill(
    "Operations Coordinator\nProgram Coordinator",
  );
  await page.getByLabel("Remote", { exact: true }).check();
  await page.getByLabel("Work mode importance", { exact: true }).selectOption("required");
  await page.getByRole("button", { name: "Save target track", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  const promoted = await page.evaluate(async () => {
    const tracks = await window.electronAPI.career.listTargetTracks();
    return tracks.find((track) => track.id === "legacy-default") ?? null;
  });
  expect(promoted).not.toBeNull();
  expect(promoted?.origin).toBe("user");
  expect(promoted?.name).toBe("Primary local search");
  expect(promoted?.constraints.workModes.values).toContain("remote");
  expect(promoted?.constraints.workModes.strength).toBe("required");

  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Track name", { exact: true }).fill("Contract delivery");
  await page.getByLabel("Relationship to my career", { exact: true }).selectOption("adjacent");
  await page.getByLabel("Roles in this track", { exact: true }).fill("Implementation Consultant");
  await page.getByLabel("Remote", { exact: true }).check();
  await page.getByLabel("Contract", { exact: true }).check();
  await page.getByLabel("Freelance", { exact: true }).check();
  await page
    .getByLabel("Employment arrangement importance", { exact: true })
    .selectOption("required");
  await page.getByLabel("Compensation floor", { exact: true }).fill("65");
  await page.getByLabel("Compensation target", { exact: true }).fill("85");
  await page.getByLabel("Compensation floor importance", { exact: true }).selectOption("required");
  await page.getByLabel("Track pay basis", { exact: true }).selectOption("hourly");
  await page.getByRole("button", { name: "Save target track", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Primary local search/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Contract delivery/ })).toBeVisible();

  const persisted = await page.evaluate(() => window.electronAPI.career.listTargetTracks());
  expect(persisted).toHaveLength(2);
  const contractTrack = persisted.find((track) => track.name === "Contract delivery");
  expect(contractTrack?.constraints.employmentArrangements.values).toEqual([
    "contract",
    "freelance",
  ]);
  expect(contractTrack?.constraints.compensation).toMatchObject({
    floor: 65,
    target: 85,
    basis: "hourly",
    floorStrength: "required",
  });
});
