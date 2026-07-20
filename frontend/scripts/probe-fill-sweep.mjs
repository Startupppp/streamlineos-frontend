import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:1000";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@streamlineos.in";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@2026!";
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
    csrfToken, email: DEMO_EMAIL, password: DEMO_PASSWORD,
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

const ROUTES = process.argv[2]
  ? process.argv[2].split(",")
  : [
      "/projects/all", "/projects/all-work", "/projects/my-work", "/projects/approvals",
      "/projects/command-center", "/projects/roadmap", "/projects/templates", "/projects/goal",
      "/projects/portfolios", "/projects/portal", "/projects/settings/integrations",
      "/projects/80", "/projects/80/backlog", "/projects/80/views", "/projects/80/my-tickets",
      "/projects/80/workload", "/projects/80/timeline", "/projects/80/cycles", "/projects/80/epics",
      "/projects/80/sprints", "/projects/80/milestones", "/projects/80/reports",
      "/projects/80/analytics", "/projects/80/budget", "/projects/80/qa", "/projects/80/bugs",
      "/projects/80/incidents", "/projects/80/releases", "/projects/80/change-requests",
      "/projects/80/risks", "/projects/80/decisions", "/projects/80/meetings", "/projects/80/chat",
      "/projects/80/whiteboard", "/projects/80/client-portal", "/projects/80/approvals",
      "/projects/80/settings", "/projects/80/workflow", "/projects/80/automations",
      "/projects/80/webhooks", "/projects/80/modules", "/projects/80/forms", "/projects/80/intake",
      "/projects/80/feedbucket", "/projects/80/pages", "/projects/80/ai",
    ];

const cookies = await login();
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
await ctx.addCookies(cookies);
const page = await ctx.newPage();

for (const route of ROUTES) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return { err: "no main" };
      const scroller = main.querySelector(":scope > div");
      if (!scroller) return { err: "no scroller" };
      const sRect = scroller.getBoundingClientRect();
      let maxBottom = sRect.top;
      const walk = (el) => {
        for (const child of el.children) {
          const cs = getComputedStyle(child);
          if (cs.position === "fixed" || cs.display === "none") continue;
          const b = child.getBoundingClientRect().bottom;
          if (b > maxBottom) maxBottom = b;
          walk(child);
        }
      };
      walk(scroller);
      const scrollable = scroller.scrollHeight > scroller.clientHeight + 4;
      return {
        scrollerBottom: Math.round(sRect.bottom),
        contentBottom: Math.round(maxBottom),
        gap: Math.round(sRect.bottom - maxBottom),
        scrollable,
      };
    });
    const flag = !r.err && !r.scrollable && r.gap > 48 ? "  <-- GAP" : "";
    console.log(`${route}: ${JSON.stringify(r)}${flag}`);
  } catch (e) {
    console.log(`${route}: ERROR ${String(e).slice(0, 120)}`);
  }
}
await browser.close();
