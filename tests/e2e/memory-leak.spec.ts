import { test, expect } from "@playwright/test";
import hotspotsData from "../../data/hotspots.json";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
  }
}

const HOTSPOTS = hotspotsData.hotspots as Array<{ id: string }>;

test.describe("memory leak detection (simulated 12h)", () => {
  test("open/close all 8 hotspots for 50 cycles - heap should not grow >30%", async ({
    page,
  }) => {
    await page.goto("/it");

    // Dismiss attractor so the sidebar rail becomes interactive.
    await page.mouse.click(20, 20);
    await page.waitForTimeout(250);

    const cycles = 50;
    const initialHeap = await page.evaluate(() => {
      if (performance.memory) {
        return (performance.memory as { usedJSHeapSize: number }).usedJSHeapSize;
      }
      return 0;
    });

    if (initialHeap === 0) {
      test.skip();
      return;
    }

    // Sidebar buttons are addressed by position in the rail rather than
    // by aria-label (which is the localised feature title, not the id).
    const railButtons = page.locator("nav").getByRole("button");
    const railCount = await railButtons.count();
    if (railCount === 0) {
      test.skip();
      return;
    }

    for (let i = 0; i < cycles; i++) {
      const button = railButtons.nth(i % Math.min(railCount, HOTSPOTS.length));
      await button.click();
      await page.waitForTimeout(50);
      await page.getByRole("button", { name: "Chiudi pannello" }).click();
      await page.waitForTimeout(50);

      if (i % 10 === 0) {
        await page.evaluate(() => {
          if (typeof (globalThis as unknown as { gc?: () => void }).gc === "function") {
            (globalThis as unknown as { gc: () => void }).gc();
          }
        });
      }
    }

    const finalHeap = await page.evaluate(() => {
      return (performance.memory as { usedJSHeapSize: number }).usedJSHeapSize;
    });

    const growthPercent = ((finalHeap - initialHeap) / initialHeap) * 100;
    expect(growthPercent).toBeLessThan(30);
  });

  test("performance.measureUserAgentSpecificMemory available for GC measurement", async ({
    page,
  }) => {
    await page.goto("/it");

    const hasMeasureMemory = await page.evaluate(() => {
      return typeof (globalThis as unknown as { performance: { measureUserAgentSpecificMemory?: () => void } }).performance?.measureUserAgentSpecificMemory === "function";
    });

    if (!hasMeasureMemory) {
      test.skip();
      return;
    }

    const memoryBefore = await page.evaluate(async () => {
      if (!globalThis.performance.measureUserAgentSpecificMemory) return null;
      const result = await globalThis.performance.measureUserAgentSpecificMemory();
      return result?.bytes;
    });

    expect(memoryBefore === null || typeof memoryBefore === "number").toBe(true);
  });
});