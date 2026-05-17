import { test, expect } from "@playwright/test";

/**
 * FASE 7 BLOCKER regression guard.
 *
 * Two GSAP-driven motion paths must honour `prefers-reduced-motion: reduce`
 * (the CSS @media guard does NOT stop JS-scheduled tweens):
 *
 *   1. IntroOverlay (first-load onboarding — replaced the old
 *      AttractorOverlay). In `reduce` it must show ONLY the first render
 *      slide (static, autoAlpha:1), must NOT cross-fade-loop the backdrop,
 *      and the language card must appear IMMEDIATELY (the 5 s delay is
 *      bypassed — the whole point of reduced-motion is no animated wait).
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
 * History: the old AttractorOverlay scene-cycling / breathing test was
 * retired when IntroOverlay replaced that component (the render-backdrop
 * onboarding). The reduced-motion guarantee it protected now lives in the
 * IntroOverlay test below — same "settle then stay settled" method.
 */
test.slow();

async function forceReducedMotion(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

// First-load onboarding (IntroOverlay) gates entry: the visitor must pick
// a language to start. Under reduced-motion the language card is shown
// immediately (no 5 s wait). Picking holds the render backdrop until the
// model is ready, then fades (~0.5 s) and enterActive() fires — so we wait
// for the intro dialog to DETACH (generous timeout: the host runs
// concurrent heavy CPU work and the R3F model build is slow).
async function startViaIntro(page: import("@playwright/test").Page) {
  const introLang = page.getByRole("button", { name: "Italiano" });
  await introLang.waitFor({ state: "visible", timeout: 30_000 });
  await introLang.click();
  await page
    .getByRole("dialog", { name: /Choose your language/i })
    .waitFor({ state: "detached", timeout: 90_000 });
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

  test("intro overlay: static render + immediate card, no crossfade loop", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await forceReducedMotion(page);
    await page.goto("/it");

    const intro = page.getByRole("dialog", {
      name: /Choose your language/i,
    });
    await expect(intro).toBeVisible({ timeout: 20_000 });

    // Under reduced-motion the card must appear immediately (the 5 s
    // delay is bypassed) — the whole point is no animated wait.
    await expect(
      page.getByRole("button", { name: "Italiano" }),
    ).toBeVisible({ timeout: 8_000 });

    // The backdrop render slides must NOT keep cross-fading: in
    // reduced-motion only the first is shown (autoAlpha 1), the rest
    // stay hidden (autoAlpha 0), and it stays that way across a window
    // longer than one crossfade cycle. A leaked infinite timeline would
    // oscillate the opacities; this catches it ("settle then stay
    // settled").
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!root) return null;
      const slides = Array.from(
        root.querySelectorAll<HTMLElement>("div[style*='/intro/']"),
      );
      if (slides.length < 2) return null;
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const opacities: number[][] = [];
      for (let i = 0; i < 10; i++) {
        opacities.push(
          slides.map((el) => parseFloat(getComputedStyle(el).opacity)),
        );
        await wait(450);
      }
      const maxPer = slides.map((_, idx) =>
        Math.max(...opacities.map((row) => row[idx])),
      );
      const minPer = slides.map((_, idx) =>
        Math.min(...opacities.map((row) => row[idx])),
      );
      const spreadPer = maxPer.map((mx, idx) => mx - minPer[idx]);
      return { count: slides.length, maxPer, spreadPer };
    });

    expect(result, "intro backdrop slides must be present").not.toBeNull();
    // Exactly one slide visible (the first), all others hidden.
    expect(result!.maxPer[0]).toBeGreaterThan(0.9);
    for (let i = 1; i < result!.count; i++) {
      expect(
        result!.maxPer[i],
        `slide ${i} must never fade in under reduced-motion`,
      ).toBeLessThan(0.1);
    }
    // No oscillation on any slide over the sampled window (a leaked
    // crossfade loop sweeps 0→1; flat means no loop).
    for (let i = 0; i < result!.count; i++) {
      expect(
        result!.spreadPer[i],
        `slide ${i} opacity must not oscillate (no crossfade loop)`,
      ).toBeLessThan(0.06);
    }
  });
});
