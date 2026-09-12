/**
 * Surface-agnostic browser primitives shared by the `/inbox` and `/chat`
 * acceptance matrices (`scripts/inbox-acceptance.mjs`,
 * `scripts/chat-acceptance.mjs`).
 *
 * This is NOT a second matrix engine and NOT a second CDP client. Cell
 * verdicts, screenshot naming, planned-cell accounting and exit codes stay in
 * `acceptance-matrix.mjs`; the websocket transport and Chrome launch stay in
 * `cdp.mjs` and `chrome-launcher.mjs`; axe stays in `axe.mjs`. Nothing here is
 * forked from those four.
 *
 * What lives here is what both matrices genuinely share:
 *
 *  - The viewport set. 360 / 768 / 1280 plus 1280 at 200% browser zoom. Zoom
 *    reflows, so the zoom row halves the CSS width and doubles the device pixel
 *    ratio; `Emulation.setPageScaleFactor` is pinch-zoom, it magnifies the
 *    composited frame and leaves `innerWidth` alone, so it cannot prove a 200%
 *    zoom layout. `zoomVerdict` re-reads the measured values so the claim is
 *    checkable rather than asserted.
 *
 *  - `Fetch.requestPaused` plumbing. Both surfaces are shared applications and
 *    neither matrix may write to one, so every state real data cannot otherwise
 *    reach is produced by pausing the real read and fulfilling it with a body
 *    that matches the ACTUAL backend response contract. A body that does not
 *    match renders an empty state, which reads as a product bug.
 *
 *  - The baked-origin proxy. `next build` runs with NODE_ENV=production, so Next
 *    loads `.env.production.local` and bakes `NEXT_PUBLIC_API_URL` into the
 *    client bundle (`lib/api-client.ts` reads it at module scope). Every client
 *    read from a production build therefore leaves the machine. Rather than
 *    measure a surface whose API calls all fail — or send a matrix run at the
 *    real production API — requests to that baked origin are answered from the
 *    local backend here. The CORS headers are ours because the response is
 *    fulfilled, so the page origin never matters.
 *
 *  - Page expressions that read the DOM rather than any one feature.
 *
 * Honesty rules are enforced by `acceptance-matrix.mjs` and are unchanged: a
 * cell with no screenshot is NOT-RUN, a cell axe never judged is NOT-RUN, and a
 * matrix that did not run every planned cell exits non-zero even when every cell
 * it produced passed.
 */

export const ACCEPTANCE_VIEWPORTS = [
  { key: "360", label: "360 px", width: 360, height: 780, deviceScaleFactor: 1, mobile: true, cssWidth: 360, zoom: 1 },
  { key: "768", label: "768 px", width: 768, height: 900, deviceScaleFactor: 1, mobile: false, cssWidth: 768, zoom: 1 },
  { key: "1280", label: "1280 px", width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, cssWidth: 1280, zoom: 1 },
  {
    key: "1280-zoom200",
    label: "1280 px @ 200% zoom",
    width: 640,
    height: 450,
    deviceScaleFactor: 2,
    mobile: false,
    cssWidth: 640,
    zoom: 2,
  },
];

export function selectViewports(raw) {
  if (!raw) return ACCEPTANCE_VIEWPORTS;
  const wanted = String(raw)
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return ACCEPTANCE_VIEWPORTS.filter((v) => wanted.includes(v.key));
}

export function viewportLabel(key) {
  const found = ACCEPTANCE_VIEWPORTS.find((v) => v.key === key);
  return found ? found.label : String(key);
}

export function zoomVerdict(measured, viewport) {
  if (!measured || !Number.isFinite(measured.innerWidth))
    return { ok: false, reason: "the viewport could not be measured" };
  if (measured.innerWidth !== viewport.cssWidth)
    return {
      ok: false,
      reason: `CSS viewport is ${measured.innerWidth}px, expected ${viewport.cssWidth}px`,
    };
  if (measured.devicePixelRatio !== viewport.deviceScaleFactor)
    return {
      ok: false,
      reason: `devicePixelRatio is ${measured.devicePixelRatio}, expected ${viewport.deviceScaleFactor}`,
    };
  return { ok: true, reason: null };
}

// ------------------------------------------------------------- wire fixtures

export function envelope(data) {
  return JSON.stringify({ success: true, data });
}

export function corsHeaders(origin) {
  return [
    { name: "content-type", value: "application/json" },
    { name: "access-control-allow-origin", value: origin },
    { name: "access-control-allow-credentials", value: "true" },
    { name: "cache-control", value: "no-store" },
  ];
}

export function preflightHeaders(origin) {
  return [
    { name: "access-control-allow-origin", value: origin },
    { name: "access-control-allow-credentials", value: "true" },
    { name: "access-control-allow-methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
    {
      name: "access-control-allow-headers",
      value: "authorization,content-type,x-org-id,idempotency-key,x-correlation-id",
    },
    { name: "access-control-max-age", value: "600" },
  ];
}

// ------------------------------------------------------------- interception

export function createInterceptionStats() {
  return { fulfilled: 0, continued: 0, proxied: 0, proxyFailures: [] };
}

const PROXY_SKIP_HEADERS = new Set([
  "host",
  "origin",
  "referer",
  "connection",
  "content-length",
  "accept-encoding",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-dest",
]);

export async function fulfilJson(cdp, requestId, origin, body, stats, responseCode = 200) {
  stats.fulfilled += 1;
  await cdp
    .send("Fetch.fulfillRequest", {
      requestId,
      responseCode,
      responseHeaders: corsHeaders(origin),
      body: Buffer.from(body).toString("base64"),
    })
    .catch(() => {});
}

export async function fulfilPreflight(cdp, requestId, origin, stats) {
  stats.fulfilled += 1;
  await cdp
    .send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 204,
      responseHeaders: preflightHeaders(origin),
    })
    .catch(() => {});
}

export async function continuePaused(cdp, requestId, stats) {
  stats.continued += 1;
  await cdp.send("Fetch.continueRequest", { requestId }).catch(() => {});
}

export async function proxyBakedApiRequest(cdp, params, origin, apiOrigin, stats) {
  const { requestId, request } = params;
  const source = new URL(request.url);
  if (/\/(stream|sse)(\/|$)/.test(source.pathname)) {
    stats.proxyFailures.push(`skipped stream ${source.pathname}`);
    return cdp.send("Fetch.failRequest", { requestId, errorReason: "Aborted" }).catch(() => {});
  }
  const target = `${apiOrigin}${source.pathname}${source.search}`;
  const headers = {};
  for (const [name, value] of Object.entries(request.headers ?? {}))
    if (!PROXY_SKIP_HEADERS.has(name.toLowerCase())) headers[name] = value;
  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: request.postData ?? undefined,
      redirect: "manual",
    });
    const body = Buffer.from(await res.arrayBuffer());
    stats.proxied += 1;
    await cdp.send("Fetch.fulfillRequest", {
      requestId,
      responseCode: res.status,
      responseHeaders: [
        { name: "content-type", value: res.headers.get("content-type") ?? "application/json" },
        { name: "access-control-allow-origin", value: origin },
        { name: "access-control-allow-credentials", value: "true" },
        { name: "cache-control", value: "no-store" },
      ],
      body: body.toString("base64"),
    });
  } catch (err) {
    stats.proxyFailures.push(`${request.method} ${source.pathname}: ${String(err.message ?? err)}`);
    await cdp.send("Fetch.failRequest", { requestId, errorReason: "Failed" }).catch(() => {});
  }
}

// ------------------------------------------------------------------ input

export const TAB = { key: "Tab", code: "Tab", keyCode: 9 };
export const ENTER = { key: "Enter", code: "Enter", keyCode: 13, text: "\r" };
export const SPACE = { key: " ", code: "Space", keyCode: 32, text: " " };
export const ESCAPE = { key: "Escape", code: "Escape", keyCode: 27 };

export async function pressKey(cdp, { key, code, keyCode, text, modifiers }) {
  const base = {
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    ...(modifiers ? { modifiers } : {}),
  };
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
  if (text) await cdp.send("Input.dispatchKeyEvent", { type: "char", text, ...base });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

export async function typeText(cdp, text) {
  for (const ch of String(text)) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
  }
}

export async function realClick(cdp, evaluate, name) {
  const point = await evaluate(cdp, pointByAccessibleNameExpression(name));
  if (!point) return false;
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x: point.x,
      y: point.y,
      button: "left",
      buttons: type === "mousePressed" ? 1 : 0,
      clickCount: 1,
    });
  }
  return true;
}

export async function setOffline(cdp, offline) {
  await cdp.send("Network.emulateNetworkConditions", {
    offline,
    latency: 0,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
  });
}

// ------------------------------------------------------------- expressions

const NAMED_HELPER = `const named = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").replace(/\\s+/g, " ").trim();`;
const VISIBLE_HELPER = `const visible = (el) => el.getClientRects().length > 0;`;

export function pointByAccessibleNameExpression(name) {
  return `(() => {
    ${NAMED_HELPER}
    ${VISIBLE_HELPER}
    const target = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], [role="tab"], [role="menuitem"], a'))
      .filter(visible)
      .find((el) => named(el) === ${JSON.stringify(name)});
    if (!target) return null;
    target.scrollIntoView({ block: "center" });
    const r = target.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`;
}

export function clickByAccessibleNameExpression(name) {
  return `(() => {
    ${NAMED_HELPER}
    ${VISIBLE_HELPER}
    const target = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], [role="tab"], [role="menuitem"], a'))
      .filter(visible)
      .find((el) => named(el) === ${JSON.stringify(name)});
    if (!target) return false;
    target.click();
    return true;
  })()`;
}

export function focusByAccessibleNameExpression(name) {
  return `(() => {
    ${NAMED_HELPER}
    ${VISIBLE_HELPER}
    const target = Array.from(document.querySelectorAll('button, [role="button"], a, input, textarea, [contenteditable="true"], [tabindex]'))
      .filter(visible)
      .find((el) => named(el) === ${JSON.stringify(name)} || el.getAttribute("placeholder") === ${JSON.stringify(name)});
    if (!target) return { focused: false };
    target.focus();
    return {
      focused: document.activeElement === target,
      tag: target.tagName.toLowerCase(),
      type: target.getAttribute("type"),
      nativeButton: target.tagName.toLowerCase() === "button",
      disabled: target.disabled === true || target.getAttribute("aria-disabled") === "true",
      tabIndex: target.tabIndex,
    };
  })()`;
}

export function namedControlsExpression(selector, limit = 300) {
  return `(() => {
    ${NAMED_HELPER}
    ${VISIBLE_HELPER}
    return Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      .filter(visible)
      .slice(0, ${limit})
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        role: el.getAttribute("role"),
        name: named(el).slice(0, 240),
        ariaLabel: el.getAttribute("aria-label"),
        disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
        tabIndex: el.tabIndex,
        dataset: Object.assign({}, el.dataset),
      }));
  })()`;
}

export function activeElementExpression() {
  return `(() => {
    const el = document.activeElement;
    if (!el) return null;
    ${NAMED_HELPER}
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      name: named(el).slice(0, 240),
      ariaLabel: el.getAttribute("aria-label"),
      nativeButton: el.tagName.toLowerCase() === "button",
      insideDialog: Boolean(el.closest('[role="dialog"]')),
      dataset: Object.assign({}, el.dataset),
    };
  })()`;
}

export function dialogExpression() {
  return `(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).find(
      (d) => d.getClientRects().length > 0 && d.getAttribute("aria-hidden") !== "true",
    );
    if (!dialog) return { open: false };
    ${NAMED_HELPER}
    const controls = Array.from(dialog.querySelectorAll("button, a, [role='button'], input, select, textarea"))
      .filter((el) => el.getClientRects().length > 0)
      .map(named);
    return {
      open: true,
      label: dialog.getAttribute("aria-label"),
      controls,
      text: dialog.innerText.replace(/\\s+/g, " ").slice(0, 2000),
    };
  })()`;
}

export function viewportExpression() {
  return `({
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    devicePixelRatio: window.devicePixelRatio,
    visualViewportScale: window.visualViewport ? window.visualViewport.scale : null,
    documentScrollWidth: document.documentElement.scrollWidth,
    onLine: navigator.onLine,
  })`;
}

export function overflowExpression() {
  return `(() => {
    const de = document.documentElement;
    let widest = null;
    let widestRight = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > widestRight) {
        widestRight = r.right;
        widest =
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".")
            : "");
      }
    }
    return {
      scrollWidth: de.scrollWidth,
      innerWidth: window.innerWidth,
      widest,
      widestRight: Math.round(widestRight),
    };
  })()`;
}

export function skeletonCountExpression() {
  return `document.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length`;
}

export function liveRegionExpression() {
  return `(() => {
    const nodes = Array.from(document.querySelectorAll('[aria-live="polite"], [aria-live="assertive"], [role="status"], [role="log"]'));
    return nodes
      .map((n) => (n.textContent || "").replace(/\\s+/g, " ").trim())
      .filter((t) => t.length > 0)
      .join(" | ");
  })()`;
}

export function alertsExpression() {
  return `(() => {
    return Array.from(document.querySelectorAll('[role="alert"]'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.innerText.replace(/\\s+/g, " ").trim())
      .filter((t) => t.length > 0)
      .slice(0, 20);
  })()`;
}

export function mainTextExpression(limit = 6000) {
  return `(() => {
    const main = document.querySelector("main") || document.body;
    return main ? main.innerText.replace(/\\s+/g, " ").slice(0, ${limit}) : "";
  })()`;
}

export function axeMainContextExpression() {
  return `(document.querySelector('[role="dialog"]')
    ? { include: [["main"], ['[role="dialog"]']] }
    : { include: [["main"]] })`;
}
