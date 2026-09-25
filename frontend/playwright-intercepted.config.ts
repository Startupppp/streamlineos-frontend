import { defineConfig, devices } from "@playwright/test";

/**
 * Separate Playwright project for network-intercepted browser state proofs.
 *
 * ISOLATION GUARANTEE — how this config ensures no request reaches production:
 *
 * 1. Server-side backend calls (from the Next.js process):
 *    API_INTERNAL_URL is set to http://localhost:9999, a port with no listener.
 *    Every server-side call to the backend (fetchSessionData, exchangeSessionForBackendJwt)
 *    receives ECONNREFUSED immediately. The try/catch wrappers in auth-session.ts handle
 *    this and fall back to JWT token claims. Zero production reads.
 *
 * 2. Browser-side API calls:
 *    All tests register page.route('http://localhost:1500/**') to intercept every
 *    browser-originated backend call. The route handlers return fixture responses.
 *    The real backend never receives a connection from the browser.
 *
 * 3. NextAuth session endpoint:
 *    Tests intercept the browser-level fetch to /api/auth/session and return a
 *    synthetic session including a fake backendJwt. The Next.js server handler
 *    for /api/auth/session never runs for these requests.
 *
 * This config intentionally uses a different port (3201), dist dir (.next-intercepted),
 * and test directory (./e2e-intercepted) from the production-hitting e2e suite, so
 * the two suites can never accidentally run each other's specs.
 */

const PORT = Number(process.env.INTERCEPTED_E2E_PORT ?? 3201);
const BASE_URL = `http://localhost:${PORT}`;

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "intercepted-e2e-secret-000000000000000000000000000";

const ENV: Record<string, string> = {
  NEXTAUTH_SECRET,
  NEXTAUTH_URL: BASE_URL,
  NEXT_PUBLIC_API_URL: "http://localhost:1500",
  API_INTERNAL_URL: "http://localhost:9999",
  NEXT_DIST_DIR: ".next-intercepted",
};

process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;

export default defineConfig({
  testDir: "./e2e-intercepted",

  testMatch: "**/*.spec.ts",

  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: ENV,
    reuseExistingServer: !process.env.CI,
  },
});
