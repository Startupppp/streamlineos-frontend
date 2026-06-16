import { chromium } from "playwright";
const BASE = "http://localhost:1000";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));

await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.fill('input[type="email"], input[name="email"]', "demo@streamlineos.in");
await page.fill('input[type="password"], input[name="password"]', "Demo@2026!");
const cbResp = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"), { timeout: 30000 }).catch(() => null);
await page.click('button[type="submit"]');
const cb = await cbResp;
console.log("credentials callback status:", cb ? cb.status() : "NO CALLBACK FIRED (native submit?)");
await page.waitForTimeout(2500);
console.log("URL after login:", page.url());

const sess = await page.request.get(`${BASE}/api/auth/session`);
const sj = await sess.json().catch(() => null);
console.log("session.user:", sj && sj.user ? JSON.stringify({ email: sj.user.email, role: sj.user.role, id: sj.user.id }) : "NONE");

await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const nav = await page.evaluate(() => {
  const navEl = document.querySelector("nav");
  const links = navEl ? [...navEl.querySelectorAll("a,button")] : [];
  return {
    navExists: !!navEl,
    navText: navEl ? navEl.innerText.replace(/\n+/g, " | ").slice(0, 400) : "(no nav element)",
    linkCount: links.length,
    aside: !!document.querySelector("aside"),
  };
});
console.log("NAV linkCount:", nav.linkCount);
console.log("NAV text:", nav.navText);
await page.screenshot({ path: "e2e-artifacts/_probe_real_login.png", fullPage: false });
await browser.close();
