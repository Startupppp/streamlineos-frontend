import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:1000";
const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");
const OUT_DIR = path.join(__dirname, ".verify-dropdown");
const REAL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const EMAIL = "demo@streamlineos.in";
const PASSWORD = "Demo@2026!";

async function getAuth(browser) {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, "utf8"));
    const ctx = await browser.newContext({ userAgent: REAL_UA, storageState: saved, viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 30_000 });
    const valid = !page.url().includes("/signin");
    await ctx.close();
    if (valid) return saved;
  }
  const ctx = await browser.newContext({ userAgent: REAL_UA, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector("#email:not([disabled])", { timeout: 15_000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.href.includes("/signin"), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");
  const state = await ctx.storageState();
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2));
  await ctx.close();
  return state;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const storageState = await getAuth(browser);

  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({
      userAgent: REAL_UA,
      storageState,
      viewport: { width: 1280, height: 800 },
      colorScheme: scheme,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(800);

    const trigger = page.locator('[aria-label="Switch product"]').first();
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(400);
    }

    const out = path.join(OUT_DIR, `dropdown-${scheme}.png`);
    await page.screenshot({ path: out });
    console.log(`Saved: ${out}`);
    await ctx.close();
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
