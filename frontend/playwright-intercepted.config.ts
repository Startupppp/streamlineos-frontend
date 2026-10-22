import { defineConfig, devices } from "@playwright/test";


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
  timeout: 180_000,
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
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.CALENDAR_BROWSER_EXECUTABLE
          ? { executablePath: process.env.CALENDAR_BROWSER_EXECUTABLE }
          : undefined,
      },
    },
  ],

  webServer: {
    command: `node ./node_modules/next/dist/bin/next dev -p ${PORT} --webpack`,
    url: BASE_URL,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: ENV,
    reuseExistingServer: !process.env.CI,
  },
});
