import { test, expect } from "@playwright/test";

/**
 * FASE 7 BLOCKER regression guard.
 *
 * Two GSAP-driven motion paths must honour `prefers-reduced-motion: reduce`
 * (the CSS @media guard does NOT stop JS-scheduled tweens):
 *
 *   1. AttractorOverlay — uses `gsap.matchMedia()`. In `reduce` it must show
 *      ONLY Scene A (static, autoAlpha:1) and must NOT cycle through Scene B
 *      / Scene C, and must NOT run the infinite "breathing" scale tween on
 *      the container. (The container's one-shot fade-IN entrance — a
 *      separate useGSAP, ~0.9s — is intentional and is allowed; only the
 *      *looping scene timeline* and *infinite breathing yoyo* are forbidden.)
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
 */
test.slow();

async function forceReducedMotion(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function dismissAttractor(page: import("@playwright/test").Page) {
  await page.mouse.click(20, 20);
  await page.waitForTimeout(400);
}

// Read the three scene layers (sceneA/B/C are the immediate element children
// of the attractor [role=button] container). gsap.set(autoAlpha:0) applies
// visibility:hidden + opacity:0; autoAlpha:1 → visible + opacity:1.
async function sceneState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[role="button"]');
    if (!root) return null;
    const scenes = Array.from(root.children)
      .filter((c): c is HTMLElement => c instanceof HTMLElement)
      .slice(0, 3);
    if (scenes.length < 3) return null;
    return scenes.map((el) => {
      const s = getComputedStyle(el);
      return {
        opacity: parseFloat(s.opacity),
        visible: s.visibility !== "hidden",
      };
    });
  });
}

test.describe("prefers-reduced-motion respected (FASE 7 BLOCKER regression)", () => {
  test("attractor shows only static Scene A — no scene cycling, no breathing tween", async ({
    page,
  }) => {
    // The host is under heavy concurrent CPU load (Blender render); R3F init
    // + GSAP settle is slow. Give this behavioural test plenty of headroom
    // (test.slow() also applies from the describe-level call above).
    test.setTimeout(180_000);

    await forceReducedMotion(page);
    await page.goto("/it");

    const attractor = page.getByRole("button", {
      name: /esplorare|invite|tocca/i,
    });
    await expect(attractor).toBeVisible({ timeout: 15_000 });

    // Let the one-shot container entrance tween (0.3s delay + 0.6s) finish so
    // we measure the resting state, not the intentional fade-in.
    await expect
      .poll(
        async () => {
          const st = await sceneState(page);
          return st ? st[0].opacity : 0;
        },
        {
          message: "Scene A should settle visible under reduced-motion",
          timeout: 15_000,
        },
      )
      .toBeGreaterThan(0.9);

    const settled = await sceneState(page);
    expect(settled, "attractor must render three scene layers").not.toBeNull();

    // Scene A visible; Scene B & C must be hidden (autoAlpha:0) — the
    // reduced-motion branch returns before building the looping timeline.
    expect(settled![0].visible).toBeTruthy();
    expect(settled![1].opacity).toBeLessThan(0.1);
    expect(settled![1].visible).toBeFalsy();
    expect(settled![2].opacity).toBeLessThan(0.1);
    expect(settled![2].visible).toBeFalsy();

    // Core regression signal — "settle, then stay settled":
    //
    // The FORBIDDEN motion is the breathing yoyo `scale 0.99 → 1.01`,
    // duration 2s, repeat:-1: it oscillates bi-directionally FOREVER and can
    // never converge. The ALLOWED motion is the one-shot entrance tween
    // (`scale → 1`, 0.6s, power3.out) which converges to a steady value
    // (under extreme CPU starvation GSAP may briefly overshoot/settle, but it
    // still converges and stops).
    //
    // So instead of a brittle absolute-variance bound (which a CPU-starved
    // one-shot settle tail can trip), we (1) wait for the scale to STABILISE
    // — consecutive samples within a small epsilon — then (2) assert it stays
    // stable across a window LONGER than one full breathing period (2s up +
    // 2s down = 4s). A leaked infinite yoyo provably cannot pass step 1; even
    // if it momentarily looked flat, step 2's 4.5s window spans a full sweep
    // and would catch the ~0.02 excursion.
    //
    // Everything runs inside ONE page.evaluate (no per-sample Playwright
    // round-trip, no locator re-resolution under heavy CPU load).
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>('[role="button"]');
      if (!root) return null;
      const sceneOpacity = (i: number) => {
        const el = Array.from(root.children).filter(
          (c): c is HTMLElement => c instanceof HTMLElement,
        )[i];
        return el ? parseFloat(getComputedStyle(el).opacity) : 1;
      };
      const xScale = () =>
        new DOMMatrixReadOnly(getComputedStyle(root).transform).a;
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // (1) Wait for stabilisation: scale change between consecutive 400ms
      // samples < 0.0015 twice in a row, or give up after ~24s.
      let prev = xScale();
      let stableHits = 0;
      let stabilised = false;
      for (let i = 0; i < 60; i++) {
        await wait(400);
        const cur = xScale();
        if (Math.abs(cur - prev) < 0.0015) {
          if (++stableHits >= 2) {
            stabilised = true;
            break;
          }
        } else {
          stableHits = 0;
        }
        prev = cur;
      }

      // (2) Now sample a 4.5s window (> one full 4s breathing period). A
      // settled container barely moves; a leaked infinite yoyo sweeps ~0.02.
      const scales: number[] = [];
      let maxSceneB = 0;
      let maxSceneC = 0;
      for (let i = 0; i < 10; i++) {
        scales.push(xScale());
        maxSceneB = Math.max(maxSceneB, sceneOpacity(1));
        maxSceneC = Math.max(maxSceneC, sceneOpacity(2));
        await wait(450);
      }
      return {
        stabilised,
        spread: Math.max(...scales) - Math.min(...scales),
        scales,
        maxSceneB,
        maxSceneC,
        finalSceneA: sceneOpacity(0),
      };
    });

    expect(result, "attractor root must be present for sampling").not.toBeNull();
    expect(
      result!.maxSceneB,
      "Scene B must never fade in under reduced-motion",
    ).toBeLessThan(0.1);
    expect(
      result!.maxSceneC,
      "Scene C must never fade in under reduced-motion",
    ).toBeLessThan(0.1);
    expect(result!.finalSceneA).toBeGreaterThan(0.9);

    // The container scale must have converged at all (an infinite yoyo never
    // does) ...
    expect(
      result!.stabilised,
      `container scale never stabilised — likely the infinite breathing tween leaked through reduced-motion (samples: ${result!.scales
        .map((s) => s.toFixed(4))
        .join(", ")})`,
    ).toBe(true);

    // ... and must stay essentially flat across a full breathing period.
    // 0.006 tolerates CPU-starved sub-pixel jitter; the forbidden yoyo
    // amplitude is ~0.02, comfortably above it.
    expect(
      result!.spread,
      `container scale must not oscillate over a full breathing period (samples: ${result!.scales
        .map((s) => s.toFixed(4))
        .join(", ")})`,
    ).toBeLessThan(0.006);
  });

  test("hotspot panel opens with no slide tween (duration 0)", async ({
    page,
  }) => {
    await forceReducedMotion(page);
    await page.goto("/it");
    await dismissAttractor(page);

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
});
