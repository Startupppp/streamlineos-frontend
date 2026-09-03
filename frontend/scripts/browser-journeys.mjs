#!/usr/bin/env node
/**
 * browser-journeys — drive a real Chrome over the authenticated product and assert
 * the §10.18 UX criteria that jsdom structurally cannot answer.
 *
 * jsdom has no layout engine, so "correct at 375 / 768 / 1280" and "no
 * horizontal overflow" are unprovable there, and a computed colour never
 * reflects the cascade. This runs the built application in a real engine and
 * measures instead:
 *
 *   - every step reaches the authenticated shell, not the sign-in page
 *   - every step settles into a terminal state — content, empty, error or
 *     denied — and never sits on a skeleton forever
 *   - exactly one <h1>, and a named <main>
 *   - the document never scrolls horizontally at 375, 768 or 1280, and the
 *     widest offending element is named when it does
 *   - painted text meets WCAG AA against the colour actually behind it
 *
 *   node scripts/browser-journeys.mjs --self-test
 *   node scripts/browser-journeys.mjs \
 *     --base-url=http://localhost:3000 \
 *     --cookie-file=<path holding the authjs.session-token value> \
 *     --widths=375,768,1280
 *
 * Budgets govern authenticated surfaces, so an unauthenticated run is refused
 * rather than reported as a pass — and so is a run that reached fewer steps
 * than it planned, or one where most steps rendered the error page.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
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
];

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;

/**
 * Representative flows, one per product area. Each step is a route plus an
 * optional inert interaction — none of these writes, so a failing run never
 * leaves data behind.
 *
 * A `{token}` segment is resolved from the running product before the run
 * (see DISCOVERIES). Boards and per-record tables live behind an id, so a
 * static route list structurally cannot reach them — and horizontal overflow,
 * the thing the three reference widths exist to catch, lives on exactly those
 * screens. A run that could not resolve a token records the step as not
 * reached rather than quietly shrinking its own denominator.
 */
const JOURNEYS = [
  { name: "home", steps: ["/dashboard", "/inbox", "/notifications"] },
  { name: "crm", steps: ["/crm/leads", "/crm/deals", "/parties"] },
  { name: "inventory", steps: ["/inventory/products", "/inventory/stock"] },
  { name: "hr", steps: ["/hr/employees", "/hr/attendance"] },
  {
    name: "build",
    steps: [
      "/build",
      "/build/all",
      "/build/{projectId}",
      "/build/{projectId}/backlog",
    ],
  },
  { name: "accounting", steps: ["/accounting", "/accounting/coa"] },
  { name: "workspace", steps: ["/directory/workers", "/calendar", "/workflows"] },
  { name: "settings", steps: ["/settings", "/settings/roles"] },
];

/**
 * How each token is obtained: open a listing the product already renders and
 * read an id out of it. That is a click-through, not a guess — an id supplied
 * on the command line can be stale or belong to another tenant, and the run
 * would then measure a 404 while reporting a route name that sounds right.
 */
const DISCOVERIES = [
  {
    token: "projectId",
    from: "/build/all",
    /**
     * A project id is numeric. Matching any segment instead picked up
     * /build/command-center — a static sibling route — and the run then
     * measured /build/command-center/backlog, a 404, as a real error state.
     */
    extract: `(() => {
      for (const a of document.querySelectorAll('a[href^="/build/"]')) {
        const m = /^\\/build\\/(\\d+)(?:[/?#]|$)/.exec(a.getAttribute("href") || "");
        if (m) return m[1];
      }
      return null;
    })()`,
    /**
     * The project list navigates with router.push from a row click, so there is
     * no href to read. Clicking the first row and reading where it landed is
     * the only honest way to reach a board — and it is a real click-through,
     * which is what this run was missing.
     */
    click: `(() => {
      const row = document.querySelector("main tbody tr");
      const card = document.querySelector('main [class*="cursor-pointer"]');
      const target = row || card;
      if (!target) return false;
      target.click();
      return true;
    })()`,
    read: `(() => {
      const m = /^\\/build\\/(\\d+)(?:[/?#]|$)/.exec(location.pathname);
      return m ? m[1] : null;
    })()`,
  },
];

/** A cold `next dev` route can take several settle windows to paint. */
const DISCOVERY_ATTEMPTS = 4;

const TOKEN_PATTERN = /\{(\w+)\}/g;

export function templateTokens(path) {
  TOKEN_PATTERN.lastIndex = 0;
  const out = [];
  let m = TOKEN_PATTERN.exec(path);
  while (m) {
    out.push(m[1]);
    m = TOKEN_PATTERN.exec(path);
  }
  return out;
}

/**
 * Returns the concrete path, or the tokens that stopped it being one. Never a
 * half-substituted path: `/build/{projectId}` requested literally is a 404 that
 * would be scored as a real error state.
 */
export function expandStep(path, tokens) {
  const missing = templateTokens(path).filter(
    (t) => tokens[t] === undefined || tokens[t] === null || tokens[t] === "",
  );
  if (missing.length > 0) return { path: null, missing };
  return { path: path.replace(TOKEN_PATTERN, (_, t) => tokens[t]), missing: [] };
}

/** Steps the run intended to visit, before anything is skipped. */
export function plannedStepCount(journeys, widths) {
  return journeys.reduce((n, j) => n + j.steps.length, 0) * widths.length;
}

export function relativeLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel((int >> 16) & 255);
  const g = channel((int >> 8) & 255);
  const b = channel(int & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg, bg) {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A sample whose foreground and background resolve to the same colour did not
 * resolve: no shipped page renders invisible text, and `getComputedStyle` cannot
 * see a background painted by a pseudo-element, an overlapping sibling, or a
 * `color(srgb …)` value this probe does not parse. Counting those as WCAG
 * failures would fabricate 17 of them; they are recorded as unresolved instead.
 */
export function isUnresolvedSample({ fg, bg }) {
  return fg.toLowerCase() === bg.toLowerCase();
}

/** WCAG "large text" is >=24px, or >=18.66px when bold. */
export function requiredRatio(fontSizePx, fontWeight) {
  const large =
    fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(fontWeight) >= 700);
  return large ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
}

/** A run is only evidence if most of it reached the product rather than an error page. */
export function tooManyErrors(errored, total) {
  return total > 0 && errored > total / 2;
}

/**
 * A step that was never visited must not shrink the denominator. Otherwise a
 * run that could not resolve an id reports "0 findings over 51 steps" and reads
 * as cleaner than the 57-step run it failed to be — the same false pass an
 * all-error run used to produce.
 */
export function stepsIncomplete(ran, planned) {
  return ran < planned;
}

export function overflowVerdict({ scrollWidth, innerWidth }) {
  return scrollWidth <= innerWidth + 1;
}

/**
 * A surface still showing a busy region after the settle window has not
 * rendered a state — it has stalled, which is the defect this run exists to
 * catch. Any of content / empty / error / denied is a pass.
 */
export function stateVerdict(probe) {
  if (probe.denied) return "denied";
  if (probe.error) return "error";
  if (probe.empty) return "empty";
  if (probe.busy) return "loading";
  return "content";
}

const PAGE_PROBE = `(() => {
  const rgb = (value) => {
    const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/.exec(value || "");
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  /**
   * Returns null rather than a wrong colour. A gradient or image paints through
   * backgroundColor: rgba(0,0,0,0), so walking past it reports the page ground
   * and every light label over a dark gradient reads as 1:1. Unmeasurable is
   * the honest answer; a fabricated failure is worse than none.
   */
  const behind = (el) => {
    let node = el;
    while (node && node !== document.documentElement.parentNode) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== "none") return null;
      const c = rgb(style.backgroundColor);
      if (c && c.a >= 0.95) return hex(c);
      node = node.parentElement;
    }
    const body = rgb(getComputedStyle(document.body).backgroundColor);
    return body ? hex(body) : "#ffffff";
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };

  const main = document.querySelector("main");
  const nav = document.querySelector("nav, [role='navigation']");
  const h1s = Array.from(document.querySelectorAll("h1"));

  const busyRegions = Array.from(document.querySelectorAll('[aria-busy="true"]')).filter(visible);
  const skeletons = Array.from(document.querySelectorAll('[data-slot="skeleton"], .animate-pulse')).filter(visible);

  const textOf = (el) => (el.textContent || "").trim().slice(0, 120);
  const statusRegions = Array.from(document.querySelectorAll('[role="status"], [role="alert"]')).filter(visible).map(textOf);
  const headings = Array.from(document.querySelectorAll("h1, h2")).filter(visible).map(textOf);
  const said = statusRegions.concat(headings);

  const overflowing = [];
  const vw = window.innerWidth;
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const s = getComputedStyle(el);
      if (s.position === "fixed" || s.position === "absolute") continue;
      overflowing.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 80),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
      if (overflowing.length >= 5) break;
    }
  }

  const contrast = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node = walker.nextNode();
  while (node && contrast.length < 400) {
    const text = (node.nodeValue || "").trim();
    const el = node.parentElement;
    if (text.length >= 2 && el && !seen.has(el) && visible(el)) {
      seen.add(el);
      const s = getComputedStyle(el);
      const fg = rgb(s.color);
      const bg = fg && fg.a >= 0.95 ? behind(el) : null;
      if (fg && bg !== null) {
        contrast.push({
          fg: hex(fg),
          bg,
          size: parseFloat(s.fontSize),
          weight: s.fontWeight,
          sample: text.slice(0, 40),
        });
      }
    }
    node = walker.nextNode();
  }

  return {
    url: location.pathname,
    signIn: /\\/(sign-in|login|auth)/.test(location.pathname),
    hasMain: Boolean(main),
    mainName: main ? (main.getAttribute("aria-label") || main.getAttribute("aria-labelledby") || "") : "",
    h1Count: h1s.length,
    h1Text: h1s.map(textOf),
    hasNav: Boolean(nav),
    busy: busyRegions.length > 0 || skeletons.length > 0,
    statusRegions,
    headings,
    empty: said.some((t) => /no |nothing|empty|get started|create your first/i.test(t)),
    error: said.some((t) => /couldn.t|could not|failed|went wrong|try again/i.test(t)),
    denied: said.some((t) =>
      /permission|not authorised|not authorized|no access|access (denied|restricted)|access to this screen/i.test(t),
    ),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflowing,
    contrast,
  };
})()`;

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
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id === undefined) return;
    const cb = pending.get(msg.id);
    if (cb) {
      pending.delete(msg.id);
      cb(msg);
    }
  };
  const send = (method, params = {}) => {
    const id = ++msgId;
    return new Promise((res, rej) => {
      pending.set(id, (m) =>
        m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result),
      );
      ws.send(JSON.stringify({ id, method, params }));
    });
  };
  return { send, close: () => ws.close() };
}

function runSelfTest() {
  const failures = [];
  let passed = 0;
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  assert("black on white is 21:1", Math.round(contrastRatio("#000000", "#ffffff")) === 21);
  assert("a colour on itself is 1:1", Math.abs(contrastRatio("#3b82f6", "#3b82f6") - 1) < 1e-9);
  assert("a malformed colour yields null, never a passing number", contrastRatio("transparent", "#fff") === null);
  assert("slate-400 on slate-50 is below AA", contrastRatio("#94a3b8", "#f8fafc") < WCAG_AA_NORMAL);
  assert("14px normal text owes 4.5:1", requiredRatio(14, "400") === WCAG_AA_NORMAL);
  assert("24px text owes 3:1", requiredRatio(24, "400") === WCAG_AA_LARGE);
  assert("19px bold text owes 3:1", requiredRatio(19, "700") === WCAG_AA_LARGE);
  assert("19px normal text still owes 4.5:1", requiredRatio(19, "400") === WCAG_AA_NORMAL);
  assert("a document exactly as wide as the viewport does not overflow", overflowVerdict({ scrollWidth: 375, innerWidth: 375 }));
  assert("BITE — two pixels wider than the viewport IS overflow", !overflowVerdict({ scrollWidth: 377, innerWidth: 375 }));
  assert("a busy page with no state is 'loading'", stateVerdict({ busy: true }) === "loading");
  assert("BITE — a still-busy page is never reported as content", stateVerdict({ busy: true }) !== "content");
  assert("denied outranks empty", stateVerdict({ denied: true, empty: true }) === "denied");
  assert("a settled page with nothing to show is 'empty'", stateVerdict({ empty: true }) === "empty");
  assert("a settled page with rows is 'content'", stateVerdict({}) === "content");
  assert(
    "BITE — a run where most steps errored is refused, not reported as zero findings",
    tooManyErrors(29, 57) && !tooManyErrors(28, 57),
  );
  assert(
    "a sample whose ink equals its ground is unresolved, not a 1:1 failure",
    isUnresolvedSample({ fg: "#FFFFFF", bg: "#ffffff" }),
  );
  assert(
    "BITE — a genuinely low-contrast pair is still a failure, not written off as unresolved",
    !isUnresolvedSample({ fg: "#cb7006", bg: "#f8fafc" }) &&
      contrastRatio("#cb7006", "#f8fafc") < WCAG_AA_NORMAL,
  );
  assert("every journey names at least two steps", JOURNEYS.every((j) => j.steps.length >= 2));
  assert("no journey step is a write route", JOURNEYS.every((j) => j.steps.every((s) => !/\/(new|create|edit)(\/|$)/.test(s))));

  const allSteps = JOURNEYS.flatMap((j) => j.steps);
  assert(
    "a resolved token becomes a concrete path",
    expandStep("/build/{projectId}/backlog", { projectId: "42" }).path ===
      "/build/42/backlog",
  );
  assert(
    "BITE — an unresolved token yields no path at all, never a literal {token} URL",
    expandStep("/build/{projectId}", {}).path === null &&
      expandStep("/build/{projectId}", {}).missing.join() === "projectId",
  );
  assert(
    "an empty-string token counts as unresolved, not as a valid id",
    expandStep("/build/{projectId}", { projectId: "" }).path === null,
  );
  assert(
    "a plain route passes through untouched",
    expandStep("/dashboard", {}).path === "/dashboard",
  );
  assert(
    "every templated token has a discovery that can resolve it",
    allSteps
      .flatMap(templateTokens)
      .every((t) => DISCOVERIES.some((d) => d.token === t)),
  );
  assert(
    "every discovery is actually used by a step, so the run never navigates for nothing",
    DISCOVERIES.every((d) => allSteps.some((s) => templateTokens(s).includes(d.token))),
  );
  assert(
    "no discovery reads its id from a route that is itself templated",
    DISCOVERIES.every((d) => templateTokens(d.from).length === 0),
  );
  assert(
    "every discovery declares where to look and what to read",
    DISCOVERIES.every((d) => typeof d.from === "string" && typeof d.extract === "string"),
  );
  assert(
    "a click-through discovery declares both the click and what to read after it",
    DISCOVERIES.every((d) => (d.click === undefined) === (d.read === undefined)),
  );
  assert(
    "discovery retries rather than believing one blank settle window",
    DISCOVERY_ATTEMPTS > 1,
  );
  assert(
    "the journeys reach a kanban board, which is where horizontal overflow lives",
    allSteps.includes("/build/{projectId}"),
  );
  assert(
    "the planned denominator counts every step at every width",
    plannedStepCount([{ steps: ["/a", "/b"] }, { steps: ["/c"] }], [375, 768, 1280]) === 9,
  );
  assert(
    "a run that reached every planned step is complete",
    stepsIncomplete(9, 9) === false,
  );
  assert(
    "BITE — a run that skipped a step is incomplete, not a smaller clean run",
    stepsIncomplete(8, 9),
  );

  for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
  if (failures.length > 0) {
    console.error(`browser-journeys self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`browser-journeys self-tests: ${passed} passed`);
}

if (SELF_TEST) {
  runSelfTest();
  process.exit(0);
}

async function main() {
  const baseUrl = flag("base-url", "http://localhost:3000").replace(/\/$/, "");
  const widths = flag("widths", "375,768,1280").split(",").map((w) => Number(w.trim()));
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const settleMs = Number(flag("settle-ms", "3500"));
  const browserPath = findBrowser(flag("browser", ""));
  const outPath = flag("out", join(ROOT, ".browser-journeys-results.json"));

  if (!browserPath) throw new Error("no Chrome/Chromium found — pass --browser=<path>");
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file is required: these are authenticated surfaces");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  if (!cookieValue) throw new Error("cookie file is empty");

  const debugPort = 9400 + Math.floor(Math.random() * 400);
  const userDataDir = join(tmpdir(), `sl-journeys-${randomBytes(6).toString("hex")}`);
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
  const findings = [];
  const steps = [];
  const tokens = {};

  try {
    await waitForDevTools(debugPort, 20000);
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    const target = targets.find((t) => t.type === "page");
    if (!target) throw new Error("no page target");
    const cdp = await cdpSession(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Network.setCookie", {
      name: cookieName,
      value: cookieValue,
      url: baseUrl,
      httpOnly: true,
      path: "/",
    });
    log(`browser ${browserPath} · base ${baseUrl} · widths ${widths.join("/")}`);

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const discovery of DISCOVERIES) {
      const override = flag(discovery.token, "");
      if (override) {
        tokens[discovery.token] = override;
        log(`token ${discovery.token} = ${override} (given)`);
        continue;
      }
      const evaluate = async (expression) => {
        const r = await cdp.send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: false,
        });
        return r.result?.value;
      };
      const resolved = (v) => typeof v === "string" && v.length > 0;
      let value = null;
      let how = "link";
      /**
       * The listing this reads is usually the first route the run touches, so
       * under `next dev` it is also the one being compiled from cold. Giving up
       * after one settle window reported the id as unresolvable when the page
       * simply had not painted yet. Each attempt reloads, because a click that
       * navigated somewhere unexpected must not leave the next attempt looking
       * at a different page.
       */
      for (let attempt = 1; attempt <= DISCOVERY_ATTEMPTS && !resolved(value); attempt += 1) {
        await cdp.send("Page.navigate", { url: `${baseUrl}${discovery.from}` });
        await sleep(settleMs);
        value = await evaluate(discovery.extract);
        if (!resolved(value) && discovery.click) {
          const clicked = await evaluate(discovery.click);
          if (clicked === true) {
            await sleep(settleMs);
            value = await evaluate(discovery.read);
            how = "click-through";
          }
        }
      }
      if (typeof value === "string" && value.length > 0) {
        tokens[discovery.token] = value;
        log(`token ${discovery.token} = ${value} (${how} from ${discovery.from})`);
      } else {
        log(`token ${discovery.token} UNRESOLVED from ${discovery.from}`);
      }
    }

    for (const width of widths) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: width < 500 ? 812 : 900,
        deviceScaleFactor: 1,
        mobile: width < 500,
      });

      for (const journey of JOURNEYS) {
        for (const template of journey.steps) {
          const expanded = expandStep(template, tokens);
          if (expanded.path === null) {
            findings.push({
              width,
              journey: journey.name,
              route: template,
              kind: "step-not-reached",
              unresolved: expanded.missing,
            });
            continue;
          }
          const route = expanded.path;
          const url = `${baseUrl}${route}`;
          await cdp.send("Page.navigate", { url });
          await sleep(settleMs);
          const { result } = await cdp.send("Runtime.evaluate", {
            expression: PAGE_PROBE,
            returnByValue: true,
            awaitPromise: false,
          });
          const probe = result.value;
          if (!probe) {
            findings.push({ width, journey: journey.name, route, kind: "probe-failed" });
            continue;
          }

          const state = stateVerdict(probe);
          const measured = probe.contrast.map((c) => ({
            ...c,
            ratio: contrastRatio(c.fg, c.bg),
            need: requiredRatio(c.size, c.weight),
          }));
          const unresolved = measured.filter(isUnresolvedSample);
          const contrastFailures = measured.filter(
            (c) => !isUnresolvedSample(c) && c.ratio !== null && c.ratio < c.need,
          );

          steps.push({
            width,
            journey: journey.name,
            route,
            template,
            landed: probe.url,
            state,
            h1Count: probe.h1Count,
            mainName: probe.mainName,
            scrollWidth: probe.scrollWidth,
            innerWidth: probe.innerWidth,
            contrastSampled: probe.contrast.length,
            contrastUnresolved: unresolved.length,
            contrastFailures: contrastFailures.length,
          });

          if (probe.signIn)
            findings.push({ width, journey: journey.name, route, kind: "unauthenticated", landed: probe.url });
          if (!probe.hasMain)
            findings.push({ width, journey: journey.name, route, kind: "no-main-landmark" });
          else if (!probe.mainName)
            findings.push({ width, journey: journey.name, route, kind: "main-has-no-accessible-name" });
          if (probe.h1Count !== 1)
            findings.push({ width, journey: journey.name, route, kind: "h1-count", count: probe.h1Count, headings: probe.h1Text });
          if (state === "loading")
            findings.push({ width, journey: journey.name, route, kind: "never-settled" });
          if (!overflowVerdict(probe))
            findings.push({
              width,
              journey: journey.name,
              route,
              kind: "horizontal-overflow",
              scrollWidth: probe.scrollWidth,
              innerWidth: probe.innerWidth,
              widest: probe.overflowing.slice(0, 3),
            });
          for (const c of contrastFailures.slice(0, 3))
            findings.push({
              width,
              journey: journey.name,
              route,
              kind: "contrast",
              ratio: Number(c.ratio.toFixed(2)),
              need: c.need,
              fg: c.fg,
              bg: c.bg,
              size: c.size,
              sample: c.sample,
            });
        }
        log(`${width}px · ${journey.name} · ${journey.steps.length} steps`);
      }
    }
    cdp.close();
  } finally {
    proc.kill();
  }

  const unauthenticated = findings.filter((f) => f.kind === "unauthenticated").length;
  const errored = steps.filter((step) => step.state === "error").length;
  const planned = plannedStepCount(JOURNEYS, widths);
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    widths,
    journeys: JOURNEYS.map((j) => j.name),
    tokens,
    stepsPlanned: planned,
    stepsRun: steps.length,
    findings,
    steps,
  };
  writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);

  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  log(`${steps.length} of ${planned} planned steps run · ${findings.length} findings`);
  for (const [kind, count] of Object.entries(byKind).sort()) console.log(`   ${kind}: ${count}`);
  console.log(`results -> ${outPath}`);

  if (unauthenticated > 0) {
    console.error("✖  the run was not authenticated — an unauthenticated run proves nothing");
    process.exit(1);
  }
  /**
   * An error state is a *terminal* state, so a run where every surface fails
   * would otherwise report zero findings and exit clean. That is a false pass:
   * it means the environment is broken, not that the UX is sound.
   */
  if (tooManyErrors(errored, steps.length)) {
    console.error(
      `✖  ${errored} of ${steps.length} steps rendered an error state — the environment is broken, ` +
        "so this run measured the error page, not the product",
    );
    process.exit(1);
  }
  /**
   * The same refusal from the other side: a step that never ran cannot count as
   * a step that passed, so a run missing any of its planned steps is reported as
   * incomplete rather than as a smaller clean run.
   */
  if (stepsIncomplete(steps.length, planned)) {
    console.error(
      `✖  only ${steps.length} of ${planned} planned steps were reached — ` +
        "this run is incomplete, not clean",
    );
    process.exit(1);
  }
  process.exit(findings.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
