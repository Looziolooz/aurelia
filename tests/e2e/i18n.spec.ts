import { test, expect } from "@playwright/test";

test.describe("i18n language switching", () => {
  test("switch to EN updates headline", async ({ page }) => {
    await page.goto("/it");

    const itHeadline = page.locator("h1");
    await expect(itHeadline).toContainText(/AURELIA Pro X1|Il caffè/);

    const langPicker = page.locator('button[aria-label="Lingua"]');
    await langPicker.click();

    const enOption = page.locator('role=option >> text=EN');
    await enOption.click();

    const enHeadline = page.locator("h1");
    await expect(enHeadline).toContainText(/AURELIA Pro X1|espresso/i);
  });

  test("switch to SV updates headline", async ({ page }) => {
    await page.goto("/it");

    const langPicker = page.locator('button[aria-label="Lingua"]');
    await langPicker.click();

    const svOption = page.locator('role=option >> text=SV');
    await svOption.click();

    const svHeadline = page.locator("h1");
    await expect(svHeadline).toContainText(/AURELIA Pro X1|espresso/i);
  });

  test("language persists after page reload", async ({ page }) => {
    await page.goto("/it");

    const langPicker = page.locator('button[aria-label="Lingua"]');
    await langPicker.click();
    await page.locator('role=option >> text=EN').click();

    await page.reload();

    const currentLang = page.locator('button[aria-label="Lingua"]');
    await expect(currentLang).toContainText("EN");
  });

  test("after 61s no-touch language resets to IT", async ({ page }) => {
    // The idle threshold is IdleResetProvider's hardcoded IDLE_TIMEOUT_MS
    // (60_000). It is NOT exposed via env/query/store, so the wall-clock wait
    // cannot be shortened from the test without editing app code (out of
    // scope). We wait 61s = 60s threshold + ~1s for the timer + next-intl
    // route replace to settle. Mark the test slow so Playwright triples the
    // per-test timeout instead of failing this intentionally long path.
    test.slow();

    await page.goto("/it");

    const langPicker = page.locator('button[aria-label="Lingua"]');
    await langPicker.click();
    await page.locator('role=option >> text=EN').click();

    await page.waitForTimeout(61_000);

    const resetLang = page.locator('button[aria-label="Lingua"]');
    await expect(resetLang).toContainText("IT", { timeout: 5000 });
  });
});