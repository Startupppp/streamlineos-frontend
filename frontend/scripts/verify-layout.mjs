import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:1000";
const EMAIL = process.env.DEMO_EMAIL ?? "demo@streamlineos.in";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@2026!";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

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
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader,
    },
    body,
  });
  for (const c of parseSetCookies(loginRes)) jar.set(c.name, c.value);
  const session = [...jar.keys()].filter((k) => k.includes("session-token"));
  if (session.length === 0) throw new Error(`login failed (status ${loginRes.status})`);
  return [...jar.entries()].map(([name, value]) => ({ name, value, url: BASE }));
}

async function main() {
  const routes = (process.argv[2] ?? "/projects").split(",");
  const cookies = await login();

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1557, height: 873 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  for (const target of routes) {
    await page.goto(`${BASE}${target}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(4000);

    const metrics = await page.evaluate(() => {
      const vh = window.innerHeight;
      const els = [...document.querySelectorAll("div")].filter(
        (el) => typeof el.className === "string" && (el.className.includes("border-dashed") || el.className.includes("rounded-md")),
      );
      const bottoms = els.map((el) => Math.round(el.getBoundingClientRect().bottom)).filter((b) => b <= vh);
      const main = document.getElementById("dashboard-content");
      return {
        viewportH: vh,
        contentBottom: bottoms.length ? Math.max(...bottoms) : null,
        mainBottom: main ? Math.round(main.getBoundingClientRect().bottom) : null,
        url: location.pathname,
      };
    });
    console.log(JSON.stringify(metrics));
    const name = target.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    await page.screenshot({ path: `scripts/verify-${name}.png` });
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
