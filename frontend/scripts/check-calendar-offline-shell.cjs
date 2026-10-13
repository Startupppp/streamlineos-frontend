const { chromium } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

async function writeSnapshot(page, identity, version, fetchedAt = Date.now()) {
  await page.evaluate(async ({ identity, version, fetchedAt }) => {
    localStorage.setItem("streamline-calendar-offline-identity", identity);
    localStorage.setItem(`streamline-calendar-offline-policy-revocation:${identity}`, JSON.stringify({ version, enabled: true }));
    sessionStorage.setItem("streamline-calendar-offline-session-identity", identity);
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("streamline-calendar-offline", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("snapshot");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("snapshot", "readwrite");
      transaction.objectStore("snapshot").put({
        identity,
        fetchedAt,
        windowStart: new Date(Date.now() - 3_600_000).toISOString(),
        windowEnd: new Date(Date.now() + 3_600_000).toISOString(),
        coverage: "complete",
        policyVersion: version,
        maxAgeDays: 1,
        sources: [{ sourceKey: "event", state: "complete" }],
        windows: [{ start: new Date(Date.now() + 60_000).toISOString(), end: new Date(Date.now() + 3_660_000).toISOString(), allDay: false, availability: "busy", title: "Sensitive meeting title" }],
      }, "latest");
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { identity, version, fetchedAt });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CALENDAR_BROWSER_EXECUTABLE || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(__dirname, "..", "public", "calendar-offline.html")).href);
    await writeSnapshot(page, "org-1:user-1", 1);
    await page.reload();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("Saved"));
    assert.match(await page.locator("#windows").innerText(), /Busy/);
    assert.doesNotMatch(await page.locator("body").innerText(), /Sensitive meeting title/);
    await page.evaluate(() => {
      const key = "streamline-calendar-offline-policy-revocation:org-1:user-1";
      localStorage.setItem(key, JSON.stringify({ version: 2, enabled: false }));
      localStorage.removeItem("streamline-calendar-offline-identity");
      dispatchEvent(new StorageEvent("storage", { key, oldValue: '{"version":1,"enabled":true}', newValue: '{"version":2,"enabled":false}' }));
    });
    assert.equal(await page.locator("#windows").innerText(), "");
    assert.match(await page.locator("#status").innerText(), /access changed/);
    await page.reload();
    assert.match(await page.locator("#status").innerText(), /no recent authenticated Calendar session/);
    await writeSnapshot(page, "org-2:user-1", 1);
    await page.reload();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("Saved"));
    assert.match(await page.locator("#windows").innerText(), /Busy/);
    await page.evaluate(() => localStorage.setItem("streamline-calendar-offline-policy-revocation:org-2:user-1", JSON.stringify({ version: 2, enabled: true })));
    await page.reload();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("No recent offline schedule"));
    await writeSnapshot(page, "org-2:user-1", 2, Date.now() - 2 * 86_400_000);
    await page.reload();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("No recent offline schedule"));
    await writeSnapshot(page, "org-2:user-1", 2);
    await page.reload();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("Saved"));
    const context = await browser.newContext({ serviceWorkers: "allow" });
    try {
      const baseUrl = "https://calendar.test";
      const shell = readFileSync(join(__dirname, "..", "public", "calendar-offline.html"));
      const worker = readFileSync(join(__dirname, "..", "public", "sw.js"));
      await context.route(`${baseUrl}/**`, (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === "/calendar-offline.html") return route.fulfill({ status: 200, contentType: "text/html", body: shell });
        if (pathname === "/sw.js") return route.fulfill({ status: 200, contentType: "text/javascript", body: worker });
        if (pathname === "/calendar") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Calendar online</title>" });
        return route.fulfill({ status: 404 });
      });
        const offlinePage = await context.newPage();
        await offlinePage.goto(`${baseUrl}/calendar`);
        await offlinePage.evaluate(async () => {
          await navigator.serviceWorker.register("/sw.js");
          await navigator.serviceWorker.ready;
        });
        await offlinePage.reload();
        await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
        await writeSnapshot(offlinePage, "org-3:user-1", 1);
        await context.unroute(`${baseUrl}/**`);
        await context.setOffline(true);
        await offlinePage.goto(`${baseUrl}/calendar`);
        await offlinePage.waitForFunction(() => document.title === "Calendar offline" && document.getElementById("status").textContent.includes("Saved"));
        assert.match(await offlinePage.locator("#windows").innerText(), /Busy/);
        await offlinePage.evaluate(() => {
          const key = "streamline-calendar-offline-policy-revocation:org-3:user-1";
          localStorage.setItem(key, JSON.stringify({ version: 2, enabled: false }));
          localStorage.removeItem("streamline-calendar-offline-identity");
          dispatchEvent(new StorageEvent("storage", { key, oldValue: '{"version":1,"enabled":true}', newValue: '{"version":2,"enabled":false}' }));
        });
        assert.equal(await offlinePage.locator("#windows").innerText(), "");
        await offlinePage.reload();
        await offlinePage.waitForFunction(() => document.getElementById("status").textContent.includes("no recent authenticated Calendar session"));
    } finally {
      await context.close();
    }
    console.log("Offline browser checks passed: display, redaction, revocation, reload, account isolation, policy version, expiry, service-worker navigation");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
