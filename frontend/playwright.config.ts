import { defineConfig, devices } from "@playwright/test";

/**
 * The app's own dev port. `pnpm dev` is `next dev -p 1000`, and a base URL that
 * disagreed with it would send every test to a port nothing serves.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:1000";

export default defineConfig({
  testDir: "./e2e",

  /**
   * Jest owns `*.test.tsx` here and takes the repo's default `testMatch`, so
   * these are `*.spec.ts` and jest is told to ignore `e2e/`. Without both halves
   * the two runners fight over the same files: jest tries to run a Playwright
   * spec in jsdom and fails on `test.describe`.
   */
  testMatch: "**/*.spec.ts",

  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,

  /**
   * One worker locally on purpose. Each worker is a browser, and a machine also
   * running two dev servers, a Postgres and a jest suite does not have four to
   * spare.
   */
  workers: process.env.CI ? 2 : 1,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    /**
     * Only Chromium is installed. Adding a project here without also running
     * `pnpm exec playwright install firefox` (or webkit) fails at launch rather
     * than skipping, so the two go together.
     */
  ],

  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",

    /**
     * Reuses a dev server that is already up, which is usually what you want
     * locally and is never what you want in CI.
     *
     * Worth knowing when a local run fails in a way the code does not explain:
     * the reused server may be one another session started, on another branch,
     * serving code that is not the code under test. `E2E_BASE_URL` to point
     * somewhere deliberate, or stop the other server, rather than debugging a
     * result that was never about your change.
     */
    reuseExistingServer: !process.env.CI,
  },
});
