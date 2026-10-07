import { test, expect, type Page } from "@playwright/test";
import { closeElectronApp, launchElectronApp, navigateTo, type ElectronAppFixture } from "./electron-app";

// Icons and affixes inside form controls must clear the control's text:
// shell padding once overrode the controls' padding utilities, so text started
// under the icon (BACKLOG G8).

let fixture: ElectronAppFixture;

test.beforeAll(async () => {
  fixture = await launchElectronApp();
});

test.afterAll(async () => {
  await closeElectronApp(fixture);
});

type Clearance = { label: string; gap: number };

/** Gap (px) between each decoration and the text area of the control it decorates. */
async function decorationClearance(page: Page, scope: string): Promise<Clearance[]> {
  return page.locator(scope).evaluate((root) => {
    const results: { label: string; gap: number }[] = [];
    for (const control of Array.from(root.querySelectorAll<HTMLElement>("input.input-shell, select.select-shell"))) {
      const wrapper = control.parentElement;
      if (!wrapper || getComputedStyle(wrapper).position !== "relative") continue;
      const style = getComputedStyle(control);
      const box = control.getBoundingClientRect();
      const contentLeft = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const contentRight = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
      const label = control.getAttribute("aria-label") || control.getAttribute("placeholder") || control.closest("label")?.textContent?.trim().slice(0, 40) || control.tagName;
      for (const decoration of Array.from(wrapper.children).filter((child) => child !== control)) {
        const mark = decoration.getBoundingClientRect();
        if (mark.width === 0) continue;
        const onLeft = mark.left < box.left + box.width / 2;
        results.push({ label: `${label} (${onLeft ? "left" : "right"})`, gap: onLeft ? contentLeft - mark.right : mark.left - contentRight });
      }
    }
    return results;
  }, undefined);
}

function expectClear(clearances: Clearance[], expected: number) {
  expect(clearances).toHaveLength(expected);
  for (const { label, gap } of clearances) expect(gap, label).toBeGreaterThanOrEqual(4);
}

test("Find Jobs filter text clears its icons and keeps keyboard focus styling", async () => {
  const { page } = fixture;
  await navigateTo(page, "/jobs");
  const search = page.getByPlaceholder("Search title or description");
  await expect(search).toBeVisible();
  expectClear(await decorationClearance(page, "main"), 4);

  const location = page.getByPlaceholder("Filter by location");
  const restingShadow = await location.evaluate((el) => getComputedStyle(el).boxShadow);
  await search.focus();
  await page.keyboard.press("Tab");
  await expect(location).toBeFocused();
  await expect.poll(() => location.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(restingShadow);
});

test("Career Profile icon, prefix and suffix fields clear their text", async () => {
  const { page } = fixture;
  await navigateTo(page, "/career-profile");
  const homeArea = page.getByLabel("Home area", { exact: true });
  await expect(homeArea).toBeEnabled();
  expectClear(await decorationClearance(page, "main"), 3);

  const roles = page.getByLabel(/^Roles you would consider/);
  const geometry = await roles.evaluate((el) => {
    const style = getComputedStyle(el);
    const parent = el.parentElement!.getBoundingClientRect();
    return { top: style.paddingTop, bottom: style.paddingBottom, width: el.getBoundingClientRect().width, parent: parent.width };
  });
  expect(geometry.top).toBe("12px");
  expect(geometry.bottom).toBe("12px");
  expect(Math.abs(geometry.width - geometry.parent)).toBeLessThanOrEqual(1);
});
