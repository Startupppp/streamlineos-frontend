import { defineConfig, devices } from "@playwright/test";

/**
 * Port 3000, not the app's own 1000, and that is the whole point.
 *
 * Two things pin it here. Other sessions on this machine run `pnpm dev` out of
 * other worktrees, and one of them already holds 1000 — a suite that reused it
 * would report on a branch that is not this one. And the backend's
 * `CORS_ORIGINS` is `http://localhost:1000,http://localhost:3000`, so 3000 is
 * the only other origin the API will answer a browser call from. Any other port
 * needs a backend env change, which is not ours to make.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);

/**
 * `localhost`, never `127.0.0.1`. They are different origins to both CORS and
 * the cookie jar: the backend allowlist spells `localhost`, and a session cookie
 * set on one host is simply absent on the other, which reads as "auth is
 * broken" rather than as a hostname mismatch. One spelling, everywhere,
 * including NEXTAUTH_URL below.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Dev-only fixture values, deliberately committed and deliberately worthless.
 *
 * The suite needs the secret to be a KNOWN constant, not merely present: the
 * session fixture mints a NextAuth JWE with it and the server has to decrypt
 * that same cookie. A random per-run secret would work only if both halves read
 * it, and a developer's real `.env` value must never be what a test depends on.
 *
 * 44+ characters because `lib/env.ts` requires that of NEXTAUTH_SECRET, and
 * NODE_ENV is `development` under `next dev` so the check is advisory — but the
 * same config has to survive a production-mode run, where it throws.
 *
 * A real deployment overrides every one of these from the environment.
 */
const E2E_ENV: Record<string, string> = {
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET ??
    "e2e-only-not-a-real-secret-0000000000000000000",
  NEXTAUTH_URL: BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500",

  /**
   * `next dev` writes a lock into `<distDir>/dev` and refuses to start when one
   * is there — correct, because two servers sharing one `.next` corrupt each
   * other's output. This checkout may already have a dev server on `.next`, so
   * the suite gets its own build directory and the two never meet.
   */
  NEXT_DIST_DIR: ".next-e2e",
};

/**
 * The two secrets that are NOT fixtures and are deliberately absent here.
 *
 * `BACKEND_JWT_SECRET` must byte-match the backend's, because the session
 * callback signs the token the API authenticates with; `INTERNAL_API_SECRET`
 * authenticates the frontend's server-to-server session-data lookup. Both are
 * real deployment secrets, so a committed default would be either a leak or a
 * lie, and inventing one produces a session the API rejects — which surfaces as
 * an empty page rather than as an auth error.
 *
 * Passed through only when the environment supplies them. The authenticated
 * specs check `hasBackendSecrets()` and skip with a message naming what is
 * missing, so an incomplete environment reports a skip rather than a failure
 * that looks like a product bug.
 */
for (const key of ["BACKEND_JWT_SECRET", "INTERNAL_API_SECRET"] as const) {
  const value = process.env[key];
  if (value) E2E_ENV[key] = value;
}

/**
 * The session fixture runs in the TEST process, not in the server's, so it does
 * not inherit `webServer.env` — and a fixture that minted a cookie under a
 * different secret than the server decrypts with produces a browser that is
 * simply signed out, with nothing anywhere saying why.
 *
 * Publishing the resolved value back onto this process makes the two halves one
 * source rather than two that have to be kept in agreement by hand.
 */
process.env.NEXTAUTH_SECRET = E2E_ENV.NEXTAUTH_SECRET;

export default defineConfig({
  testDir: "./e2e",

  /**
   * Jest owns `*.test.tsx` here and takes this repo's default `testMatch`, which
   * matches `*.spec.ts` ANYWHERE. So these are `*.spec.ts` and jest is told to
   * ignore `e2e/` — the two halves are one decision written in two files. Drop
   * either and jest loads a Playwright spec into jsdom and dies on
   * `test.describe`.
   */
  testMatch: "**/*.spec.ts",

  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,

  /**
   * One worker. Each worker is a browser, and this machine is also running
   * several dev servers, a Postgres and other agents' suites. It is also the
   * honest setting for specs that mutate shared stock: two workers receiving
   * against the same bin race each other's assertions.
   */
  workers: 1,

  reporter: [["list"], ["html", { open: "never" }]],

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
     * Only Chromium is installed. Adding a firefox or webkit project without
     * also running `pnpm exec playwright install <browser>` fails at launch
     * rather than skipping, so the two go together.
     */
  ],

  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: E2E_ENV,

    /**
     * Never reuse. The default here is the trap this config exists to close: a
     * server already on the port may be one another session started, out of
     * another worktree, on another branch, serving code that is not under test —
     * and the suite would pass or fail on it without ever saying so. Starting
     * our own on a port we chose makes that impossible by construction.
     */
    reuseExistingServer: false,
  },
});
