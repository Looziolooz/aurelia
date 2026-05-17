import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPad Pro 12.9 portrait",
      use: { ...devices["iPad Pro 12.9"] },
    },
    {
      name: "iPad Pro 12.9 landscape",
      use: { ...devices["iPad Pro 12.9 landscape"] },
    },
    {
      name: "Desktop Chrome 1920",
      use: {
        viewport: { width: 1920, height: 1080 },
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      // Brief §6 #11 "Edge kiosk". The iPad Pro projects above already use
      // WebKit (Playwright's iPad device defaults to webkit = Safari iPad
      // coverage); this adds the Edge engine for the Windows kiosk target.
      // Requires the msedge channel on the runner (CI/local), not this
      // sandbox.
      name: "Edge kiosk 1920",
      use: {
        channel: "msedge",
        viewport: { width: 1920, height: 1080 },
        isMobile: false,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});