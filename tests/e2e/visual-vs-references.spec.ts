import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Visual capture suite.
 *
 * The pre-R3F implementation steered the viewer by writing `cameraOrbit` on
 * a `<model-viewer>` element. R3F has no analogous DOM-level escape hatch:
 * the camera lives inside the Three.js scene graph. For deterministic
 * angle-by-angle capture you'd need to either:
 *   (a) expose a `window.__aureliaCamera = { setOrbit(az, pol, r) }` from
 *       inside ProductViewer.tsx (one hook + ref forwarding), or
 *   (b) drive the hotspot rail (each entry already animates the camera to
 *       a known target via the fly-to in CameraRig), and screenshot at
 *       each landing.
 *
 * Option (b) is the most useful for "compare against reference photos"
 * because the fly-to coordinates in data/hotspots.json are themselves the
 * curated angles. This file captures one wide-angle baseline; per-feature
 * shots should be added once the hotspot positions are visually validated
 * against the new model.
 */

const OUT_DIR = "tests/screenshots/v3";

async function dismissAttractor(page: import("@playwright/test").Page) {
  await page.mouse.click(20, 20);
  await page.waitForTimeout(400);
}

test.describe("v3 visual capture (R3F)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("baseline three-quarter render after model load", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/it");

    // Wait for the Canvas to mount and the GLB to finish — the loading
    // indicator carries aria-live="polite" and disappears once the model
    // signals onReady.
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: 60_000 });
    await dismissAttractor(page);
    await page.waitForTimeout(3500); // let auto-rotate + entrance animation settle

    await page.addStyleTag({
      content: `header, footer, nav, [role="dialog"], .z-chrome { display: none !important; }`,
    });
    await page.waitForTimeout(200);

    await page.screenshot({
      path: join(OUT_DIR, "baseline-three-quarter.png"),
      fullPage: false,
    });
  });
});
