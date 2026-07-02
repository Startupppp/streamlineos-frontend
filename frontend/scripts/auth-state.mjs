/**
 * auth-state.mjs
 * Generates and saves Playwright auth state by logging in via UI with
 * exponential backoff for rate-limit handling.
 *
 * Usage: node scripts/auth-state.mjs
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "http://localhost:1000";
const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");
const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const EMAIL = process.env.SCREENSHOT_EMAIL ?? "demo@streamlineos.in";
const PASSWORD = process.env.SCREENSHOT_PASSWORD ?? "Demo@2026!";
const MAX_RETRIES = 6;
const INITIAL_WAIT_MS = 90_000;
const RETRY_WAIT_MS = 65_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function attemptLogin(browser) {
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

    await page.waitForSelector("#email:not([disabled])", { timeout: 15_000 });
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);

    await Promise.all([
      page.waitForURL((url) => !url.href.includes("/signin"), {
        timeout: 30_000,
      }),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForLoadState("networkidle");

    const state = await ctx.storageState();
    const authDir = path.dirname(AUTH_STATE_PATH);
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
    console.log("Auth state saved to", AUTH_STATE_PATH);
    return true;
  } catch {
    return false;
  } finally {
    await ctx.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  console.log(`Waiting ${INITIAL_WAIT_MS / 1000}s for any rate limits to clear…`);
  await sleep(INITIAL_WAIT_MS);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Login attempt ${attempt}/${MAX_RETRIES}…`);
    const ok = await attemptLogin(browser);
    if (ok) {
      console.log("Success!");
      await browser.close();
      process.exit(0);
    }
    if (attempt < MAX_RETRIES) {
      console.log(`Failed. Waiting ${RETRY_WAIT_MS / 1000}s before retry…`);
      await sleep(RETRY_WAIT_MS);
    }
  }

  await browser.close();
  console.error("All login attempts failed.");
  process.exit(1);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
