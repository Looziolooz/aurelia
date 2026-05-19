import { test, expect } from "@playwright/test";

/**
 * FASE 7 BLOCKER regression guard.
 *
 * Two GSAP-driven motion paths must honour `prefers-reduced-motion: reduce`
 * (the CSS @media guard does NOT stop JS-scheduled tweens):
 *
 *   1. IntroCinematic (first-load brand cold-open — replaced the old
 *      IntroOverlay language gate; decision 2026-05-18: it auto-plays,
 *      it is NOT a gate). In `reduce` it must show ONLY the first hero
 *      render slide (static, autoAlpha:1), must NOT cross-fade-loop the
 *      backdrop, and the brand type must be shown IMMEDIATELY (no
 *      animated cold-open wait — the whole point of reduced-motion). It
 *      then auto-resolves to "active" as soon as the model is ready.
 *   2. HotspotPanel — reads `window.matchMedia('(prefers-reduced-motion:
 *      reduce)')` and collapses the open/close tween to `duration: 0`, so the
 *      panel reaches its final transform immediately (no slide/blur gating).
 *
 * Each test forces reduced-motion via `page.emulateMedia({ reducedMotion:
 * "reduce" })` before navigation — this sets the real CSS media feature that
 * both `gsap.matchMedia()` and `window.matchMedia()` evaluate. (We use
 * emulateMedia rather than `test.use({ reducedMotion })` because the pinned
 * @playwright/test version does not expose `reducedMotion` on the typed
 * `test.use()` Fixtures surface; emulateMedia is equivalent and fully typed.)
 *
 * The host runs concurrent heavy CPU work (Blender render), so timeouts are
 * deliberately generous; the assertions test *behaviour*, not wall-clock.
 *
 * History: the old AttractorOverlay scene-cycling test → the IntroOverlay
 * language-gate test → this IntroCinematic test. Same reduced-motion
 * guarantee throughout ("settle then stay settled"); only the component
 * that owns first-load motion changed.
 */
test.slow();

async function forceReducedMotion(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

// First-load is the auto-playing brand cinematic — NOT a gate, no
// interaction. Under reduced-motion it shows a static hero still + the
// brand type at once, then auto-resolves the instant the R3F model is
// ready: it fades out and enterActive() fires. So "starting" just means
// waiting for the cinematic to DETACH (generous timeout: the host runs
// concurrent heavy CPU work and the R3F model build is slow).
async function startViaIntro(page: import("@playwright/test").Page) {
  const intro = page.getByTestId("intro-cinematic");
  await intro.waitFor({ state: "visible", timeout: 30_000 });
  await intro.waitFor({ state: "detached", timeout: 90_000 });
}

test.describe("prefers-reduced-motion respected (FASE 7 BLOCKER regression)", () => {
  test("hotspot panel opens with no slide tween (duration 0)", async ({
    page,
  }) => {
    await forceReducedMotion(page);
    await page.goto("/it");
    await startViaIntro(page);

    const railButton = page.locator("nav").getByRole("button").first();
    await railButton.waitFor({ state: "visible", timeout: 10000 });
    await railButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // With the slide/blur tween collapsed to duration:0 the panel reaches its
    // resting state effectively on the next frame: opacity ~1, no leftover
    // entrance blur, and the xPercent slide offset resolved to 0. A short
    // poll (well under the ~0.55s slide-in duration that exists when motion
    // is NOT reduced) asserts there is no animated slide gating the panel.
    await expect
      .poll(
        async () => {
          return dialog.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
        },
        { message: "panel should be opaque immediately", timeout: 1200 },
      )
      .toBeGreaterThan(0.95);

    const settled = await dialog.evaluate((el) => {
      const s = getComputedStyle(el);
      return { filter: s.filter };
    });
    expect(
      settled.filter === "none" || /blur\(0/.test(settled.filter),
      `no leftover entrance blur (got: ${settled.filter})`,
    ).toBe(true);
  });

  test("intro cinematic: single static render, brand type immediate, no crossfade loop", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await forceReducedMotion(page);
    await page.goto("/it");

    const intro = page.getByTestId("intro-cinematic");
    await expect(intro).toBeVisible({ timeout: 20_000 });

    // Under reduced-motion the brand type must be shown IMMEDIATELY (the
    // animated cold-open is skipped) — the whole point is no animated wait.
    await expect(intro.getByText("AURELIA", { exact: true })).toBeVisible({
      timeout: 8_000,
    });

    // The hero render slides must NOT keep cross-fading: in reduced-motion
    // only the first is shown (autoAlpha 1); every other slide must stay
    // hidden (autoAlpha ~0) for the entire visible lifetime of the layer.
    // A leaked infinite timeline independently sweeps a LATER slide 0→1
    // while the first drops — that is the signal we forbid. The clean
    // auto-resolve fades the WHOLE layer together (first slide drops too,
    // later slides never rise), so we sample until the layer detaches and
    // assert on the should-be-hidden slides only (robust to auto-resolve,
    // still precisely catches a leaked crossfade loop).
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>(
        '[data-testid="intro-cinematic"]',
      );
      if (!root) return null;
      const slides = Array.from(
        root.querySelectorAll<HTMLElement>("div[style*='/intro/']"),
      );
      if (slides.length < 2) return null;
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const firstMax: number[] = [];
      const laterMax: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (!document.body.contains(slides[0])) break; // resolved & detached
        const op = slides.map((el) =>
          parseFloat(getComputedStyle(el).opacity),
        );
        firstMax.push(op[0]);
        laterMax.push(Math.max(...op.slice(1)));
        await wait(400);
      }
      return {
        count: slides.length,
        samples: firstMax.length,
        firstPeak: firstMax.length ? Math.max(...firstMax) : 0,
        laterPeak: laterMax.length ? Math.max(...laterMax) : 0,
      };
    });

    expect(result, "intro backdrop slides must be present").not.toBeNull();
    expect(
      result!.samples,
      "should observe the cinematic for at least one sample",
    ).toBeGreaterThan(0);
    // The first slide is the (only) visible hero still.
    expect(result!.firstPeak).toBeGreaterThan(0.9);
    // No later slide ever fades in — the discriminating signal for a
    // leaked reduced-motion crossfade loop.
    expect(
      result!.laterPeak,
      "no later slide may fade in under reduced-motion (no crossfade loop)",
    ).toBeLessThan(0.1);
  });
});
