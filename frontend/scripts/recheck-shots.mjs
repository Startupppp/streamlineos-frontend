import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:1000";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const OUT = "C:/Users/ADITYA~1/AppData/Local/Temp/recheck-shots";
mkdirSync(OUT, { recursive: true });

function parseSetCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    return { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
  });
}

async function login() {
  const jar = new Map();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { "user-agent": UA } });
  for (const c of parseSetCookies(csrfRes)) jar.set(c.name, c.value);
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({
    csrfToken, email: "demo@streamlineos.in", password: "Demo@2026!",
    callbackUrl: `${BASE}/projects`, json: "true",
  });
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader },
    body,
  });
  for (const c of parseSetCookies(loginRes)) jar.set(c.name, c.value);
  return [...jar.entries()].map(([name, value]) => ({ name, value, url: BASE }));
}

const ROUTES = process.argv[2] ? process.argv[2].split(",") : [
  "/projects/templates", "/organization/teams", "/hr", "/payroll/employees",
  "/support/reports", "/support/settings/automations", "/crm/contacts", "/accounting/taxes",
];

const cookies = await login();
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
await ctx.addCookies(cookies);
const page = await ctx.newPage();

for (const route of ROUTES) {
  const name = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`OK ${route} -> ${name}.png`);
  } catch (e) {
    console.log(`ERR ${route}: ${String(e).slice(0, 120)}`);
  }
}
await browser.close();
console.log("DONE dir=" + OUT);
