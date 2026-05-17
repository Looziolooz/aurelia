import { test, expect } from "@playwright/test";
import hotspotsData from "../../data/hotspots.json";
import itMessages from "../../messages/it.json";

const HOTSPOTS = hotspotsData.hotspots as Array<{
  id: string;
  i18nKey: string;
  order: number;
}>;

// Resolve `hotspot.display.title` → "Display touch" from the IT bundle.
function localTitle(i18nKey: string): string {
  const path = `${i18nKey}.title`.split(".");
  let node: unknown = itMessages;
  for (const seg of path) {
    if (node && typeof node === "object" && seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg];
    } else {
      throw new Error(`Missing i18n key: ${path.join(".")}`);
    }
  }
  if (typeof node !== "string") throw new Error(`Not a string: ${path.join(".")}`);
  return node;
}

async function dismissAttractor(page: import("@playwright/test").Page) {
  // The attractor overlay swallows the first pointerdown anywhere on the
  // document and transitions phase: "attractor" → "active". Use a click on
  // a chrome-free area so we don't accidentally interact with the sidebar.
  await page.mouse.click(20, 20);
  // Give GSAP exit animation time to settle before the sidebar becomes
  // pointer-event-active.
  await page.waitForTimeout(250);
}

test.describe("Hotspot interaction (sidebar + glass popup)", () => {
  for (const hotspot of HOTSPOTS) {
    const title = localTitle(hotspot.i18nKey);

    test(`${hotspot.id} (${title}) — clicking the rail entry opens the popup`, async ({
      page,
    }) => {
      await page.goto("/it");
      await dismissAttractor(page);

      const railButton = page
        .locator("nav")
        .getByRole("button", { name: title, exact: false });
      await railButton.waitFor({ state: "visible", timeout: 10000 });
      await railButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 1500 });
      await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
        title,
      );
    });

    test(`${hotspot.id} — popup has a description and spec list`, async ({
      page,
    }) => {
      await page.goto("/it");
      await dismissAttractor(page);

      const railButton = page
        .locator("nav")
        .getByRole("button", { name: title, exact: false });
      await railButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Description paragraph + at least one spec entry (dt/dd pair).
      await expect(dialog.locator("p").first()).not.toBeEmpty();
      const specCount = await dialog.locator("dl dt").count();
      expect(specCount).toBeGreaterThanOrEqual(1);
    });

    test(`${hotspot.id} — close button (aria-label "Chiudi pannello") hides popup`, async ({
      page,
    }) => {
      await page.goto("/it");
      await dismissAttractor(page);

      const railButton = page
        .locator("nav")
        .getByRole("button", { name: title, exact: false });
      await railButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const closeBtn = dialog.getByRole("button", { name: "Chiudi pannello" });
      await closeBtn.click();
      await expect(dialog).toBeHidden({ timeout: 1500 });
    });
  }

  test("opening a second hotspot replaces the first popup", async ({ page }) => {
    await page.goto("/it");
    await dismissAttractor(page);

    const titleA = localTitle("hotspot.display");
    const titleB = localTitle("hotspot.gauge");

    const railA = page
      .locator("nav")
      .getByRole("button", { name: titleA, exact: false });
    const railB = page
      .locator("nav")
      .getByRole("button", { name: titleB, exact: false });

    await railA.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { level: 2 })).toContainText(titleA);

    await railB.click();
    await expect(dialog.getByRole("heading", { level: 2 })).toContainText(titleB);
  });

  test("Escape closes the popup", async ({ page }) => {
    await page.goto("/it");
    await dismissAttractor(page);

    const title = localTitle("hotspot.display");
    await page
      .locator("nav")
      .getByRole("button", { name: title, exact: false })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 1500 });
  });
});
