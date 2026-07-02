/**
 * screenshot-pages.mjs
 * Visual QA screenshot harness for StreamlineOS.
 *
 * Usage:
 *   node scripts/screenshot-pages.mjs [--routes /r1,/r2] [--viewports 375,768,1280] [--out <dir>]
 *
 * Defaults:
 *   --routes    /dashboard
 *   --viewports 375,768,1280  (heights: 375→812, 768→1024, 1280→800, others→800)
 *   --out       scripts/.screenshots
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
function getArg(name, defaultVal) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1] !== undefined) {
    return process.argv[idx + 1];
  }
  return defaultVal;
}

const routesArg = getArg("routes", "/dashboard");
const viewportsArg = getArg("viewports", "375,768,1280");
const outDir = path.resolve(
  getArg("out", path.join(__dirname, ".screenshots"))
);

const routes = routesArg.split(",").map((r) => r.trim());

const DEFAULT_HEIGHTS = { 375: 812, 768: 1024, 1280: 800 };
const viewports = viewportsArg.split(",").map((w) => {
  const width = parseInt(w.trim(), 10);
  const height = DEFAULT_HEIGHTS[width] ?? 800;
  return { width, height };
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost:1000";
const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");
const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const EMAIL = process.env.SCREENSHOT_EMAIL ?? "demo@streamlineos.in";
const PASSWORD = process.env.SCREENSHOT_PASSWORD ?? "Demo@2026!";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Perform full UI login at /signin and persist storageState to AUTH_STATE_PATH.
 * Returns the parsed storage-state object.
 */
async function loginViaUI(browser) {
  console.log("Logging in via UI …");
  const ctx = await browser.newContext({
    userAgent: REAL_UA,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  try {
    await page.goto(`${BASE_URL}/signin`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    // Wait for React hydration — the email input must be enabled before filling
    await page.waitForSelector("#email:not([disabled])", { timeout: 15_000 });

    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);

    // Submit and wait for redirect away from /signin
    await Promise.all([
      page.waitForURL((url) => !url.href.includes("/signin"), {
        timeout: 30_000,
      }),
      page.click('button[type="submit"]'),
    ]);

    // Let the post-login page fully settle
    await page.waitForLoadState("networkidle");

    const state = await ctx.storageState();

    const authDir = path.dirname(AUTH_STATE_PATH);
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
    console.log("Login successful — auth state saved to", AUTH_STATE_PATH);

    return state;
  } finally {
    await ctx.close();
  }
}

/**
 * Probe /dashboard with existing storageState.
 * Returns true if the app does NOT redirect to /signin (i.e. still authenticated).
 */
async function isAuthValid(browser, storageState) {
  const ctx = await browser.newContext({
    userAgent: REAL_UA,
    storageState,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    return !page.url().includes("/signin");
  } catch {
    return false;
  } finally {
    await ctx.close();
  }
}

/**
 * Load or refresh auth state.
 * Returns a storageState object ready for use in newContext().
 */
async function getStorageState(browser) {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    try {
      const raw = fs.readFileSync(AUTH_STATE_PATH, "utf8");
      const saved = JSON.parse(raw);
      console.log("Found saved auth state — probing …");
      const valid = await isAuthValid(browser, saved);
      if (valid) {
        console.log("Saved auth state is valid — reusing.");
        return saved;
      }
      console.log("Saved auth state expired — re-logging in …");
    } catch (err) {
      console.warn("Could not read saved auth state:", err.message);
    }
  }
  return loginViaUI(browser);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a route like /projects/[id] to a safe filename slug. */
function routeToSlug(route) {
  return (
    route
      .replace(/^\/+/, "")
      .replace(/\//g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "-") || "home"
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Routes  :", routes.join(", "));
  console.log(
    "Viewports:",
    viewports.map((v) => `${v.width}×${v.height}`).join(", ")
  );
  console.log("Output  :", outDir);
  console.log();

  const browser = await chromium.launch({ headless: true });

  let storageState;
  try {
    storageState = await getStorageState(browser);
  } catch (err) {
    console.error("Fatal: could not authenticate:", err.message);
    await browser.close();
    process.exit(1);
  }

  let successCount = 0;
  const failures = [];

  for (const route of routes) {
    for (const vp of viewports) {
      const slug = routeToSlug(route);
      const filename = `${slug}_${vp.width}.png`;
      const outPath = path.join(outDir, filename);

      const ctx = await browser.newContext({
        userAgent: REAL_UA,
        storageState,
        viewport: vp,
      });
      const page = await ctx.newPage();

      try {
        await page.goto(`${BASE_URL}${route}`, {
          waitUntil: "networkidle",
          timeout: 90_000,
        });

        // Extra settle time for animations / deferred data
        await page.waitForTimeout(600);

        await page.screenshot({ path: outPath, fullPage: true });

        const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
        console.log(`  ✓  ${filename}  (${sizeKB} KB)`);
        successCount++;
      } catch (err) {
        const msg = `${route} @ ${vp.width}px — ${err.message}`;
        console.error(`  ✗  ${msg}`);
        failures.push(msg);
      } finally {
        await ctx.close();
      }
    }
  }

  await browser.close();

  console.log();
  console.log(
    `Done — ${successCount} screenshot(s) saved${failures.length ? `, ${failures.length} failed` : ""}.`
  );

  if (successCount === 0) {
    console.error("No screenshots succeeded.");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
