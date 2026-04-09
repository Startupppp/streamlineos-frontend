import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.join(
  __dirname,
  "tests",
  "e2e",
  "fixtures",
  ".auth",
  "user.json",
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Bypass bot-detection middleware that blocks HeadlessChrome UA on /api/auth
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
  projects: [
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/loading-screenshots\.spec\.ts/, /fixtures\/auth\.setup\.ts/],
    },
    {
      name: "loading-screenshots",
      testMatch: /loading-screenshots\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: STORAGE_STATE,
      },
    },
  ],
  // No webServer block — tests run against an already-running app instance.
  // Start the app with `pnpm dev` before running `pnpm test:e2e`.
});
