import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);

const DEV_BUNDLER_FLAG =
  process.env.E2E_DEV_BUNDLER === "webpack" ? " --webpack" : "";

const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const E2E_ENV: Record<string, string> = {
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET ??
    "e2e-only-not-a-real-secret-0000000000000000000",
  NEXTAUTH_URL: BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500",

  NEXT_DIST_DIR: ".next-e2e",
};

for (const key of ["BACKEND_JWT_SECRET", "INTERNAL_API_SECRET"] as const) {
  const value = process.env[key];
  if (value) E2E_ENV[key] = value;
}

process.env.NEXTAUTH_SECRET = E2E_ENV.NEXTAUTH_SECRET;

export default defineConfig({
  testDir: "./e2e",

  testMatch: "**/*.spec.ts",

  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  timeout: 90_000,

  expect: { timeout: 10_000 },

  workers: 1,

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
  ],

  webServer: {
    command: `pnpm exec next dev -p ${PORT}${DEV_BUNDLER_FLAG}`,
    url: BASE_URL,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: E2E_ENV,

    reuseExistingServer: false,
  },
});
