import { test, expect } from "@playwright/test";

const IDLE_MS = 61_000;

async function dismissAttractor(page: import("@playwright/test").Page) {
  await page.mouse.click(20, 20);
  await page.waitForTimeout(250);
}

test.describe("idle reset behavior", () => {
  test(`after ${IDLE_MS / 1000}s inactivity the attractor overlay reappears`, async ({
    page,
  }) => {
    test.setTimeout(IDLE_MS + 30_000);

    await page.goto("/it");
    await dismissAttractor(page);

    // The attractor is gone immediately after dismissal.
    const attractor = page.getByRole("button", { name: /esplorare|invite|tocca/i });
    await expect(attractor).toBeHidden();

    // Wait the idle threshold + a buffer for IdleResetProvider's timer to fire.
    await page.waitForTimeout(IDLE_MS);

    // After timeout the attractor div is rendered again (role=button covers
    // the screen). It carries the localised "Tocca per esplorare" label.
    await expect(attractor).toBeVisible({ timeout: 5000 });
  });

  test("active phase closes the popup when idle fires", async ({ page }) => {
    test.setTimeout(IDLE_MS + 30_000);

    await page.goto("/it");
    await dismissAttractor(page);

    // Open a popup.
    const railButton = page.locator("nav").getByRole("button").first();
    await railButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.waitForTimeout(IDLE_MS);

    // After idle the store resets to "attractor" → both popup and the
    // sidebar (which hides on attractor phase) go away.
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
  });

  test("first pointer activity dismisses the attractor in < 500 ms", async ({
    page,
  }) => {
    await page.goto("/it");

    const attractor = page.getByRole("button", { name: /esplorare|invite|tocca/i });
    await expect(attractor).toBeVisible();

    const start = Date.now();
    await page.mouse.click(200, 200);
    await expect(attractor).toBeHidden({ timeout: 800 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(800);
  });
});
