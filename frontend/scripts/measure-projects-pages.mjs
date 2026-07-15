import { chromium } from "playwright";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:1000";
const EMAIL = "demo@streamlineos.in";
const PASSWORD = "Demo@2026!";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const OUT_DIR = join(process.cwd(), "..", "testing");
const SHOT_DIR = join(OUT_DIR, "screenshots", process.argv[3] === "after" ? "after" : "before");
const NOTES = join(OUT_DIR, `measurements-${process.argv[3] === "after" ? "after" : "before"}.jsonl`);

const STATIC_SEGMENTS = new Set([
  "all", "all-work", "my-work", "approvals", "command-center", "roadmap",
  "templates", "goal", "portfolios", "portal", "settings",
]);

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
    csrfToken, email: EMAIL, password: PASSWORD,
    callbackUrl: `${BASE}/projects`, json: "true",
  });
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual",
    headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader },
    body,
  });
  for (const c of parseSetCookies(loginRes)) jar.set(c.name, c.value);
  if (![...jar.keys()].some((k) => k.includes("session-token"))) {
    throw new Error(`login failed (status ${loginRes.status})`);
  }
  return {
    cookies: [...jar.entries()].map(([name, value]) => ({ name, value, url: BASE })),
    cookieHeader: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}

async function measurePage(ctx, route, index) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Push API")) consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});

  const apiCalls = [];
  const failedResources = [];
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes(":1500") || u.includes("/api/")) {
      const req = res.request();
      const t = req.timing();
      apiCalls.push({
        url: u.replace(BASE, "").replace("http://localhost:1500", ":1500").slice(0, 160),
        status: res.status(),
        ms: t.responseEnd > 0 ? Math.round(t.responseEnd) : null,
      });
    } else if (res.status() >= 400) {
      failedResources.push({ url: u.replace(BASE, "").slice(0, 160), status: res.status() });
    }
  });

  const t0 = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  const warmMs = Date.now() - t0;

  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/"))
  );

  const name = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOT_DIR, `${String(index).padStart(2, "0")}-${name}.png`) }).catch(() => {});

  const slow = apiCalls.filter((c) => (c.ms ?? 0) > 1000);
  const failed = apiCalls.filter((c) => c.status >= 400);
  const record = {
    route, warmMs, apiCount: apiCalls.length,
    slowCalls: slow, failedCalls: failed,
    failedResources: failedResources.slice(0, 10),
    consoleErrors: [...new Set(consoleErrors)].slice(0, 10),
    links: [...new Set(links)],
  };
  appendFileSync(NOTES, JSON.stringify(record) + "\n");
  await page.close();
  return record;
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const { cookies, cookieHeader } = await login();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);

  const discovery = await ctx.newPage();
  await discovery.goto(`${BASE}/projects/all`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await discovery.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  if (discovery.url().includes("/signin")) throw new Error("session cookie rejected — landed on /signin");
  await discovery.waitForTimeout(2000);
  let projectId = await discovery.evaluate((staticSegs) => {
    const hrefs = [...document.querySelectorAll('a[href^="/projects/"]')].map((a) => a.getAttribute("href"));
    for (const h of hrefs) {
      const seg = h.split("/")[2];
      if (seg && !staticSegs.includes(seg) && !h.split("/")[3]) return seg;
    }
    return null;
  }, [...STATIC_SEGMENTS]);
  if (!projectId) {
    const card = discovery.locator("[data-project-id], [class*=project-card], main a, main [role=button]").first();
    await card.click({ timeout: 5000 }).catch(() => {});
    await discovery.waitForTimeout(3000);
    const path = new URL(discovery.url()).pathname;
    const seg = path.split("/")[2];
    if (seg && !STATIC_SEGMENTS.has(seg)) projectId = seg;
  }
  await discovery.close();
  console.log(`projectId: ${projectId}`);

  const routesArg = process.argv[2] && process.argv[2] !== "default" ? process.argv[2] : null;
  const routes = routesArg
    ? routesArg.split(",").map((r) => r.replace("{id}", projectId ?? ""))
    : [
        "/projects", "/projects/all", "/projects/all-work", "/projects/my-work",
        ...(projectId
          ? [
              `/projects/${projectId}`, `/projects/${projectId}/backlog`,
              `/projects/${projectId}/sprints`, `/projects/${projectId}/epics`,
              `/projects/${projectId}/reports`, `/projects/${projectId}/settings`,
            ]
          : []),
      ];

  const summary = [];
  for (let i = 0; i < routes.length; i++) {
    const r = await measurePage(ctx, routes[i], i + 1);
    summary.push(r);
    console.log(`${r.route}: warm ${r.warmMs}ms, ${r.apiCount} api calls, ${r.failedCalls.length} failed, ${r.consoleErrors.length} console errors`);
  }

  const allLinks = [...new Set(summary.flatMap((s) => s.links))].filter(
    (h) => !h.startsWith("/api/") && !h.includes("signout")
  );
  const broken = [];
  for (const href of allLinks) {
    try {
      const res = await fetch(`${BASE}${href.split("?")[0]}`, {
        headers: { "user-agent": UA, cookie: cookieHeader }, redirect: "follow",
      });
      if (res.status === 404) broken.push({ href, status: res.status });
    } catch {
      broken.push({ href, status: "fetch-error" });
    }
  }
  appendFileSync(NOTES, JSON.stringify({ linkCheck: { total: allLinks.length, broken } }) + "\n");
  console.log(`link check: ${allLinks.length} internal links, ${broken.length} broken`);
  for (const b of broken) console.log(`  404: ${b.href}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
