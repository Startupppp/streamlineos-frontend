import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:1000";
const OUT_DIR = path.join(__dirname, ".screenshots-verify");
const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");
const REAL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const EMAIL = "demo@streamlineos.in";
const PASSWORD = "Demo@2026!";

async function loginViaUI(browser) {
  const ctx = await browser.newContext({ userAgent: REAL_UA, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
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
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
    console.log("Login ok");
    return state;
  } finally {
    await ctx.close();
  }
}

async function getStorageState(browser) {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, "utf8"));
      const ctx = await browser.newContext({ userAgent: REAL_UA, storageState: saved, viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 30_000 });
      const ok = !page.url().includes("/signin");
      await ctx.close();
      if (ok) { console.log("Reusing saved auth"); return saved; }
    } catch {}
  }
  return loginViaUI(browser);
}

async function discoverProjectId(browser, storageState) {
  const ctx = await browser.newContext({ userAgent: REAL_UA, storageState, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE_URL}/projects`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1500);
    const url = page.url();
    const match = url.match(/\/projects\/(\d+)/);
    if (match) { await ctx.close(); return parseInt(match[1]); }
    const links = await page.$$eval("a[href*='/projects/']", (els) =>
      els.map((el) => el.getAttribute("href")).filter(Boolean)
    );
    for (const href of links) {
      const m = href.match(/\/projects\/(\d+)/);
      if (m) { await ctx.close(); return parseInt(m[1]); }
    }
    await ctx.close();
    return null;
  } catch {
    await ctx.close();
    return null;
  }
}

async function screenshot(browser, storageState, route, viewport, outDir) {
  const slug = route.replace(/^\/+/, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-") || "home";
  const filename = `${slug}_${viewport.width}.png`;
  const outPath = path.join(outDir, filename);
  const ctx = await browser.newContext({ userAgent: REAL_UA, storageState, viewport });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: outPath, fullPage: true });
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  ok  ${filename}  (${kb} KB)`);
    return true;
  } catch (err) {
    console.error(`  FAIL  ${route} @${viewport.width}px — ${err.message}`);
    return false;
  } finally {
    await ctx.close();
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const storageState = await getStorageState(browser);

  const projectId = await discoverProjectId(browser, storageState);
  if (projectId) {
    console.log(`Using project ID: ${projectId}`);
  } else {
    console.log("No project found — screenshotting /projects only");
  }

  const SUB_ROUTES = projectId
    ? [
        `/projects/${projectId}`,
        `/projects/${projectId}/backlog`,
        `/projects/${projectId}/sprints`,
        `/projects/${projectId}/epics`,
        `/projects/${projectId}/cycles`,
        `/projects/${projectId}/milestones`,
        `/projects/${projectId}/modules`,
        `/projects/${projectId}/views`,
        `/projects/${projectId}/timeline`,
      ]
    : ["/projects"];

  const VIEWPORTS = [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ];

  let ok = 0, fail = 0;
  for (const route of SUB_ROUTES) {
    for (const vp of VIEWPORTS) {
      const passed = await screenshot(browser, storageState, route, vp, OUT_DIR);
      passed ? ok++ : fail++;
    }
  }

  await browser.close();
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

main().catch((err) => { console.error(err); process.exit(1); });
