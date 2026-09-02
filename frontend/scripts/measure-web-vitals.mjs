#!/usr/bin/env node
/**
 * measure-web-vitals — produce the capture `check-web-vitals-budget` reads.
 *
 * `.browser-driver-results.json` used to be written by a driver living in the
 * backend repo whose browser list held only Windows paths, and which hardcoded
 * `serverMode: "production"` into its output regardless of what it had actually
 * measured. The gate's production check could therefore never fail. This driver
 * runs on this machine, and *derives* serverMode by comparing the build id in
 * the served HTML against `.next/BUILD_ID`, so a development server is detected
 * rather than asserted away.
 *
 *   node scripts/measure-web-vitals.mjs --self-test
 *   node scripts/measure-web-vitals.mjs \
 *     --base-url=http://localhost:1000 \
 *     --routes=/mail,/inbox,/dashboard \
 *     --repeat=5 --cookie-file=<path to a session cookie value>
 *
 * The cookie file holds the value of the `authjs.session-token` cookie for an
 * authenticated user. Budgets govern authenticated routes, so an unauthenticated
 * run is refused.
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { tmpdir, loadavg, cpus } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BROWSER_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const MOBILE_PROFILE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  cpuThrottlingRate: 4,
  latencyMs: 150,
  downloadBps: 1_600_000 / 8,
  uploadBps: 750_000 / 8,
};

/**
 * Interactions used to elicit INP. Every one of these opens a panel or a menu —
 * none of them writes. A driver that clicks the first button it finds can
 * archive a message or delete a row on the page it is measuring.
 */
const INERT_INTERACTION_SELECTORS = [
  'button[aria-label^="Search"]',
  'button[aria-label="Open quick actions"]',
  'button[aria-label="More navigation options"]',
  'button[aria-label="Switch module"]',
  '[role="tab"]',
  "button[aria-haspopup]",
];

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function summarise(values) {
  const sorted = values.filter((v) => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return { count: sorted.length, p50: percentile(sorted, 50), p75: percentile(sorted, 75), p95: percentile(sorted, 95) };
}

export function buildProfileSummary(samples) {
  return {
    lcp: { p75_ms: summarise(samples.map((s) => s.lcpMs))?.p75 ?? null },
    inp: { p75_ms: summarise(samples.map((s) => s.inpMs))?.p75 ?? null },
    cls: { p75: summarise(samples.map((s) => s.cls))?.p75 ?? null },
    fcp: { p75_ms: summarise(samples.map((s) => s.fcpMs))?.p75 ?? null },
    ttfb: { p95_ms: summarise(samples.map((s) => s.ttfbMs))?.p95 ?? null },
    longTasks: { p75_ms: summarise(samples.map((s) => s.longTaskMs))?.p75 ?? null },
    usedJsHeap: { p75_bytes: summarise(samples.map((s) => s.usedJsHeapBytes))?.p75 ?? null },
  };
}

/**
 * A dev server compiles on demand and serves a different build id than the one
 * `next build` left on disk. Comparing the two is the only claim about server
 * mode this driver is entitled to make.
 */
/**
 * A capture taken while the app was rendering its branded loading screen, an
 * error boundary, or an all-but-empty document measures the failure, not the
 * product — and reads as a good LCP while doing it. That is exactly how the
 * capture this driver replaces came to record numbers nobody could reproduce,
 * so every sample is asserted against the page it actually rendered.
 */
export function findUnusableSamples(samples, minWords = 10) {
  return samples
    .map((s, index) => ({ index, content: s.content ?? {} }))
    .filter(({ content }) => content.brandedLoader === true || content.errorBoundary === true || (content.words ?? 0) < minWords)
    .map(({ index, content }) => ({
      index,
      url: content.url ?? null,
      words: content.words ?? null,
      brandedLoader: content.brandedLoader ?? null,
      errorBoundary: content.errorBoundary ?? null,
    }));
}

export function resolveServerMode({ buildIdOnDisk, html }) {
  if (typeof html !== "string" || html.length === 0) return "unknown";
  if (/react-refresh|__nextjs_original-stack-frame|webpack-hmr/.test(html)) return "development";
  if (!buildIdOnDisk) return "unknown";
  return html.includes(buildIdOnDisk) ? "production" : "unknown";
}

/**
 * The app's own API is a different origin in every deployment, so an
 * origin-equality test files every first-party API response under "third party"
 * and makes that budget meaningless. First-party means the page origin plus the
 * configured API origin; third party means a vendor.
 */
export function classifyResource({ type, url, baseOrigin, firstPartyOrigins = [] }) {
  let origin = "";
  try {
    origin = new URL(url).origin;
  } catch {
    origin = "";
  }
  const known = new Set([baseOrigin, ...firstPartyOrigins].filter(Boolean));
  const thirdParty = origin !== "" && !known.has(origin) && !url.startsWith("data:");
  const kind =
    type === "Script" ? "script"
      : type === "Stylesheet" ? "stylesheet"
        : type === "Image" ? "image"
          : type === "Font" ? "font"
            : type === "Document" ? "document"
              : "other";
  return { kind, thirdParty };
}

export function summariseBytes(entries) {
  const totals = { scriptBytes: 0, stylesheetBytes: 0, imageBytes: 0, fontBytes: 0, documentBytes: 0, otherBytes: 0, thirdPartyBytes: 0, totalBytes: 0 };
  for (const { kind, thirdParty, bytes } of entries) {
    totals[`${kind}Bytes`] += bytes;
    if (thirdParty) totals.thirdPartyBytes += bytes;
    totals.totalBytes += bytes;
  }
  return totals;
}

/**
 * A budget nobody can trace to a URL cannot be argued with. Images and
 * third-party bytes are the two lines most often disputed, so their requests
 * are listed rather than only totalled.
 */
export function itemiseBytes(entries, kinds) {
  return entries
    .filter((e) => kinds.includes(e.kind) || e.thirdParty)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 20)
    .map(({ kind, thirdParty, bytes, url }) => ({ kind, thirdParty, bytes, url }));
}

/**
 * Fold a cold-cache byte pass into `contracts/route-bundle-manifest.json`.
 * `measuredFirstLoadJsBytes` is deliberately left alone — that field has a
 * different definition (gzip(9) over the route's client-reference manifest) and
 * `measure-route-bundles.mjs` owns it. Everything here is over-the-wire bytes.
 */
export function mergeBytesIntoManifest(manifest, bytesByRoute) {
  const updated = { ...manifest, budgets: { ...manifest.budgets } };
  const touched = [];
  for (const [route, totals] of Object.entries(bytesByRoute)) {
    const entry = updated.budgets[route];
    if (!entry) continue;
    updated.budgets[route] = {
      ...entry,
      measuredCssBytes: totals.stylesheetBytes,
      measuredImageBytes: totals.imageBytes,
      measuredFontBytes: totals.fontBytes,
      measuredThirdPartyBytes: totals.thirdPartyBytes,
      measuredServerPayloadBytes: totals.documentBytes,
    };
    touched.push(route);
  }
  return { manifest: updated, touched };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findBrowser(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  for (const p of BROWSER_CANDIDATES) if (existsSync(p)) return p;
  return null;
}

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
  throw new Error(`DevTools did not answer on port ${port} within ${timeoutMs}ms`);
}

async function cdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let msgId = 0;
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
    const ls = listeners.get(msg.method);
    if (ls) for (const l of ls) l(msg.params);
  };
  const send = (method, params = {}) => {
    const id = ++msgId;
    return new Promise((res, rej) => {
      pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  };
  const on = (event, listener) => {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(listener);
  };
  return { send, on, close: () => ws.close() };
}

const VITALS_SCRIPT = `(() => {
  if (window.__slVitals) return;
  const state = { lcp: null, cls: 0, inp: null, longTaskMs: 0, shifts: [] };
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return 'unknown';
    const id = node.id ? '#' + node.id : '';
    const cls = typeof node.className === 'string' && node.className ? '.' + node.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
    return (node.tagName || '?').toLowerCase() + id + cls;
  };
  Object.defineProperty(window, '__slVitals', { value: state });
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries();
      const last = e[e.length - 1];
      if (last) state.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        state.cls += e.value;
        if (e.value >= 0.005)
          state.shifts.push({
            value: Number(e.value.toFixed(4)),
            atMs: Math.round(e.startTime),
            sources: (e.sources || []).slice(0, 3).map((s) => describe(s.node)),
          });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (e.interactionId && (state.inp === null || e.duration > state.inp)) state.inp = e.duration;
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) state.longTaskMs += e.duration;
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
})();`;

async function applyProfile(cdp, profile) {
  if (profile === "desktop") {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: "none" });
    return;
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: MOBILE_PROFILE.width,
    height: MOBILE_PROFILE.height,
    deviceScaleFactor: MOBILE_PROFILE.deviceScaleFactor,
    mobile: true,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: MOBILE_PROFILE.cpuThrottlingRate });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: MOBILE_PROFILE.latencyMs,
    downloadThroughput: MOBILE_PROFILE.downloadBps,
    uploadThroughput: MOBILE_PROFILE.uploadBps,
    connectionType: "cellular4g",
  });
}

async function navigate(cdp, url, timeoutMs) {
  const loaded = new Promise((res) => cdp.on("Page.loadEventFired", res));
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, sleep(timeoutMs)]);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
}

async function interact(cdp) {
  const raw = await evaluate(
    cdp,
    `JSON.stringify((() => {
      const selectors = ${JSON.stringify(INERT_INTERACTION_SELECTORS)};
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width > 4 && r.height > 4 && r.top >= 0 && r.left >= 0 &&
              r.bottom <= innerHeight && r.right <= innerWidth)
            return { found: true, selector: sel, x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      return { found: false };
    })())`,
  );
  const target = JSON.parse(raw ?? '{"found":false}');
  if (!target.found) return { interacted: false, selector: null };
  for (const type of ["mousePressed", "mouseReleased"])
    await cdp.send("Input.dispatchMouseEvent", { type, x: target.x, y: target.y, button: "left", clickCount: 1 });
  await sleep(600);
  for (const type of ["keyDown", "keyUp"])
    await cdp.send("Input.dispatchKeyEvent", { type, key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await sleep(400);
  return { interacted: true, selector: target.selector };
}

async function collectSample(cdp) {
  const nav = JSON.parse(
    (await evaluate(
      cdp,
      `JSON.stringify(performance.getEntriesByType("navigation").map(e => ({ fetchStart: e.fetchStart, responseStart: e.responseStart, transferSize: e.transferSize })))`,
    )) ?? "[]",
  )[0] ?? null;
  const paints = JSON.parse(
    (await evaluate(cdp, `JSON.stringify(performance.getEntriesByType("paint").map(e => ({ name: e.name, startTime: e.startTime })))`)) ?? "[]",
  );
  const vitals = JSON.parse((await evaluate(cdp, `JSON.stringify(window.__slVitals ?? {})`)) ?? "{}");
  const content = JSON.parse(
    (await evaluate(
      cdp,
      `JSON.stringify({
        url: location.href,
        title: document.title,
        words: (document.body?.innerText ?? '').trim().split(/\\s+/).filter(Boolean).length,
        brandedLoader: !!document.querySelector('[data-app-loading-screen]') || (document.body?.innerText ?? '').includes('Syncing organization'),
        errorBoundary: (document.body?.innerText ?? '').includes('Something went wrong')
      })`,
    )) ?? "{}",
  );
  const memory = JSON.parse(
    (await evaluate(
      cdp,
      `JSON.stringify(performance.memory ? { usedJsHeapBytes: performance.memory.usedJSHeapSize, totalJsHeapBytes: performance.memory.totalJSHeapSize } : {})`,
    )) ?? "{}",
  );
  const fcp = paints.find((p) => p.name === "first-contentful-paint");
  return {
    usedJsHeapBytes: Number.isFinite(memory.usedJsHeapBytes) ? memory.usedJsHeapBytes : null,
    ttfbMs: nav ? nav.responseStart - nav.fetchStart : null,
    fcpMs: fcp ? fcp.startTime : null,
    lcpMs: Number.isFinite(vitals.lcp) ? vitals.lcp : null,
    inpMs: Number.isFinite(vitals.inp) ? vitals.inp : null,
    cls: Number.isFinite(vitals.cls) ? vitals.cls : null,
    longTaskMs: Number.isFinite(vitals.longTaskMs) ? vitals.longTaskMs : null,
    shifts: Array.isArray(vitals.shifts) ? vitals.shifts : [],
    content,
  };
}

/**
 * React reports a hydration mismatch only through the console. A run that never
 * reads the console can call hydration "not measured" or, worse, "fine".
 */
export function isHydrationMismatch(text) {
  return /hydrat(ion|ing|ed)?\s*(failed|error|mismatch)|did not match|text content does not match|server rendered html/i.test(String(text ?? ""));
}

function attachConsoleRecorder(cdp) {
  let messages = [];
  const push = (level, text) => {
    if (level !== "error" && level !== "warning") return;
    messages.push({ level, text: String(text).slice(0, 300) });
  };
  cdp.on("Runtime.consoleAPICalled", ({ type, args }) => {
    push(type === "warning" ? "warning" : type, (args ?? []).map((a) => a.value ?? a.description ?? "").join(" "));
  });
  cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    push("error", exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? "");
  });
  return {
    reset() {
      messages = [];
    },
    hydrationMismatches() {
      return messages.filter((m) => isHydrationMismatch(m.text));
    },
    errors() {
      return messages.filter((m) => m.level === "error");
    },
  };
}

function attachByteRecorder(cdp, baseOrigin, firstPartyOrigins) {
  const byRequest = new Map();
  let entries = [];
  cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
    const url = response?.url ?? "";
    byRequest.set(requestId, { ...classifyResource({ type, url, baseOrigin, firstPartyOrigins }), url: url.slice(0, 200) });
  });
  cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    const meta = byRequest.get(requestId);
    if (!meta) return;
    entries.push({ ...meta, bytes: encodedDataLength ?? 0 });
  });
  return {
    reset() {
      byRequest.clear();
      entries = [];
    },
    totals() {
      return { ...summariseBytes(entries), notableResources: itemiseBytes(entries, ["image", "font"]) };
    },
  };
}

async function run() {
  const baseUrl = flag("base-url", "http://localhost:1000").replace(/\/$/, "");
  const routes = flag("routes", "/mail,/inbox,/dashboard").split(",").map((r) => r.trim()).filter(Boolean);
  const byteOnlyRoutes = flag("byte-routes", "").split(",").map((r) => r.trim()).filter(Boolean);
  const writeManifest = argv.includes("--write-manifest");
  const repeat = Number(flag("repeat", "5"));
  const out = resolve(process.cwd(), flag("out", join(ROOT, ".browser-driver-results.json")));
  const timeoutMs = Number(flag("timeout", "30000"));
  const debugPort = Number(flag("debug-port", "9224"));
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const browserPath = findBrowser(flag("browser", ""));

  if (!browserPath) throw new Error(`no browser found — pass --browser=<path>. Tried: ${BROWSER_CANDIDATES.join(", ")}`);
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file=<path> is required; these budgets govern authenticated routes");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();

  const baseOrigin = new URL(baseUrl).origin;
  const firstPartyOrigins = flag("first-party-origins", process.env.NEXT_PUBLIC_API_URL ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => {
      try {
        return new URL(o).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  const buildIdPath = join(ROOT, ".next", "BUILD_ID");
  const buildIdOnDisk = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "";

  const probe = await fetch(`${baseUrl}${routes[0]}`, { headers: { cookie: `${cookieName}=${cookieValue}` } });
  const probeHtml = await probe.text();
  const serverMode = resolveServerMode({ buildIdOnDisk, html: probeHtml });

  const userDataDir = join(tmpdir(), `sl-vitals-${randomBytes(6).toString("hex")}`);
  const proc = spawn(
    browserPath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
    ],
    { stdio: "pipe" },
  );

  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);
  log(`browser ${browserPath}`);
  log(`base ${baseUrl} · routes ${routes.join(", ")} · repeat ${repeat}`);
  log(`serverMode resolved to "${serverMode}" (build id on disk: ${buildIdOnDisk || "none"})`);

  const loadAtStart = loadavg();
  const byProfile = {};
  const byRoute = {};
  const bytesByRoute = {};
  const allSamples = [];
  const hydrationFindings = [];

  try {
    await waitForDevTools(debugPort, 15_000);
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");
    const cdp = await cdpSession(page.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: VITALS_SCRIPT });

    const bytes = attachByteRecorder(cdp, baseOrigin, firstPartyOrigins);
    const consoleLog = attachConsoleRecorder(cdp);

    for (const profile of ["desktop", "mobile"]) {
      await applyProfile(cdp, profile);
      const profileSamples = [];

      for (const route of routes) {
        const url = `${baseUrl}${route}`;

        // Cold-cache pass: the route bundle budgets are first-load figures.
        if (profile === "desktop") {
          await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
          bytes.reset();
          await navigate(cdp, url, timeoutMs);
          await sleep(1200);
          bytesByRoute[route] = bytes.totals();
          await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
        }

        // Discarded warm-up so the first measured navigation is not paying for
        // a cold Next.js route module or a cold connection pool.
        await navigate(cdp, url, timeoutMs);
        await sleep(800);

        const routeSamples = [];
        for (let i = 0; i < repeat; i++) {
          consoleLog.reset();
          await navigate(cdp, url, timeoutMs);
          await sleep(900);
          const probeInteraction = await interact(cdp);
          const sample = await collectSample(cdp);
          sample.interaction = probeInteraction;
          const mismatches = consoleLog.hydrationMismatches();
          if (mismatches.length > 0) hydrationFindings.push({ route, profile, sample: i, messages: mismatches.slice(0, 3) });
          routeSamples.push(sample);
          profileSamples.push(sample);
          allSamples.push(sample);
          log(
            `[${profile}] ${route} ${i + 1}/${repeat} ttfb=${sample.ttfbMs?.toFixed(0) ?? "n/a"} fcp=${sample.fcpMs?.toFixed(0) ?? "n/a"} ` +
              `lcp=${sample.lcpMs?.toFixed(0) ?? "n/a"} inp=${sample.inpMs?.toFixed(0) ?? "n/a"} cls=${sample.cls?.toFixed(3) ?? "n/a"} ` +
              `words=${sample.content?.words ?? "?"} loader=${sample.content?.brandedLoader ?? "?"}`,
          );
          await sleep(300);
        }
        byRoute[route] ??= {};
        byRoute[route][profile] = buildProfileSummary(routeSamples);
        byRoute[route][`${profile}Content`] = routeSamples.at(-1)?.content ?? null;
        const worstShift = routeSamples.flatMap((s) => s.shifts).sort((a, b) => b.value - a.value).slice(0, 5);
        if (worstShift.length > 0) byRoute[route][`${profile}LayoutShifts`] = worstShift;
      }
      byProfile[profile] = buildProfileSummary(profileSamples);

      if (profile === "desktop" && byteOnlyRoutes.length > 0) {
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        for (const route of byteOnlyRoutes) {
          bytes.reset();
          await navigate(cdp, `${baseUrl}${route}`, timeoutMs);
          await sleep(1200);
          bytesByRoute[route] = bytes.totals();
          log(`[bytes] ${route} ${bytesByRoute[route].totalBytes} bytes first load`);
        }
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
      }
    }
    cdp.close();
  } finally {
    proc.kill("SIGKILL");
    await sleep(300);
    rmSync(userDataDir, { recursive: true, force: true });
  }

  const unusable = findUnusableSamples(allSamples);

  const result = {
    generatedAtMs: Date.now(),
    generatedAt: new Date().toISOString(),
    baseUrl,
    targetUrl: baseUrl,
    serverMode,
    buildId: buildIdOnDisk,
    repeat,
    authenticatedRoutes: routes,
    desktop: byProfile.desktop,
    mobile: byProfile.mobile,
    byRoute,
    firstLoadBytesByRoute: bytesByRoute,
    hydration: {
      navigationsInspected: allSamples.length,
      mismatchesFound: hydrationFindings.length,
      findings: hydrationFindings.slice(0, 10),
      verdict: hydrationFindings.length === 0 ? "no React hydration mismatch was logged on any measured navigation" : "hydration mismatches logged",
    },
    contentAssertion: {
      minWordsPerSample: 10,
      samplesMeasured: allSamples.length,
      unusableSamples: unusable,
      verdict: unusable.length === 0 ? "every measured sample rendered real page content" : "capture is NOT usable evidence",
    },
    conditions: {
      driver: "frontend/scripts/measure-web-vitals.mjs",
      desktop: "1440x900, no CPU or network throttling",
      mobile: `${MOBILE_PROFILE.width}x${MOBILE_PROFILE.height}@${MOBILE_PROFILE.deviceScaleFactor}x, 4x CPU, 1.6 Mbps down / 750 Kbps up, 150ms RTT`,
      authMethod: "minted NextAuth session cookie, set once via CDP and reused for every navigation",
      firstPartyOrigins: [baseOrigin, ...firstPartyOrigins],
      cache: "vitals navigations run with the HTTP cache enabled after one discarded warm-up; firstLoadBytesByRoute is a separate cache-disabled pass",
      serverModeDerivation: "the build id in the served HTML is compared against .next/BUILD_ID; it is not asserted by this driver",
      host: {
        cpuCount: cpus().length,
        loadAverage1mAtStart: Number(loadAtStart[0].toFixed(2)),
        loadAverage1mAtEnd: Number(loadavg()[0].toFixed(2)),
        note: "A throttled mobile profile on a contended host measures the host. Compare captures only at similar load; a 1m average above the CPU count means the numbers are not the application's.",
      },
    },
  };

  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  log(`wrote ${out}`);

  if (unusable.length > 0) {
    console.error(
      `\nREFUSED as evidence: ${unusable.length}/${allSamples.length} sample(s) did not render real page content ` +
        `(branded loader, error boundary, or under 10 words). The numbers were still written to ${out} for diagnosis, ` +
        `but they measure a broken render, not the product.`,
    );
    for (const u of unusable.slice(0, 8)) console.error(`  sample ${u.index} ${u.url ?? "?"} words=${u.words} loader=${u.brandedLoader} errorBoundary=${u.errorBoundary}`);
    process.exitCode = 1;
    return;
  }

  if (writeManifest) {
    const manifestPath = join(ROOT, "contracts", "route-bundle-manifest.json");
    const current = JSON.parse(readFileSync(manifestPath, "utf8"));
    const { manifest, touched } = mergeBytesIntoManifest(current, bytesByRoute);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    log(`recorded CSS/image/font/third-party/server-payload bytes for ${touched.join(", ")} in ${manifestPath}`);
  }
}

function selfTest() {
  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`  ${ok ? "[pass]" : "[FAIL]"} ${label}${ok ? "" : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
    if (!ok) failed = true;
  };

  check("p75 of a known series", percentile([10, 20, 30, 40, 50], 75), 40);
  check("p95 of a known series", percentile([10, 20, 30, 40, 50], 95), 48);
  check("percentile of an empty series is null, not zero", percentile([], 75), null);

  check(
    "a dev server is detected even when its build id happens to match",
    resolveServerMode({ buildIdOnDisk: "abc", html: '<script src="/_next/static/chunks/react-refresh.js"></script>abc' }),
    "development",
  );
  check(
    "a build id the server does not serve is not called production",
    resolveServerMode({ buildIdOnDisk: "abc", html: "<html>def</html>" }),
    "unknown",
  );
  check(
    "matching build ids are production",
    resolveServerMode({ buildIdOnDisk: "abc", html: "<html>/_next/static/abc/x.js</html>" }),
    "production",
  );
  check("no build id on disk cannot be production", resolveServerMode({ buildIdOnDisk: "", html: "<html></html>" }), "unknown");

  check(
    "a cross-origin script counts as third party",
    classifyResource({ type: "Script", url: "https://cdn.example.com/a.js", baseOrigin: "http://localhost:1000" }),
    { kind: "script", thirdParty: true },
  );
  check(
    "the app's own API origin is first party, not a third party vendor",
    classifyResource({
      type: "XHR",
      url: "http://localhost:1500/me/access",
      baseOrigin: "http://localhost:1000",
      firstPartyOrigins: ["http://localhost:1500"],
    }),
    { kind: "other", thirdParty: false },
  );
  check(
    "a same-origin stylesheet does not",
    classifyResource({ type: "Stylesheet", url: "http://localhost:1000/a.css", baseOrigin: "http://localhost:1000" }),
    { kind: "stylesheet", thirdParty: false },
  );

  check(
    "bytes are summed per kind and third-party bytes counted once more",
    summariseBytes([
      { kind: "script", thirdParty: false, bytes: 100 },
      { kind: "script", thirdParty: true, bytes: 50 },
      { kind: "image", thirdParty: false, bytes: 20 },
    ]),
    { scriptBytes: 150, stylesheetBytes: 0, imageBytes: 20, fontBytes: 0, documentBytes: 0, otherBytes: 0, thirdPartyBytes: 50, totalBytes: 170 },
  );

  check(
    "notable resources list images, fonts and every third party, largest first",
    itemiseBytes(
      [
        { kind: "script", thirdParty: false, bytes: 900, url: "/a.js" },
        { kind: "image", thirdParty: false, bytes: 300, url: "/b.png" },
        { kind: "script", thirdParty: true, bytes: 400, url: "https://x/c.js" },
        { kind: "font", thirdParty: false, bytes: 100, url: "/d.woff2" },
      ],
      ["image", "font"],
    ),
    [
      { kind: "script", thirdParty: true, bytes: 400, url: "https://x/c.js" },
      { kind: "image", thirdParty: false, bytes: 300, url: "/b.png" },
      { kind: "font", thirdParty: false, bytes: 100, url: "/d.woff2" },
    ],
  );

  const merged = mergeBytesIntoManifest(
    { budgets: { "/mail": { maxCssBytes: 1, measuredFirstLoadJsBytes: 99 }, "/absent-from-capture": { maxCssBytes: 2 } } },
    {
      "/mail": { stylesheetBytes: 10, imageBytes: 20, fontBytes: 30, thirdPartyBytes: 40, documentBytes: 50 },
      "/not-in-manifest": { stylesheetBytes: 1, imageBytes: 1, fontBytes: 1, thirdPartyBytes: 1, documentBytes: 1 },
    },
  );
  check("only routes present in both the manifest and the capture are written", merged.touched, ["/mail"]);
  check("a measured JS figure owned by another script is not overwritten", merged.manifest.budgets["/mail"].measuredFirstLoadJsBytes, 99);
  check("an unmeasured route keeps its entry untouched", merged.manifest.budgets["/absent-from-capture"], { maxCssBytes: 2 });
  check("server payload is recorded from the document response", merged.manifest.budgets["/mail"].measuredServerPayloadBytes, 50);

  check("a React hydration warning is recognised", isHydrationMismatch("Warning: Text content did not match. Server: \"a\" Client: \"b\""), true);
  check("a hydration failure is recognised", isHydrationMismatch("Hydration failed because the server rendered HTML didn't match the client."), true);
  check("an unrelated console error is not counted as a hydration mismatch", isHydrationMismatch("Failed to fetch /api/thing"), false);

  const unusableFixture = findUnusableSamples([
    { content: { words: 60, brandedLoader: false, errorBoundary: false, url: "/ok" } },
    { content: { words: 3, brandedLoader: false, errorBoundary: false, url: "/thin" } },
    { content: { words: 90, brandedLoader: true, errorBoundary: false, url: "/loader" } },
    { content: { words: 90, brandedLoader: false, errorBoundary: true, url: "/boom" } },
  ]);
  check("a thin, loading or error-boundary render is refused as evidence", unusableFixture.map((u) => u.url), ["/thin", "/loader", "/boom"]);

  const summary = buildProfileSummary([
    { lcpMs: 1000, inpMs: 100, cls: 0, fcpMs: 900, ttfbMs: 200, longTaskMs: 30 },
    { lcpMs: 2000, inpMs: 300, cls: 0.2, fcpMs: 1800, ttfbMs: 600, longTaskMs: 90 },
  ]);
  check("a profile summary carries every gated metric plus the supplementary ones", Object.keys(summary).sort(), ["cls", "fcp", "inp", "lcp", "longTasks", "ttfb", "usedJsHeap"]);
  check("an all-null metric summarises to null rather than 0", buildProfileSummary([{ lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null, longTaskMs: null }]).lcp.p75_ms, null);

  if (failed) {
    console.error("\nSELF-TEST FAILED");
    process.exit(1);
  }
  console.log("\nSELF-TEST PASSED — percentiles, server-mode derivation, resource classification and byte accounting all behave");
}

if (SELF_TEST) selfTest();
else
  run().catch((err) => {
    console.error(`measure-web-vitals failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
