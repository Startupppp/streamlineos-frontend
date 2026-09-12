#!/usr/bin/env node
/**
 * CPU-profiles ONE interaction on ONE route under the mobile profile the Web Vitals
 * driver uses, and prints where the processing time went — the call tree the driver
 * cannot give. `measure-web-vitals.mjs` reports the three INP phases; this reports
 * the functions inside the `processing` phase, plus whether the clicked control and
 * the page's main content were hydrated when the click landed, so a breach can be
 * attributed to code rather than to a candidate fix.
 *
 *   node scripts/profile-interaction.mjs --base-url=http://localhost:1000 \
 *     --cookie-file=<path> --route=/parties [--selector='button[aria-label="Open quick actions"]']
 *     [--repeat=3] [--cpu=4] [--out=.interaction-profile.json]
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { findBrowser } from "./lib/chrome-launcher.mjs";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const MOBILE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  userAgent:
    "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  userAgentMetadata: {
    brands: [
      { brand: "Not)A;Brand", version: "99" },
      { brand: "Google Chrome", version: "127" },
      { brand: "Chromium", version: "127" },
    ],
    fullVersion: "127.0.6533.88",
    platform: "Android",
    platformVersion: "12",
    architecture: "",
    model: "Pixel 6",
    mobile: true,
    bitness: "",
    wow64: false,
  },
};

const OBSERVER_SCRIPT = `
(() => {
  const s = { lastMutationMs: performance.now(), events: [] };
  window.__slProfile = s;
  new MutationObserver(() => { s.lastMutationMs = performance.now(); })
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        s.events.push({
          name: e.name, startTime: e.startTime, duration: e.duration,
          processingStart: e.processingStart, processingEnd: e.processingEnd,
          interactionId: e.interactionId,
          target: e.target ? (e.target.getAttribute && (e.target.getAttribute('aria-label') || e.target.tagName)) : null,
        });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch {}
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error(`DevTools did not answer on ${port}`);
}

async function cdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id !== undefined) {
      const cb = pending.get(msg.id);
      if (cb) {
        pending.delete(msg.id);
        cb(msg);
      }
      return;
    }
    for (const l of listeners.get(msg.method) ?? []) l(msg.params);
  };
  return {
    send: (method, params = {}) =>
      new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
    on: (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]),
    close: () => ws.close(),
  };
}

async function evaluate(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

async function settle(cdp, quietMs, capMs) {
  const started = Date.now();
  for (;;) {
    const since = Number(await evaluate(cdp, "performance.now() - (window.__slProfile ? window.__slProfile.lastMutationMs : 0)"));
    const elapsed = Date.now() - started;
    if (elapsed >= capMs || since >= quietMs) return { ms: elapsed, capped: elapsed >= capMs };
    await sleep(100);
  }
}

function hydrationProbe(selector) {
  return `JSON.stringify((() => {
    const hasFiber = (el) => !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
    const btn = document.querySelector(${JSON.stringify(selector)});
    const main = document.querySelector('main#dashboard-content') || document.querySelector('main');
    const deep = main ? main.querySelector('button, a, input, [role]') : null;
    const r = btn ? btn.getBoundingClientRect() : null;
    return {
      found: !!btn, x: r ? r.left + r.width / 2 : 0, y: r ? r.top + r.height / 2 : 0,
      hydrated: { control: hasFiber(btn), mainRoot: hasFiber(main), mainDeepChild: hasFiber(deep) },
      domNodes: document.getElementsByTagName('*').length,
      scripts: performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'script').length,
    };
  })())`;
}

function summariseProfile(profile) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const self = new Map();
  const total = new Map();
  const deltas = profile.timeDeltas ?? [];
  for (let i = 0; i < profile.samples.length; i++) {
    const dt = deltas[i] ?? 0;
    const nid = profile.samples[i];
    self.set(nid, (self.get(nid) ?? 0) + dt);
    const seen = new Set();
    for (let cur = nid; cur !== undefined; cur = parent.get(cur)) {
      const n = nodes.get(cur);
      const key = frameKey(n.callFrame);
      if (seen.has(key)) continue;
      seen.add(key);
      total.set(key, (total.get(key) ?? 0) + dt);
    }
  }
  const bySelf = new Map();
  for (const [nid, us] of self) {
    const key = frameKey(nodes.get(nid).callFrame);
    bySelf.set(key, (bySelf.get(key) ?? 0) + us);
  }
  const totalUs = deltas.reduce((a, b) => a + b, 0);
  const top = (m) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([key, us]) => ({ frame: key, ms: Math.round(us / 100) / 10, pct: Math.round((us / totalUs) * 1000) / 10 }));
  const byUrl = new Map();
  for (const [key, us] of bySelf) {
    const url = key.split(" @ ")[1]?.split(":")[0] ?? "(program)";
    byUrl.set(url, (byUrl.get(url) ?? 0) + us);
  }
  return { totalMs: Math.round(totalUs / 1000), topSelf: top(bySelf), topTotal: top(total), byUrl: top(byUrl) };
}

function frameKey(cf) {
  const name = cf.functionName || "(anonymous)";
  if (!cf.url) return `${name} @ (${cf.scriptId ? "script" : "native"})`;
  const short = cf.url.replace(/^https?:\/\/[^/]+/, "");
  return `${name} @ ${short}:${cf.lineNumber + 1}`;
}

async function main() {
  const baseUrl = flag("base-url", "http://localhost:1000").replace(/\/$/, "");
  const route = flag("route", "/parties");
  const selector = flag("selector", 'button[aria-label="Open quick actions"]');
  const repeat = Number(flag("repeat", "3"));
  const cpu = Number(flag("cpu", "4"));
  const out = resolve(process.cwd(), flag("out", ".interaction-profile.json"));
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const port = Number(flag("debug-port", "9231"));
  if (!cookieFile || !existsSync(cookieFile)) throw new Error("--cookie-file=<path> is required");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  const browser = findBrowser(flag("browser", ""));
  if (!browser) throw new Error("no Chrome found; set CHROME_PATH or pass --browser=<path>");

  const userDataDir = join(tmpdir(), `sl-profile-${randomBytes(6).toString("hex")}`);
  const proc = spawn(
    browser,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-background-timer-throttling",
    ],
    { stdio: "pipe" },
  );
  const results = [];
  try {
    await waitForDevTools(port, 15_000);
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === "page");
    const cdp = await cdpSession(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
    await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVER_SCRIPT });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: MOBILE.width,
      height: MOBILE.height,
      deviceScaleFactor: MOBILE.deviceScaleFactor,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await cdp.send("Emulation.setUserAgentOverride", { userAgent: MOBILE.userAgent, userAgentMetadata: MOBILE.userAgentMetadata });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

    for (let i = 0; i < repeat; i++) {
      const loaded = new Promise((res) => cdp.on("Page.loadEventFired", res));
      await cdp.send("Page.navigate", { url: `${baseUrl}${route}` });
      await Promise.race([loaded, sleep(30_000)]);
      const settled = await settle(cdp, 500, 6000);
      const before = JSON.parse(await evaluate(cdp, hydrationProbe(selector)));
      if (!before.found) throw new Error(`selector not found on ${route}: ${selector}`);
      await cdp.send("Profiler.start");
      const t0 = Date.now();
      for (const type of ["mousePressed", "mouseReleased"])
        await cdp.send("Input.dispatchMouseEvent", { type, x: before.x, y: before.y, button: "left", clickCount: 1 });
      await sleep(1500);
      const { profile } = await cdp.send("Profiler.stop");
      const after = JSON.parse(await evaluate(cdp, hydrationProbe(selector)));
      const events = JSON.parse(await evaluate(cdp, "JSON.stringify(window.__slProfile.events)"));
      const clickEvents = events.filter((e) => ["pointerdown", "pointerup", "click", "mousedown", "mouseup"].includes(e.name));
      const phases = clickEvents.map((e) => ({
        name: e.name,
        target: e.target,
        inputDelay: Math.round(e.processingStart - e.startTime),
        processing: Math.round(e.processingEnd - e.processingStart),
        presentation: Math.round(e.startTime + e.duration - e.processingEnd),
        duration: Math.round(e.duration),
      }));
      const summary = summariseProfile(profile);
      results.push({ sample: i, settled, hydratedBefore: before.hydrated, hydratedAfter: after.hydrated, domNodes: before.domNodes, phases, summary, wallMs: Date.now() - t0 });
      console.log(`\n=== ${route} sample ${i} · settle ${settled.ms}ms${settled.capped ? " CAPPED" : ""} · DOM ${before.domNodes} nodes`);
      console.log(`hydrated before click: ${JSON.stringify(before.hydrated)} · after: ${JSON.stringify(after.hydrated)}`);
      for (const p of phases) console.log(`  ${p.name.padEnd(12)} target=${p.target} input=${p.inputDelay} processing=${p.processing} presentation=${p.presentation} duration=${p.duration}`);
      console.log(`  profiled ${summary.totalMs}ms of JS in the 1.5s window`);
      console.log("  top self-time frames:");
      for (const f of summary.topSelf.slice(0, 20)) console.log(`    ${String(f.ms).padStart(7)}ms ${String(f.pct).padStart(5)}%  ${f.frame}`);
      console.log("  by script url:");
      for (const f of summary.byUrl.slice(0, 10)) console.log(`    ${String(f.ms).padStart(7)}ms ${String(f.pct).padStart(5)}%  ${f.frame}`);
      await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(300);
    }
    cdp.close();
  } finally {
    proc.kill("SIGKILL");
    await sleep(500);
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5 });
  }
  writeFileSync(out, JSON.stringify({ route, selector, cpu, results }, null, 2));
  console.log(`\nwrote ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
