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
import { execFileSync, spawn } from "node:child_process";
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

const MIN_AUTHORIZED_NAV_LINKS = 3;
const OFF_ROUTE_RETRIES = 3;
const CDP_SEND_TIMEOUT_MS = 60_000;

/**
 * `lib/theme/app-themes.ts` defaults `DEFAULT_APP_THEME_MODE` to "light", and
 * `components/theme/app-theme-provider.tsx` consults the OS only when the viewer
 * has explicitly stored "system". Emulating `prefers-color-scheme: dark` alone
 * therefore measures the light theme while the log claims dark. The viewer's
 * choice lives in localStorage, so that is where the driver has to put it.
 */
const APP_THEME_MODE_STORAGE_KEY = "streamlineos-app-theme-mode";
const APP_THEME_MODES = ["light", "dark", "system"];

export function buildThemeInitScript(mode, storageKey = APP_THEME_MODE_STORAGE_KEY) {
  if (!APP_THEME_MODES.includes(mode))
    throw new Error(`unknown theme mode "${mode}" — expected one of ${APP_THEME_MODES.join(", ")}`);
  return `try { localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(mode)}); } catch {}`;
}

const MOBILE_PROFILE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  cpuThrottlingRate: 4,
  latencyMs: 150,
  downloadBps: 1_600_000 / 8,
  uploadBps: 750_000 / 8,
  /**
   * DevTools' own mobile emulation always sets the UA override — without it,
   * the browser keeps the desktop UA it launched with, so `Sec-CH-UA-Mobile`
   * is never sent as `?1` and the server cannot distinguish a mobile session
   * from a desktop one (it would always serve the desktop shell). This is a
   * fidelity fix to the instrument, not a budget change.
   */
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
 * An INP number alone cannot be acted on: 800 ms spent waiting for the main
 * thread, 800 ms spent in the handler and 800 ms spent painting are three
 * different defects with three different fixes. PerformanceEventTiming carries
 * the split, so the capture records it rather than making the reader guess.
 */
export function summariseInpPhases(samples) {
  const phases = samples.map((s) => s.inpPhases).filter((entry) => entry !== null && typeof entry === "object");
  if (!phases.length) return null;
  const p75 = (key) => {
    const value = summarise(phases.map((entry) => entry[key]))?.p75;
    return value === undefined || value === null ? null : Number(value.toFixed(1));
  };
  return {
    samples: phases.length,
    targets: [...new Set(phases.map((entry) => entry.target).filter((t) => typeof t === "string"))],
    // A tap fires pointerdown, pointerup and click; each does different work, so the phase split is
    // not actionable without knowing which one INP attributed the processing to.
    events: [...new Set(phases.map((entry) => entry.name).filter((n) => typeof n === "string"))],
    inputDelay_p75_ms: p75("inputDelayMs"),
    processing_p75_ms: p75("processingMs"),
    presentation_p75_ms: p75("presentationMs"),
  };
}

/**
 * A dev server compiles on demand and serves a different build id than the one
 * `next build` left on disk. Comparing the two is the only claim about server
 * mode this driver is entitled to make.
 */
/**
 * The shell renders its own error card when `/me/access` is refused, and its
 * copy is not "Something went wrong" — so a driver that only looks for that one
 * string files the error card as a good page and reports the error card's LCP
 * as the product's. Every string the shell can put on screen in place of the
 * app belongs here.
 */
export const SHELL_FAILURE_COPY = [
  "Something went wrong",
  "Couldn't load your organization",
  "An error occurred while loading this data",
];

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

/**
 * An authenticated route whose `/me/access` was refused still renders — as a
 * shell with no navigation, or as the shell's own error card. Its LCP, FCP and
 * INP are the refusal's, and they *flatter* the numbers because there is almost
 * nothing on the page to paint or to interact with. These budgets govern
 * authorized routes, so a capture that never saw an authorized shell is not
 * evidence for them in either direction.
 */
export function findUnauthorizedSamples(samples, minNavLinks = 3) {
  return samples
    .map((s, index) => ({ index, content: s.content ?? {} }))
    .filter(({ content }) => {
      if (content.authorizedShell === true) return false;
      if (content.authorizedShell === false) return true;
      return (content.navLinks ?? 0) < minNavLinks;
    })
    .map(({ index, content }) => ({
      index,
      url: content.url ?? null,
      authorizedShell: content.authorizedShell ?? null,
      navLinks: content.navLinks ?? 0,
      words: content.words ?? null,
    }));
}

/**
 * The driver asks for /mail and records whatever the tab ended up showing. When
 * the app signs itself out — `lib/api-client.ts` calls `signOut()` on a 401, so
 * one refused `/me/access` is enough — every navigation after that lands on
 * /signin, which paints in about 5ms and would be filed under /mail as a very
 * good LCP. A sample whose final path is not the route that was requested is
 * not a measurement of that route.
 */
export function findOffRouteSamples(samples) {
  return samples
    .map((s, index) => ({ index, requested: s.requestedRoute ?? null, url: s.content?.url ?? null }))
    .filter(({ requested, url }) => {
      if (!requested || !url) return false;
      try {
        return new URL(url).pathname !== requested;
      } catch {
        return true;
      }
    });
}

/** The commit this capture describes, or null when git cannot answer. Never throws. */
export function readReleaseSha(cwd = ROOT) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * A SHA describes committed code. Measured against an uncommitted working tree the SHA is a
 * half-truth, so record that too rather than letting the commit id imply more than it knows.
 */
export function workingTreeIsDirty(cwd = ROOT) {
  try {
    return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().length > 0;
  } catch {
    return null;
  }
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

/**
 * "First load" and "everything the tab pulled in the next second and a bit" are
 * not the same budget. Once the authorized shell renders, Next prefetches the
 * RSC payload and chunks for every in-view nav link, and the route's own
 * `next/dynamic` boundaries resolve — so a window that runs 1.2s past the load
 * event charges one route for other routes' chunks. Splitting on the load event
 * keeps `measuredScriptBytes` the route's own cost and records the speculative
 * tail beside it instead of inside it.
 */
export function splitByLoadPhase(entries) {
  return {
    firstLoad: entries.filter((e) => e.afterLoad !== true),
    afterLoad: entries.filter((e) => e.afterLoad === true),
  };
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
 * are listed rather than only totalled — and scripts are listed too, because
 * `measuredScriptBytes` is the budget that actually breaches on this app and a
 * total with no chunk names behind it cannot be acted on by anyone.
 */
export function itemiseBytes(entries, kinds, limit = 20) {
  return entries
    .filter((e) => kinds.includes(e.kind) || e.thirdParty)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit)
    .map(({ kind, thirdParty, bytes, url }) => ({ kind, thirdParty, bytes, url }));
}

/**
 * Fold a cold-cache byte pass into `contracts/route-bundle-manifest.json`.
 * `measuredFirstLoadJsBytes` is deliberately left alone — that field has a
 * different definition (gzip(9) over the route's client-reference manifest) and
 * `measure-route-bundles.mjs` owns it. Everything here is over-the-wire bytes.
 *
 * `measuredScriptBytes` exists because those two numbers are not the same one.
 * The client-reference manifest counts the chunks Next calls the route's first
 * load; the browser also fetches everything hydration then asks for. On this
 * app the second number is roughly twice the first, so a JS budget checked only
 * against the first is green while the user downloads far more than it allows.
 */
export function mergeBytesIntoManifest(manifest, bytesByRoute) {
  const updated = { ...manifest, budgets: { ...manifest.budgets } };
  const touched = [];
  for (const [route, totals] of Object.entries(bytesByRoute)) {
    const entry = updated.budgets[route];
    if (!entry) continue;
    updated.budgets[route] = {
      ...entry,
      measuredScriptBytes: totals.scriptBytes,
      measuredTotalBytes: totals.totalBytes,
      measuredCssBytes: totals.stylesheetBytes,
      measuredImageBytes: totals.imageBytes,
      measuredFontBytes: totals.fontBytes,
      measuredThirdPartyBytes: totals.thirdPartyBytes,
      measuredServerPayloadBytes: totals.documentBytes,
      measuredPostLoadScriptBytes: totals.postLoadTotals?.scriptBytes ?? null,
      measuredPostLoadTotalBytes: totals.postLoadTotals?.totalBytes ?? null,
    };
    touched.push(route);
  }
  return { manifest: updated, touched };
}

/**
 * TTFB measured inside the browser carries the emulated RTT and the browser's
 * own scheduling; on the mobile profile that is 150ms of RTT before the server
 * is even asked. The same request issued from Node against the same server,
 * unthrottled, is the server-render cost on its own — which is what decides
 * whether a TTFB breach belongs to the page, to the server render, or to the
 * profile. Recorded alongside, never instead of, the browser figure.
 */
export async function measureServerTtfb(baseUrl, routes, cookieHeader, repeat, fetchImpl = fetch) {
  const byRoute = {};
  for (const route of routes) {
    const samples = [];
    for (let i = 0; i < repeat; i++) {
      const started = performance.now();
      try {
        const res = await fetchImpl(`${baseUrl}${route}`, { headers: { cookie: cookieHeader }, redirect: "manual" });
        const reader = res.body?.getReader?.();
        if (reader) {
          await reader.read();
          await reader.cancel().catch(() => {});
        }
        samples.push({ ms: performance.now() - started, status: res.status });
      } catch {
        samples.push({ ms: null, status: null });
      }
    }
    const ms = samples.map((x) => x.ms).filter((v) => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
    byRoute[route] = {
      count: ms.length,
      statuses: [...new Set(samples.map((x) => x.status))],
      p50_ms: percentile(ms, 50),
      p75_ms: percentile(ms, 75),
      p95_ms: percentile(ms, 95),
    };
  }
  return byRoute;
}

/**
 * The app's own API origin lives in `NEXT_PUBLIC_API_URL`, which the driver's
 * shell does not have unless somebody exports it. Read it from the package's
 * own env file so first-party API traffic is not filed under "third party" —
 * that misclassification is what makes the third-party byte budget meaningless.
 */
export function readEnvValue(source, key) {
  for (const line of String(source ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * WAS THE HOST QUIET ENOUGH FOR THESE NUMBERS TO BE THE APPLICATION'S?
 *
 * The predecessor of this block stamped `loadAverage1m: 0` beside a note saying a 1m average above
 * the CPU count means the numbers are not the application's. Both were meaningless on this
 * platform: `os.loadavg()` is unimplemented on Windows and returns [0, 0, 0] always, so the guard
 * read "perfectly idle" while the host sat at 100% CPU under another session's servers and a user
 * browser. That capture recorded /build/my-work mobile INP at 1,844 ms against 38 ms on code that
 * had not changed. A 4x-throttled mobile profile on a saturated host measures the host.
 *
 * os.cpus() carries per-core cumulative tick counters on every platform, so a delta over a real
 * interval is a measurement rather than a constant. The baseline is taken BEFORE the browser
 * launches: it answers "was the host already busy before we added our own load?", which is the only
 * contention question a driver can honestly ask about load it did not create.
 */
export async function sampleCpuBusyPercent(windowMs) {
  const read = () => {
    let idle = 0;
    let total = 0;
    for (const core of cpus()) {
      for (const value of Object.values(core.times)) total += value;
      idle += core.times.idle;
    }
    return { idle, total };
  };
  const before = read();
  await sleep(windowMs);
  const after = read();
  const totalDelta = after.total - before.total;
  if (totalDelta <= 0) return null;
  const busy = 1 - (after.idle - before.idle) / totalDelta;
  return Number((Math.min(Math.max(busy, 0), 1) * 100).toFixed(1));
}

/**
 * The ceiling governs the PRE-LAUNCH baseline, not load during the run — the capture's own browser
 * is legitimately busy. 50% leaves the throttled mobile profile a full core of headroom on any
 * multi-core host while still refusing the saturated case that produced the 1,844 ms reading.
 */
export const HOST_BUSY_CEILING_PERCENT = 50;

/**
 * The bracketing readings cannot see a spike that starts and ends inside the run, and the run is
 * where a 4x-throttled mobile profile is most easily poisoned. This sampler runs throughout, so the
 * load profile across the capture is recorded rather than inferred from its endpoints.
 *
 * Our own load is inside these readings — one throttled renderer plus this process — so the ceiling
 * is deliberately higher than the pre-launch one rather than the same number reused. A capture is
 * refused on the MEDIAN, not on any single spike: one transient burst is normal on a real desktop,
 * a sustained majority-busy host is not.
 */
export const HOST_BUSY_DURING_RUN_CEILING_PERCENT = 75;

export function startHostSampler(intervalMs) {
  const samples = [];
  let stopped = false;
  const loop = async () => {
    while (!stopped) {
      const busy = await sampleCpuBusyPercent(intervalMs);
      if (!stopped && busy !== null) samples.push(busy);
    }
  };
  const done = loop();
  return {
    async stop() {
      stopped = true;
      await done;
      return samples;
    },
  };
}

/** Median of a numeric series; null for an empty one, so "no samples" cannot read as "quiet". */
export function medianBusy(samples) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Number(value.toFixed(1));
}

/** os.loadavg() returns [0, 0, 0] on Windows rather than failing, so a 0 there is unmeasured, not idle. */
export const LOADAVG_IS_MEASURED = process.platform !== "win32";

/** Pure, so the self-test drives it without a host. An unmeasured reading is a refusal, not a pass. */
export function contendedReadings(readings, ceilingPercent) {
  return readings.filter((r) => r.busyPercent === null || r.busyPercent > ceilingPercent);
}

/**
 * A CDP request has no deadline of its own, and `Runtime.evaluate` with
 * `awaitPromise` resolves only when the page's promise does. A renderer that
 * never settles therefore parks the driver forever: this run's predecessor sat
 * on `/build/inbox` for 2h31m at 0% CPU, having produced 10 of 24 route/profile
 * pairs, and the only evidence of the stall was a log that stopped. A capture
 * that hangs is worse than one that fails, because it looks like it is working.
 */
export function withDeadline(promise, ms, label) {
  let timer = null;
  const deadline = new Promise((_res, rej) => {
    timer = setTimeout(() => rej(new Error(`${label} did not answer within ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
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
    const answered = new Promise((res, rej) => {
      pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    return withDeadline(answered, CDP_SEND_TIMEOUT_MS, `CDP ${method}`).catch((err) => {
      pending.delete(id);
      throw err;
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
  const state = { lcp: null, cls: 0, inp: null, inpPhases: null, longTaskMs: 0, shifts: [], lastMutationMs: performance.now(), mutationObserverAttached: false };
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return 'unknown';
    const id = node.id ? '#' + node.id : '';
    const cls = typeof node.className === 'string' && node.className ? '.' + node.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
    return (node.tagName || '?').toLowerCase() + id + cls;
  };
  Object.defineProperty(window, '__slVitals', { value: state });
  try {
    new MutationObserver(() => { state.lastMutationMs = performance.now(); }).observe(document, {
      subtree: true, childList: true, characterData: true, attributes: true,
    });
    state.mutationObserverAttached = true;
  } catch {}
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
      for (const e of l.getEntries()) {
        if (!e.interactionId) continue;
        if (state.inp !== null && e.duration <= state.inp) continue;
        state.inp = e.duration;
        state.inpPhases = {
          name: e.name,
          target: describe(e.target),
          inputDelayMs: Number((e.processingStart - e.startTime).toFixed(1)),
          processingMs: Number((e.processingEnd - e.processingStart).toFixed(1)),
          presentationMs: Number((e.startTime + e.duration - e.processingEnd).toFixed(1)),
        };
      }
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
    // Ensure no mobile UA override carries over from a prior mobile run.
    await cdp.send("Emulation.setUserAgentOverride", { userAgent: "" }).catch(() => {});
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
  // Set a real mobile Chrome UA so the browser sends Sec-CH-UA-Mobile: ?1 and
  // the server can select the correct shell variant. DevTools' own device
  // emulation always applies the UA; without it the session appears as a desktop
  // browser and receives the desktop shell regardless of the device metrics.
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: MOBILE_PROFILE.userAgent,
    userAgentMetadata: MOBILE_PROFILE.userAgentMetadata,
  });
}

/**
 * A capture that samples before the app's data arrives cannot see what that data
 * does to the layout. The 2026-09-02 pass recorded a `/dashboard` of 140 words
 * and a CLS of 0.000; the 2026-09-03 pass recorded 990 words on the same route
 * and 0.175-0.233 per sample. Same build, same budget, opposite verdict — the
 * difference was whether the page had finished arriving when the sample was
 * taken. A fixed sleep decides that by luck and by host load.
 *
 * So the driver waits for the DOM to go quiet instead: `quietMs` with no
 * mutation, and never longer than `capMs`, which keeps a page that animates
 * forever from parking the run. Whether the cap was hit is recorded on the
 * sample rather than hidden, because a capped sample is one that may not have
 * finished.
 */
export function shouldKeepWaitingForQuiet({ sinceLastMutationMs, elapsedMs, quietMs, capMs }) {
  if (elapsedMs >= capMs) return false;
  return sinceLastMutationMs < quietMs;
}

async function settle(cdp, quietMs, capMs) {
  const startedAt = Date.now();
  let sinceLastMutationMs = 0;
  for (;;) {
    const elapsedMs = Date.now() - startedAt;
    sinceLastMutationMs = Number(
      (await evaluate(
        cdp,
        "(() => { const s = window.__slVitals; if (!s || !s.mutationObserverAttached) return 1e9; return performance.now() - s.lastMutationMs; })()",
      )) ?? 0,
    );
    if (!shouldKeepWaitingForQuiet({ sinceLastMutationMs, elapsedMs, quietMs, capMs })) {
      return { ms: Date.now() - startedAt, capped: elapsedMs >= capMs, quietMs, capMs };
    }
    await sleep(100);
  }
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
  /*
   * The probe click on mobile /chat lands on "Search conversations" at the very
   * bottom of a 390x844 viewport and opens a second browser tab. The measured
   * tab then reports visibilityState "hidden", and a hidden document emits no
   * paint timing at all — so every navigation after it recorded ttfb but
   * fcp/lcp null. Reproduced deterministically at mobile /chat sample 2 on two
   * consecutive runs, and fixed by taking the tab back.
   */
  await cdp.send("Page.bringToFront").catch(() => {});
  return { interacted: true, selector: target.selector };
}

/**
 * Perceived responsiveness: the time between a navigation intent and the first
 * thing the user can see change. A route transition that paints a skeleton in
 * 40ms and finishes in 900ms feels responsive; one that shows nothing for 600ms
 * does not, at the same total. Measured as click -> first DOM mutation, in the
 * page, so the two timestamps share a clock.
 */
async function measureIntentToFeedback(cdp, currentPath) {
  const raw = await evaluate(
    cdp,
    `(async () => {
      const here = ${JSON.stringify(currentPath)};
      const link = Array.from(document.querySelectorAll('a.nav-item[href^="/"], nav a[href^="/"]'))
        .find((a) => {
          const href = a.getAttribute('href');
          if (!href || href === here || href.startsWith('#')) return false;
          const r = a.getBoundingClientRect();
          return r.width > 4 && r.height > 4 && r.top >= 0 && r.bottom <= innerHeight;
        });
      if (!link) return JSON.stringify({ measured: false, reason: 'no in-app link in view' });
      const state = { t0: 0, firstMs: null };
      const observer = new MutationObserver(() => {
        if (state.firstMs === null && state.t0 > 0) state.firstMs = performance.now() - state.t0;
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      state.t0 = performance.now();
      link.click();
      await new Promise((r) => setTimeout(r, 1500));
      observer.disconnect();
      return JSON.stringify({ measured: state.firstMs !== null, ms: state.firstMs, href: link.getAttribute('href') });
    })()`,
  );
  try {
    return JSON.parse(raw ?? '{"measured":false}');
  } catch {
    return { measured: false, reason: "probe did not return" };
  }
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
        visibilityState: document.visibilityState,
        words: (document.body?.innerText ?? '').trim().split(/\\s+/).filter(Boolean).length,
        brandedLoader: !!document.querySelector('[data-app-loading-screen]') || (document.body?.innerText ?? '').includes('Syncing organization'),
        errorBoundary: ${JSON.stringify(SHELL_FAILURE_COPY)}.some((needle) => (document.body?.innerText ?? '').includes(needle)),
        authorizedShell: !!document.querySelector('main#dashboard-content'),
        navLinks: new Set(Array.from(document.querySelectorAll('a.nav-item[href^="/"], nav a[href^="/"]')).map((a) => a.getAttribute('href'))).size
      })`,
    )) ?? "{}",
  );
  /**
   * `usedJSHeapSize` read without a collection counts uncollected garbage, so a
   * heap that climbs across navigations proves nothing on its own. Asking the
   * renderer to collect first makes the number a retention figure: what the
   * page is still holding, not what it has not got round to freeing.
   */
  await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
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
    inpPhases: vitals.inpPhases ?? null,
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
  let loaded = false;
  cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
    const url = response?.url ?? "";
    byRequest.set(requestId, { ...classifyResource({ type, url, baseOrigin, firstPartyOrigins }), url: url.slice(0, 200) });
  });
  cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    const meta = byRequest.get(requestId);
    if (!meta) return;
    entries.push({ ...meta, bytes: encodedDataLength ?? 0, afterLoad: loaded });
  });
  cdp.on("Page.loadEventFired", () => {
    loaded = true;
  });
  return {
    reset() {
      byRequest.clear();
      entries = [];
      loaded = false;
    },
    totals() {
      const { firstLoad, afterLoad } = splitByLoadPhase(entries);
      const firstLoadTotals = summariseBytes(firstLoad);
      return {
        ...firstLoadTotals,
        windowTotals: summariseBytes(entries),
        postLoadTotals: summariseBytes(afterLoad),
        notableResources: itemiseBytes(firstLoad, ["image", "font"]),
        largestScripts: itemiseBytes(
          firstLoad.filter((e) => e.kind === "script"),
          ["script"],
          25,
        ),
        largestPostLoadScripts: itemiseBytes(
          afterLoad.filter((e) => e.kind === "script"),
          ["script"],
          15,
        ),
      };
    },
  };
}

async function run() {
  const baseUrl = flag("base-url", "http://localhost:1000").replace(/\/$/, "");
  const routes = flag("routes", "/mail,/inbox,/dashboard").split(",").map((r) => r.trim()).filter(Boolean);
  const byteOnlyRoutes = flag("byte-routes", "").split(",").map((r) => r.trim()).filter(Boolean);
  const writeManifest = argv.includes("--write-manifest");
  const repeat = Number(flag("repeat", "10"));
  const out = resolve(process.cwd(), flag("out", join(ROOT, ".browser-driver-results.json")));
  const timeoutMs = Number(flag("timeout", "30000"));
  const settleQuietMs = Number(flag("settle-quiet", "500"));
  const settleCapMs = Number(flag("settle-cap", "6000"));
  const debugPort = Number(flag("debug-port", "9224"));
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const themeMode = flag("theme", "light");
  const themeInitScript = buildThemeInitScript(themeMode);
  const browserPath = findBrowser(flag("browser", ""));

  if (!browserPath) throw new Error(`no browser found — pass --browser=<path>. Tried: ${BROWSER_CANDIDATES.join(", ")}`);
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file=<path> is required; these budgets govern authenticated routes");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();

  const baseOrigin = new URL(baseUrl).origin;
  const envFile = join(ROOT, ".env");
  const envApiUrl = existsSync(envFile) ? readEnvValue(readFileSync(envFile, "utf8"), "NEXT_PUBLIC_API_URL") : "";
  const firstPartyOrigins = flag("first-party-origins", process.env.NEXT_PUBLIC_API_URL || envApiUrl)
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

  const busyBeforeLaunch = await sampleCpuBusyPercent(1000);
  const hostSampler = startHostSampler(2000);

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
      /*
       * A throttled renderer stops emitting paint timing. On a contended host
       * the 2026-09-03 run lost first-contentful-paint from mobile /chat
       * onwards — six routes recorded `fcp=n/a lcp=n/a` while still reporting
       * navigation timing, which reads as a measurement and is not one.
       */
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-background-timer-throttling",
    ],
    { stdio: "pipe" },
  );

  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);
  log(`browser ${browserPath}`);
  log(`base ${baseUrl} · routes ${routes.join(", ")} · repeat ${repeat}`);
  log(`serverMode resolved to "${serverMode}" (build id on disk: ${buildIdOnDisk || "none"})`);

  const byProfile = {};
  const byRoute = {};
  const bytesByRoute = {};
  const intentByRoute = {};
  const allSamples = [];
  const hydrationFindings = [];
  const routeFailures = [];
  const cappedSettles = [];

  try {
    await waitForDevTools(debugPort, 15_000);
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");
    const cdp = await cdpSession(page.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("HeapProfiler.enable").catch(() => {});
    await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: themeInitScript });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: VITALS_SCRIPT });
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: themeMode === "dark" ? "dark" : "light" }],
    });

    const bytes = attachByteRecorder(cdp, baseOrigin, firstPartyOrigins);
    const consoleLog = attachConsoleRecorder(cdp);

    for (const profile of ["desktop", "mobile"]) {
      await applyProfile(cdp, profile);
      const profileSamples = [];

      for (const route of routes) {
        try {
          const url = `${baseUrl}${route}`;

          // Cold-cache pass: the route bundle budgets are first-load figures.
          if (profile === "desktop") {
            await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
            await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
            bytes.reset();
            await navigate(cdp, url, timeoutMs);
            await sleep(1200);
            const landed = await evaluate(cdp, "location.pathname");
            if (landed === route) bytesByRoute[route] = bytes.totals();
            else log(`[bytes] ${route} DISCARDED — landed on ${String(landed)}; byte totals for another page are not this route's`);
            await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
          }

          // Discarded warm-up so the first measured navigation is not paying for
          // a cold Next.js route module or a cold connection pool.
          await navigate(cdp, url, timeoutMs);
          await sleep(800);

          const routeSamples = [];
          for (let i = 0; i < repeat; i++) {
            let sample = null;
            let probeInteraction = null;
            // The app calls signOut() on a refused /me/access, so a navigation can
            // land on /signin through no fault of the route. Restore the session
            // and re-measure rather than record the sign-in page as this route —
            // bounded, and every remaining off-route sample still fails the run.
            let settled = null;
            for (let attempt = 1; attempt <= OFF_ROUTE_RETRIES; attempt++) {
              consoleLog.reset();
              await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
              await navigate(cdp, url, timeoutMs);
              settled = await settle(cdp, settleQuietMs, settleCapMs);
              probeInteraction = await interact(cdp);
              sample = await collectSample(cdp);
              sample.requestedRoute = route;
              sample.attempts = attempt;
              if (findOffRouteSamples([sample]).length === 0) break;
            }
            sample.interaction = probeInteraction;
            sample.settle = settled;
            if (settled?.capped) cappedSettles.push({ route, profile, sample: i });
            const mismatches = consoleLog.hydrationMismatches();
            if (mismatches.length > 0) hydrationFindings.push({ route, profile, sample: i, messages: mismatches.slice(0, 3) });
            routeSamples.push(sample);
            profileSamples.push(sample);
            allSamples.push(sample);
            log(
              `[${profile}] ${route} ${i + 1}/${repeat} ttfb=${sample.ttfbMs?.toFixed(0) ?? "n/a"} fcp=${sample.fcpMs?.toFixed(0) ?? "n/a"} ` +
                `lcp=${sample.lcpMs?.toFixed(0) ?? "n/a"} inp=${sample.inpMs?.toFixed(0) ?? "n/a"} cls=${sample.cls?.toFixed(3) ?? "n/a"} ` +
                `words=${sample.content?.words ?? "?"} loader=${sample.content?.brandedLoader ?? "?"} ` +
                `settle=${settled ? `${settled.ms}ms${settled.capped ? " CAPPED" : ""}` : "n/a"}`,
            );
            await sleep(300);
          }
          const intent = await measureIntentToFeedback(cdp, route);
          intentByRoute[route] ??= {};
          intentByRoute[route][profile] = intent;
          log(`[${profile}] ${route} intent->first paint change ${intent.measured ? `${Math.round(intent.ms)}ms via ${intent.href}` : `not measured (${intent.reason ?? "no link"})`}`);

          byRoute[route] ??= {};
          byRoute[route][profile] = {
            ...buildProfileSummary(routeSamples),
            /*
             * INP only exists when an interaction was recorded, and the observer's
             * durationThreshold is 16ms. A null INP on a route the probe DID click
             * means nothing there was slow enough to record; a null INP on a route
             * the probe could not click at all is an unmeasured budget. Only the
             * capture knows which, so it says.
             */
            interactions: {
              samples: routeSamples.length,
              performed: routeSamples.filter((sample) => sample.interaction?.interacted === true).length,
              /*
               * WHICH control the probe clicked. Without this an INP number is not
               * actionable: the selector list is ordered and falls through, so two
               * routes can report wildly different INP because they were clicked on
               * different controls, and a reader cannot tell that from the number.
               */
              selectors: [...new Set(routeSamples.map((sample) => sample.interaction?.selector).filter((sel) => typeof sel === "string"))],
              inpPhases: summariseInpPhases(routeSamples),
            },
          };
          byRoute[route][`${profile}Content`] = routeSamples.at(-1)?.content ?? null;
          const worstShift = routeSamples.flatMap((s) => s.shifts).sort((a, b) => b.value - a.value).slice(0, 5);
          if (worstShift.length > 0) byRoute[route][`${profile}LayoutShifts`] = worstShift;
        } catch (err) {
          routeFailures.push({ route, profile, error: String(err?.message ?? err) });
          log(`[${profile}] ${route} ABORTED — ${String(err?.message ?? err)}`);
        }
      }
      byProfile[profile] = buildProfileSummary(profileSamples);

      if (profile === "desktop" && byteOnlyRoutes.length > 0) {
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        for (const route of byteOnlyRoutes) {
          await cdp.send("Network.setCookie", { name: cookieName, value: cookieValue, url: baseUrl, httpOnly: true, path: "/" });
          bytes.reset();
          await navigate(cdp, `${baseUrl}${route}`, timeoutMs);
          await sleep(1200);
          const landed = await evaluate(cdp, "location.pathname");
          if (landed !== route) {
            log(`[bytes] ${route} DISCARDED — landed on ${String(landed)}`);
            continue;
          }
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
    // Windows holds Chrome's profile open briefly after SIGKILL and `force` suppresses ENOENT, not
    // EPERM — so an un-caught rmSync here throws out of `finally` and discards a completed capture.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        rmSync(userDataDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) log(`could not remove ${userDataDir}: ${error.message} — continuing`);
        else await sleep(400);
      }
    }
  }

  const busyDuringRun = await hostSampler.stop();
  const busyAfterCapture = await sampleCpuBusyPercent(1000);
  const hostReadings = [
    { when: "beforeLaunch", busyPercent: busyBeforeLaunch },
    { when: "afterCapture", busyPercent: busyAfterCapture },
  ];
  const busyDuringRunMedian = medianBusy(busyDuringRun);
  const hostContended = [
    ...contendedReadings(hostReadings, HOST_BUSY_CEILING_PERCENT),
    ...contendedReadings(
      [{ when: "duringRun (median)", busyPercent: busyDuringRunMedian }],
      HOST_BUSY_DURING_RUN_CEILING_PERCENT,
    ),
  ];

  const serverTtfb = await measureServerTtfb(baseUrl, routes, `${cookieName}=${cookieValue}`, repeat);
  for (const [route, t] of Object.entries(serverTtfb))
    log(`[server] ${route} ttfb p50=${t.p50_ms?.toFixed(0) ?? "n/a"} p75=${t.p75_ms?.toFixed(0) ?? "n/a"} p95=${t.p95_ms?.toFixed(0) ?? "n/a"} statuses=${t.statuses.join(",")}`);

  const unusable = findUnusableSamples(allSamples);
  const offRoute = findOffRouteSamples(allSamples);
  const unauthorized = findUnauthorizedSamples(allSamples, MIN_AUTHORIZED_NAV_LINKS);

  const result = {
    generatedAtMs: Date.now(),
    generatedAt: new Date().toISOString(),
    baseUrl,
    targetUrl: baseUrl,
    serverMode,
    buildId: buildIdOnDisk,
    // The commit this capture describes. `buildId` is the subject test the consumer FAILS on —
    // Next mints a fresh one per build, so equality means the .next on disk is the measured build.
    // This is here so the consumer can NAME the commits that landed since, the way
    // check-benchmark-manifest.mjs does; a capture without it reports staleness as UNKNOWN rather
    // than assuming it is current.
    releaseSha: readReleaseSha(),
    releaseDirty: workingTreeIsDirty(),
    repeat,
    authenticatedRoutes: routes,
    desktop: byProfile.desktop,
    mobile: byProfile.mobile,
    byRoute,
    firstLoadBytesByRoute: bytesByRoute,
    serverTtfb: {
      method: "plain Node fetch to first response byte, no browser, no CPU or network emulation",
      repeat,
      byRoute: serverTtfb,
      note: "The browser TTFB above includes the emulated RTT (150ms on the mobile profile) and the browser's own scheduling. This figure is the server render on its own.",
    },
    perceivedResponsiveness: {
      target_ms: 100,
      method: "in-page click on an in-app nav link, timed to the first DOM mutation on the same clock",
      byRoute: intentByRoute,
    },
    authorization: {
      discriminator: "main#dashboard-content presence (primary); nav-link count is corroborating evidence and the fallback for captures predating this field",
      minNavLinksForAuthorizedShell: MIN_AUTHORIZED_NAV_LINKS,
      samplesMeasured: allSamples.length,
      unauthorizedSamples: unauthorized,
      verdict:
        unauthorized.length === 0
          ? "every measured sample rendered an authorized shell"
          : "capture is NOT evidence for these budgets: the shell rendered without authorized navigation",
    },
    routeFailures: {
      count: routeFailures.length,
      failures: routeFailures,
      verdict:
        routeFailures.length === 0
          ? "every requested route/profile pair completed"
          : "these route/profile pairs produced no measurement and are absent from byRoute",
    },
    hydration: {
      navigationsInspected: allSamples.length,
      mismatchesFound: hydrationFindings.length,
      findings: hydrationFindings.slice(0, 10),
      verdict: hydrationFindings.length === 0 ? "no React hydration mismatch was logged on any measured navigation" : "hydration mismatches logged",
    },
    contentAssertion: {
      minWordsPerSample: 10,
      samplesMeasured: allSamples.length,
      offRouteSamples: offRoute,
      unusableSamples: unusable,
      verdict: unusable.length === 0 ? "every measured sample rendered real page content" : "capture is NOT usable evidence",
    },
    settle: {
      quietMs: settleQuietMs,
      capMs: settleCapMs,
      samplesMeasured: allSamples.length,
      cappedSamples: cappedSettles.length,
      capped: cappedSettles.slice(0, 20),
      wordsByRoute: Object.fromEntries(
        Object.entries(byRoute).map(([route, entry]) => [
          route,
          { desktop: entry.desktopContent?.words ?? null, mobile: entry.mobileContent?.words ?? null },
        ]),
      ),
      verdict:
        cappedSettles.length === 0
          ? "every sample was taken after the DOM went quiet, so late-arriving data is inside the measurement"
          : "some samples hit the settle cap and may have been taken before the page finished arriving — read their CLS as a floor",
    },
    hostContention: {
      ceilingPercent: HOST_BUSY_CEILING_PERCENT,
      method: "os.cpus() idle/total tick deltas over a 1000ms window; the baseline is taken before the browser launches, the second reading after it exits",
      cpuCount: cpus().length,
      busyPercentBeforeLaunch: busyBeforeLaunch,
      busyPercentAfterCapture: busyAfterCapture,
      busyPercentDuringRun: {
        ceilingPercent: HOST_BUSY_DURING_RUN_CEILING_PERCENT,
        samples: busyDuringRun.length,
        median: busyDuringRunMedian,
        min: busyDuringRun.length > 0 ? Math.min(...busyDuringRun) : null,
        max: busyDuringRun.length > 0 ? Math.max(...busyDuringRun) : null,
        note: "includes this capture's own browser and driver, so its ceiling is higher than the pre-launch one; judged on the median so a single transient burst does not refuse a good run",
      },
      contendedReadings: hostContended,
      verdict:
        hostContended.length === 0
          ? "the host was quiet enough for these timings to be the application's"
          : "capture is NOT evidence for timing budgets: the host was contended, and a throttled profile on a contended host measures the host",
    },
    conditions: {
      driver: "frontend/scripts/measure-web-vitals.mjs",
      desktop: "1440x900, no CPU or network throttling",
      mobile: `${MOBILE_PROFILE.width}x${MOBILE_PROFILE.height}@${MOBILE_PROFILE.deviceScaleFactor}x, 4x CPU, 1.6 Mbps down / 750 Kbps up, 150ms RTT`,
      authMethod: "minted NextAuth session cookie, set once via CDP and reused for every navigation",
      themeMode,
      themeNote:
        `The app reads its theme from localStorage["${APP_THEME_MODE_STORAGE_KEY}"] and falls back to ` +
        `DEFAULT_APP_THEME_MODE ("light"), consulting prefers-color-scheme only when the stored value is ` +
        `"system". This run wrote "${themeMode}" into that key before every document, so the emulated media ` +
        `feature and the rendered theme agree; emulating prefers-color-scheme alone would have measured light ` +
        `while claiming dark.`,
      firstPartyOrigins: [baseOrigin, ...firstPartyOrigins],
      cache: "vitals navigations run with the HTTP cache enabled after one discarded warm-up; firstLoadBytesByRoute is a separate cache-disabled pass",
      serverModeDerivation: "the build id in the served HTML is compared against .next/BUILD_ID; it is not asserted by this driver",
      host: {
        cpuCount: cpus().length,
        loadAverage1m: LOADAVG_IS_MEASURED ? Number(loadavg()[0].toFixed(2)) : null,
        loadAverageNote: LOADAVG_IS_MEASURED
          ? "os.loadavg() is implemented on this platform."
          : "os.loadavg() is NOT implemented on this platform and returns 0 — recorded as null rather than as an idle host. Read hostContention instead.",
        note: "A throttled mobile profile on a contended host measures the host. hostContention carries the measured figure this run was judged on.",
      },
    },
  };

  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  log(`wrote ${out}`);

  // The byte pass carries its own landed-path guard, so it is a valid
  // measurement even when the vitals half of the run is refused. Losing it to
  // an unrelated refusal is how a manifest ends up with stale measured bytes.
  if (writeManifest) {
    const manifestPath = join(ROOT, "contracts", "route-bundle-manifest.json");
    const current = JSON.parse(readFileSync(manifestPath, "utf8"));
    const { manifest, touched } = mergeBytesIntoManifest(current, bytesByRoute);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    log(`recorded CSS/image/font/third-party/server-payload bytes for ${touched.join(", ")} in ${manifestPath}`);
  }

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

  if (offRoute.length > 0) {
    console.error(
      `\nREFUSED as evidence: ${offRoute.length}/${allSamples.length} sample(s) were measured on a page other than ` +
        `the route requested. The commonest cause is the app signing itself out after a refused /me/access, which ` +
        `sends every later navigation to /signin — a page that paints in milliseconds and would otherwise be ` +
        `recorded as the route's own LCP.`,
    );
    for (const o of offRoute.slice(0, 8)) console.error(`  sample ${o.index} requested ${o.requested} but measured ${o.url}`);
    process.exitCode = 1;
    return;
  }

  if (unauthorized.length > 0) {
    console.error(
      `\nREFUSED as evidence: ${unauthorized.length}/${allSamples.length} sample(s) did not render ` +
        `the authorized shell marker (main#dashboard-content). These budgets govern AUTHORIZED routes; a shell ` +
        `whose /me/access was refused paints almost nothing, so its LCP, FCP and INP flatter the product. ` +
        `The numbers were still written to ${out} for diagnosis.`,
    );
    for (const u of unauthorized.slice(0, 8)) console.error(`  sample ${u.index} ${u.url ?? "?"} navLinks=${u.navLinks} words=${u.words}`);
    process.exitCode = 1;
    return;
  }

}

async function selfTest() {
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
    "a CDP request that never answers is turned into an error rather than an unbounded wait",
    await withDeadline(new Promise(() => {}), 20, "CDP Runtime.evaluate").then(
      () => "resolved",
      (err) => err.message,
    ),
    "CDP Runtime.evaluate did not answer within 20ms",
  );
  check(
    "a request that answers inside its deadline is untouched",
    await withDeadline(Promise.resolve("value"), 1000, "CDP Page.navigate"),
    "value",
  );

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

  check(
    "the largest scripts are itemised too, so a measuredScriptBytes breach names its chunks",
    itemiseBytes(
      [
        { kind: "script", thirdParty: false, bytes: 900, url: "/a.js" },
        { kind: "script", thirdParty: false, bytes: 100, url: "/b.js" },
        { kind: "image", thirdParty: false, bytes: 300, url: "/c.png" },
      ].filter((e) => e.kind === "script"),
      ["script"],
      25,
    ).map((e) => e.url),
    ["/a.js", "/b.js"],
  );
  check("itemiseBytes honours its limit", itemiseBytes([
    { kind: "script", thirdParty: false, bytes: 3, url: "/a.js" },
    { kind: "script", thirdParty: false, bytes: 2, url: "/b.js" },
    { kind: "script", thirdParty: false, bytes: 1, url: "/c.js" },
  ], ["script"], 2).length, 2);

  check(
    "a theme choice is written to the key the app actually reads, not left to prefers-color-scheme",
    buildThemeInitScript("dark"),
    'try { localStorage.setItem("streamlineos-app-theme-mode", "dark"); } catch {}',
  );
  check(
    "an unknown theme mode is refused rather than silently measured as light",
    (() => {
      try {
        buildThemeInitScript("midnight");
        return "accepted";
      } catch {
        return "refused";
      }
    })(),
    "refused",
  );

  check(
    "the load event splits a route's own first load from what the shell prefetched afterwards",
    splitByLoadPhase([
      { url: "/a.js", afterLoad: false },
      { url: "/b.js", afterLoad: true },
      { url: "/c.js" },
    ]),
    { firstLoad: [{ url: "/a.js", afterLoad: false }, { url: "/c.js" }], afterLoad: [{ url: "/b.js", afterLoad: true }] },
  );
  check(
    "post-load bytes are summed separately rather than charged to the route's first load",
    summariseBytes(
      splitByLoadPhase([
        { kind: "script", thirdParty: false, bytes: 100, afterLoad: false },
        { kind: "script", thirdParty: false, bytes: 900, afterLoad: true },
      ]).firstLoad,
    ).scriptBytes,
    100,
  );

  const merged = mergeBytesIntoManifest(
    { budgets: { "/mail": { maxCssBytes: 1, measuredFirstLoadJsBytes: 99 }, "/absent-from-capture": { maxCssBytes: 2 } } },
    {
      "/mail": { stylesheetBytes: 10, imageBytes: 20, fontBytes: 30, thirdPartyBytes: 40, documentBytes: 50, scriptBytes: 60, totalBytes: 210, postLoadTotals: { scriptBytes: 7, totalBytes: 11 } },
      "/not-in-manifest": { stylesheetBytes: 1, imageBytes: 1, fontBytes: 1, thirdPartyBytes: 1, documentBytes: 1, scriptBytes: 1, totalBytes: 7 },
    },
  );
  check("the speculative tail is recorded beside the first load, never inside it", merged.manifest.budgets["/mail"].measuredPostLoadScriptBytes, 7);
  check("only routes present in both the manifest and the capture are written", merged.touched, ["/mail"]);
  check("a measured JS figure owned by another script is not overwritten", merged.manifest.budgets["/mail"].measuredFirstLoadJsBytes, 99);
  check("an unmeasured route keeps its entry untouched", merged.manifest.budgets["/absent-from-capture"], { maxCssBytes: 2 });
  check("server payload is recorded from the document response", merged.manifest.budgets["/mail"].measuredServerPayloadBytes, 50);
  check("the JS the browser actually downloaded is recorded beside the chunk-manifest figure", merged.manifest.budgets["/mail"].measuredScriptBytes, 60);
  check("total first-load bytes are recorded", merged.manifest.budgets["/mail"].measuredTotalBytes, 210);

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

  const phaseFixture = [
    { inpPhases: { name: "pointerdown", target: "button#fab", inputDelayMs: 40, processingMs: 500, presentationMs: 60 } },
    { inpPhases: { name: "pointerup", target: "button#fab", inputDelayMs: 60, processingMs: 700, presentationMs: 80 } },
    { inpPhases: null },
  ];
  const phases = summariseInpPhases(phaseFixture);
  check("an INP number is split into the three phases the spec defines", Object.keys(phases).sort(), ["events", "inputDelay_p75_ms", "presentation_p75_ms", "processing_p75_ms", "samples", "targets"]);
  check("a sample that recorded no interaction is dropped rather than counted as zero", phases.samples, 2);
  check("the phase split names the element that was clicked", phases.targets, ["button#fab"]);
  check("the phase split names which event carried the cost, not just which element", phases.events, ["pointerdown", "pointerup"]);
  check("the dominant phase is visible in the split", phases.processing_p75_ms, 650);
  check("a route where nothing was ever clicked reports no split at all", summariseInpPhases([{ inpPhases: null }]), null);

  check(
    "the shell's own access-failure card is refused, not recorded as a good page",
    findUnusableSamples([
      { content: { words: 40, brandedLoader: false, errorBoundary: true, url: "/dashboard" } },
      { content: { words: 40, brandedLoader: false, errorBoundary: false, url: "/ok" } },
    ]).map((u) => u.url),
    ["/dashboard"],
  );
  check(
    "the shell failure copy covers the access-failure card, not just the generic boundary",
    SHELL_FAILURE_COPY.includes("Couldn't load your organization"),
    true,
  );

  check(
    "a sample measured on /signin is not recorded as the route that was requested",
    findOffRouteSamples([
      { requestedRoute: "/mail", content: { url: "http://localhost:1002/mail" } },
      { requestedRoute: "/mail", content: { url: "http://localhost:1002/signin?callbackUrl=%2Fmail" } },
      { requestedRoute: "/dashboard", content: { url: "http://localhost:1002/dashboard" } },
    ]).map((o) => o.url),
    ["http://localhost:1002/signin?callbackUrl=%2Fmail"],
  );

  check(
    "a shell with no authorized navigation is refused as evidence",
    findUnauthorizedSamples(
      [
        { content: { navLinks: 41, url: "/dashboard", words: 300 } },
        { content: { navLinks: 0, url: "/mail", words: 13 } },
        { content: { navLinks: 2, url: "/inbox", words: 22 } },
      ],
      3,
    ).map((u) => u.url),
    ["/mail", "/inbox"],
  );
  check(
    "an authorized shell is not refused",
    findUnauthorizedSamples([{ content: { navLinks: 41, url: "/dashboard" } }], 3).length,
    0,
  );
  check(
    "an access-refused shell (no marker, 0 nav links) is still refused",
    findUnauthorizedSamples([{ content: { authorizedShell: false, navLinks: 0, url: "/dashboard" } }], 3).length,
    1,
  );
  check(
    "a legitimate chat mobile shell (marker present, 1 nav link) is accepted",
    findUnauthorizedSamples([{ content: { authorizedShell: true, navLinks: 1, url: "/chat" } }], 3).length,
    0,
  );
  check(
    "a shell with the marker but zero nav links is accepted — authorized shell rendered, navigation intentionally hidden (open conversation)",
    findUnauthorizedSamples([{ content: { authorizedShell: true, navLinks: 0, url: "/chat" } }], 3).length,
    0,
  );

  check("the median of an empty series is null, so no samples cannot read as a quiet host", medianBusy([]), null);
  check("the median of an odd series is its middle value", medianBusy([10, 90, 20]), 20);
  check("the median of an even series averages the middle pair", medianBusy([10, 20, 30, 90]), 25);
  check(
    "one transient burst does not refuse a run whose median is quiet",
    contendedReadings([{ when: "duringRun (median)", busyPercent: medianBusy([12, 14, 99, 15]) }], 75).length,
    0,
  );
  check(
    "a sustained busy host during the run is refused",
    contendedReadings([{ when: "duringRun (median)", busyPercent: medianBusy([88, 91, 76, 95]) }], 75).length,
    1,
  );
  const sampler = startHostSampler(60);
  await sleep(260);
  const sampled = await sampler.stop();
  check("the background sampler collects a series across the run", sampled.length >= 2, true);
  check(
    "a quiet host produces no contended reading",
    contendedReadings([{ when: "beforeLaunch", busyPercent: 6.2 }, { when: "afterCapture", busyPercent: 9.1 }], 50).length,
    0,
  );
  check(
    "the saturated host that produced the 1,844ms INP reading is refused",
    contendedReadings([{ when: "beforeLaunch", busyPercent: 100 }, { when: "afterCapture", busyPercent: 98 }], 50).map((r) => r.when),
    ["beforeLaunch", "afterCapture"],
  );
  check(
    "a host that could not be measured is refused rather than read as idle",
    contendedReadings([{ when: "beforeLaunch", busyPercent: null }], 50).length,
    1,
  );
  check(
    "the ceiling is exclusive, so a host exactly at it is not refused",
    contendedReadings([{ when: "beforeLaunch", busyPercent: 50 }], 50).length,
    0,
  );
  const busySample = await sampleCpuBusyPercent(120);
  check(
    "the sampler returns a real percentage on this platform, where os.loadavg() returns 0 forever",
    typeof busySample === "number" && busySample >= 0 && busySample <= 100,
    true,
  );

  check("the API origin is read out of the package env file", readEnvValue("# c\nNEXT_PUBLIC_API_URL=http://localhost:1500\n", "NEXT_PUBLIC_API_URL"), "http://localhost:1500");
  check("a quoted env value is unquoted", readEnvValue('NEXT_PUBLIC_API_URL="http://x"', "NEXT_PUBLIC_API_URL"), "http://x");
  check("a commented-out key is not read", readEnvValue("# NEXT_PUBLIC_API_URL=http://x", "NEXT_PUBLIC_API_URL"), "");

  const fakeFetch = async () => ({ status: 200, body: { getReader: () => ({ read: async () => ({ done: true }), cancel: async () => {} }) } });
  const server = await measureServerTtfb("http://localhost:1000", ["/dashboard"], "authjs.session-token=x", 3, fakeFetch);
  check("server-side TTFB is summarised per route at p50/p75/p95", Object.keys(server["/dashboard"]).sort(), ["count", "p50_ms", "p75_ms", "p95_ms", "statuses"]);
  check("server-side TTFB records the status it saw, so a 307 to /signin cannot pass as a measured page", server["/dashboard"].statuses, [200]);

  check(
    "a sample keeps waiting while the DOM is still mutating",
    shouldKeepWaitingForQuiet({ sinceLastMutationMs: 40, elapsedMs: 300, quietMs: 500, capMs: 6000 }),
    true,
  );
  check(
    "a sample is taken once the DOM has been quiet for the quiet window",
    shouldKeepWaitingForQuiet({ sinceLastMutationMs: 520, elapsedMs: 900, quietMs: 500, capMs: 6000 }),
    false,
  );
  check(
    "a page that never goes quiet is capped rather than parking the run",
    shouldKeepWaitingForQuiet({ sinceLastMutationMs: 0, elapsedMs: 6000, quietMs: 500, capMs: 6000 }),
    false,
  );
  check(
    "the cap wins over the quiet window, so the wait is bounded either way",
    shouldKeepWaitingForQuiet({ sinceLastMutationMs: 10, elapsedMs: 9999, quietMs: 500, capMs: 6000 }),
    false,
  );

  // Mobile profile UA override — fidelity check.
  check(
    "MOBILE_PROFILE has a userAgent string",
    typeof MOBILE_PROFILE.userAgent === "string" && MOBILE_PROFILE.userAgent.length > 0,
    true,
  );
  check(
    "MOBILE_PROFILE.userAgentMetadata marks the device as mobile",
    MOBILE_PROFILE.userAgentMetadata?.mobile,
    true,
  );
  check(
    "MOBILE_PROFILE.userAgentMetadata platform is Android",
    MOBILE_PROFILE.userAgentMetadata?.platform,
    "Android",
  );
  check(
    "MOBILE_PROFILE.userAgentMetadata has at least one brand entry",
    Array.isArray(MOBILE_PROFILE.userAgentMetadata?.brands) && MOBILE_PROFILE.userAgentMetadata.brands.length > 0,
    true,
  );

  if (failed) {
    console.error("\nSELF-TEST FAILED");
    process.exit(1);
  }
  console.log("\nSELF-TEST PASSED — percentiles, server-mode derivation, resource classification, byte accounting, the settle wait, and the mobile UA config all behave");
}

if (SELF_TEST)
  selfTest().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
else
  run().catch((err) => {
    console.error(`measure-web-vitals failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
