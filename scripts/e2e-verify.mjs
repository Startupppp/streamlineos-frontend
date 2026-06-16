import { chromium } from "playwright";
const BASE = "http://localhost:1000";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const PAGES = process.argv.slice(2);
if (!PAGES.length) { console.log("usage: node e2e-verify.mjs <route> [route...]"); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: UA });

// API login -> inject cookies
const jar = new Map();
const absorb = (res) => { for (const c of (res.headers.getSetCookie?.() ?? [])) { const [p] = c.split(";"); const i = p.indexOf("="); const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (v && v !== "deleted") jar.set(k, v); else jar.delete(k); } };
const ch = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
const csrf = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual", headers: { "user-agent": UA } }); absorb(csrf);
const { csrfToken } = await csrf.json();
const cb = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: ch(), "user-agent": UA }, body: new URLSearchParams({ csrfToken, email: "demo@streamlineos.in", password: "Demo@2026!", callbackUrl: `${BASE}/post-signin`, json: "true" }).toString() }); absorb(cb);
await ctx.addCookies([...jar.entries()].map(([name, value]) => ({ name, value, domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax" })));

for (const route of PAGES) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  let status = 0;
  try { const r = await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle", timeout: 45000 }); status = r ? r.status() : 0; } catch (e) { status = -1; }
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    hasError: /something went wrong|validation failed|too big|expected number/i.test(document.body.innerText.slice(0, 600)),
    bodySnippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 220),
  }));
  const file = `e2e-artifacts/_verify_${route.replace(/[\/\[\]]/g, "_")}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${info.hasError ? "FAIL" : "OK  "} /${route} status=${status} err=${info.hasError} :: ${info.bodySnippet}`);
  await page.close();
}
await browser.close();
