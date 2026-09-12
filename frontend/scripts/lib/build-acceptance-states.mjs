import { randomBytes } from "node:crypto";
import { sleep, cdpSession, newPageTarget } from "./cdp.mjs";
import { axeVerdict, seriousViolations } from "./axe.mjs";
import {
  cellFromChecks,
  notRunCell,
  overflowVerdict,
  passed,
  failed,
  unreached,
} from "./acceptance-matrix.mjs";

const EMPTY_QUERY = "xyzzy-nomatch-string";
const MISSING_TICKET_KEY = "INVALID-99999";
const SKELETON_SELECTOR = '[data-slot="skeleton"], .animate-pulse';
const RISK_CELL_PATTERN = /probability,\s*.+impact:\s*\d+\s*open risks/i;
const EMPTY_TEXT_PATTERN = /no projects match|no results|nothing here|get started|create your first/i;
const RETRY_PATTERN = /try again|retry|reload/i;
const NOT_FOUND_PATTERN = /not found|404|does not exist|couldn't find/i;
const TAB_LIMIT = 40;

function skeletonCountExpression() {
  return `document.querySelectorAll(${JSON.stringify(SKELETON_SELECTOR)}).length`;
}

function bodyTextExpression() {
  return `document.body ? document.body.innerText.slice(0, 20000) : ""`;
}

function overflowExpression() {
  return `(() => {
    const de = document.documentElement;
    let widest = null;
    let widestRight = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > widestRight) {
        widestRight = r.right;
        widest = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "");
      }
    }
    return { scrollWidth: de.scrollWidth, innerWidth: window.innerWidth, widest, widestRight: Math.round(widestRight) };
  })()`;
}

function alertExpression() {
  return `(() => {
    const alert = document.querySelector('[role="alert"]');
    const buttons = Array.from(document.querySelectorAll("button, [role='button'], a"));
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
    const retry = buttons.find((el) => ${RETRY_PATTERN}.test(named(el)) && el.offsetParent !== null);
    return {
      hasAlert: Boolean(alert),
      alertText: alert ? alert.innerText.slice(0, 400) : null,
      hasRetry: Boolean(retry),
      retryLabel: retry ? named(retry) : null,
      bodyText: document.body ? document.body.innerText.slice(0, 4000) : "",
    };
  })()`;
}

function clickRetryExpression() {
  return `(() => {
    const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
    const retry = buttons.find((el) => ${RETRY_PATTERN}.test(named(el)) && el.offsetParent !== null);
    if (!retry) return false;
    retry.click();
    return true;
  })()`;
}

function activeElementExpression() {
  return `(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      name: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 200),
      pressed: el.getAttribute("aria-pressed"),
    };
  })()`;
}

function pressedCellsExpression() {
  return `Array.from(document.querySelectorAll('[aria-pressed="true"]')).map((el) =>
    (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 200))`;
}

function riskCellsExpression() {
  return `Array.from(document.querySelectorAll('button, [role="button"]')).map((el) =>
    (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 200))`;
}

function crossTabProbeSource(channelPrefix) {
  return `(() => {
    window.__slCrossTab = { channel: [], storage: [], fetches: 0, transport: null };
    const OriginalBroadcastChannel = window.BroadcastChannel;
    if (OriginalBroadcastChannel) {
      window.BroadcastChannel = function (name) {
        const ch = new OriginalBroadcastChannel(name);
        if (String(name).indexOf(${JSON.stringify(channelPrefix)}) === 0) {
          ch.addEventListener("message", (e) => {
            window.__slCrossTab.channel.push({ name, data: String(e.data) });
            window.__slCrossTab.transport = "BroadcastChannel";
          });
        }
        return ch;
      };
      window.BroadcastChannel.prototype = OriginalBroadcastChannel.prototype;
    }
    window.addEventListener("storage", (e) => {
      if (e.key && String(e.key).indexOf(${JSON.stringify(channelPrefix)}) === 0) {
        window.__slCrossTab.storage.push({ key: e.key });
        window.__slCrossTab.transport = window.__slCrossTab.transport || "storage";
      }
    });
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      window.__slCrossTab.fetches += 1;
      return originalFetch.apply(this === undefined ? window : this, args);
    };
  })()`;
}

const CREATE_TICKET_ACTIONS = [
  {
    label: "open the column composer",
    expression: `(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (el) =>
          (el.textContent || "").trim() === "Add ticket" ||
          el.getAttribute("aria-label") === "Add ticket to column",
      );
      if (!button) return false;
      button.click();
      return true;
    })()`,
  },
  {
    label: "type the ticket title",
    expression: `(() => {
      const input = document.querySelector('input[placeholder="Ticket title..."]');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "{subject}");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return input.value === "{subject}";
    })()`,
  },
  {
    label: "submit with Enter",
    expression: `(() => {
      const input = document.querySelector('input[placeholder="Ticket title..."]');
      if (!input) return false;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      return true;
    })()`,
  },
];

export function substituteSubject(expression, subject) {
  return expression.split("{subject}").join(subject);
}

export function retryReissued(before, after) {
  return after > before;
}

export function notFoundVerdict(probe) {
  if (!probe) return { ok: false, reason: "no probe result" };
  if (probe.hasRetry)
    return { ok: false, reason: `a retry control was offered on a genuine 404 (${probe.retryLabel})` };
  if (!NOT_FOUND_PATTERN.test(probe.bodyText ?? ""))
    return { ok: false, reason: "the page did not render a not-found result" };
  return { ok: true, reason: null };
}

export function keyboardVerdict({ reachedName, pressedNames }) {
  if (!reachedName) return { ok: false, reason: `Tab never reached a risk cell within ${TAB_LIMIT} presses` };
  if (!RISK_CELL_PATTERN.test(reachedName))
    return { ok: false, reason: `focused element is not a named risk cell: "${reachedName}"` };
  if (!pressedNames || pressedNames.length === 0)
    return { ok: false, reason: "Enter did not set aria-pressed on any cell" };
  return { ok: true, reason: null };
}

export async function runLoadingAndEmpty({ cdp, width, baseUrl, navigate, evaluate, screenshot, runAxe }) {
  const state = "loading-and-empty";
  const shots = [];
  const checks = [];
  try {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 2000,
      downloadThroughput: 51200,
      uploadThroughput: 51200,
    });
    await cdp.send("Page.navigate", { url: `${baseUrl}/build/all` });
  } catch {
    void 0;
  }
  try {
    let skeletons = 0;
    for (let i = 0; i < 40 && skeletons === 0; i += 1) {
      await sleep(150);
      skeletons = Number(await evaluate(cdp, skeletonCountExpression())) || 0;
    }
    if (skeletons > 0) {
      shots.push(await screenshot(cdp, state, width, "loading"));
      checks.push(passed("loading skeleton painted"));
    } else {
      checks.push(unreached("loading skeleton", "no skeleton was observed before the page settled"));
    }
  } catch (e) {
    checks.push(unreached("loading skeleton", String(e.message ?? e)));
  }
  await cdp
    .send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
    .catch(() => {});

  let axe = null;
  try {
    await navigate(cdp, `/build/all?q=${EMPTY_QUERY}`);
    const text = String(await evaluate(cdp, bodyTextExpression()) ?? "");
    shots.push(await screenshot(cdp, state, width, "empty"));
    if (EMPTY_TEXT_PATTERN.test(text)) checks.push(passed("empty state rendered"));
    else checks.push(failed("empty state", "no empty-state copy was rendered for a no-match filter"));
    axe = await runAxe(cdp);
    const serious = seriousViolations(axe.violations ?? []);
    if (axe.ran && serious.length > 0)
      checks.push(failed("axe", `${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`));
  } catch (e) {
    checks.push(unreached("empty state", String(e.message ?? e)));
  }
  return cellFromChecks(state, width, checks, shots, axe);
}

export async function runErrorAndRetry({
  cdp,
  width,
  projectFlat,
  ticketKey,
  navigate,
  evaluate,
  screenshot,
  runAxe,
}) {
  const state = "error-and-retry";
  if (!ticketKey)
    return notRunCell(state, width, "no ticket key could be discovered, so the 500/404 split is unprovable");
  const shots = [];
  const checks = [];
  let axe = null;
  let intercepted = 0;
  let unsubscribe = null;
  try {
    unsubscribe = cdp.on("Fetch.requestPaused", async (params) => {
      const url = String(params.request?.url ?? "");
      if (/ticket/i.test(url)) {
        intercepted += 1;
        await cdp
          .send("Fetch.fulfillRequest", {
            requestId: params.requestId,
            responseCode: 500,
            responseHeaders: [{ name: "content-type", value: "application/json" }],
            body: Buffer.from(JSON.stringify({ message: "Internal Server Error" })).toString("base64"),
          })
          .catch(() => {});
        return;
      }
      await cdp.send("Fetch.continueRequest", { requestId: params.requestId }).catch(() => {});
    });
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*", resourceType: "XHR" },
        { urlPattern: "*", resourceType: "Fetch" },
      ],
    });
    await navigate(cdp, `${projectFlat}/tickets/${ticketKey}`);
    const probe = await evaluate(cdp, alertExpression());
    shots.push(await screenshot(cdp, state, width, "500"));
    if (probe?.hasAlert) checks.push(passed("500 renders an alert"));
    else checks.push(failed("500 alert", "a server error did not render role=alert"));
    if (probe?.hasRetry) {
      checks.push(passed("500 offers retry"));
      const before = intercepted;
      const clicked = await evaluate(cdp, clickRetryExpression());
      if (clicked === true) {
        await sleep(2000);
        if (retryReissued(before, intercepted)) checks.push(passed("retry re-issues the request"));
        else checks.push(failed("retry", "clicking retry did not re-issue the ticket request"));
      } else {
        checks.push(unreached("retry click", "the retry control could not be clicked"));
      }
    } else {
      checks.push(failed("500 retry", "a retryable failure offered no retry control"));
    }
    axe = await runAxe(cdp);
  } catch (e) {
    checks.push(unreached("500 branch", String(e.message ?? e)));
  } finally {
    if (unsubscribe) unsubscribe();
    await cdp.send("Fetch.disable").catch(() => {});
  }

  try {
    await navigate(cdp, `${projectFlat}/tickets/${MISSING_TICKET_KEY}`);
    const probe = await evaluate(cdp, alertExpression());
    shots.push(await screenshot(cdp, state, width, "404"));
    const verdict = notFoundVerdict(probe);
    if (verdict.ok) checks.push(passed("genuine 404 stays not-found"));
    else checks.push(failed("404 branch", verdict.reason));
  } catch (e) {
    checks.push(unreached("404 branch", String(e.message ?? e)));
  }
  return cellFromChecks(state, width, checks, shots, axe);
}

export async function runCrossTab({
  cdp,
  debugPort,
  width,
  projectPath,
  prepare,
  navigate,
  evaluate,
  screenshot,
  runAxe,
  setWidth,
  channelPrefix,
  settleMs,
}) {
  const state = "cross-tab-freshness";
  const shots = [];
  const checks = [];
  let axe = null;
  let peer = null;
  try {
    peer = await cdpSession(await newPageTarget(debugPort));
    await prepare(peer);
    await peer.send("Page.addScriptToEvaluateOnNewDocument", {
      source: crossTabProbeSource(channelPrefix),
    });
    await setWidth(peer, width);
    await navigate(peer, `${projectPath}`);
    await navigate(cdp, `${projectPath}`);

    const before = await evaluate(peer, "window.__slCrossTab ? window.__slCrossTab.fetches : -1");
    if (Number(before) < 0) {
      checks.push(unreached("peer instrumentation", "the cross-tab probe did not install in the peer tab"));
      return cellFromChecks(state, width, checks, shots, axe);
    }

    const subject = `acc-${randomBytes(3).toString("hex")}`;
    let mutated = true;
    for (const action of CREATE_TICKET_ACTIONS) {
      const ok = await evaluate(cdp, substituteSubject(action.expression, subject));
      if (ok !== true) {
        mutated = false;
        checks.push(unreached("mutation", `could not ${action.label} — no write was made, so nothing was propagated`));
        break;
      }
      await sleep(600);
    }

    if (mutated) {
      await sleep(settleMs);
      const probe = await evaluate(
        peer,
        `(() => ({
          transport: window.__slCrossTab.transport,
          channel: window.__slCrossTab.channel.length,
          storage: window.__slCrossTab.storage.length,
          fetches: window.__slCrossTab.fetches,
          sawSubject: document.body.innerText.includes(${JSON.stringify(subject)}),
        }))()`,
      );
      shots.push(await screenshot(peer, state, width, "peer"));
      if (probe?.transport) checks.push(passed(`peer received via ${probe.transport}`));
      else checks.push(failed("propagation", "the peer tab received no cache-sync message"));
      if (Number(probe?.fetches) > Number(before)) checks.push(passed("peer refetched without a reload"));
      else checks.push(failed("refetch", "the peer tab issued no request after the mutation"));
      axe = await runAxe(peer);
    }
    if (shots.length === 0) shots.push(await screenshot(peer, state, width, "peer"));
  } catch (e) {
    checks.push(unreached("cross-tab", String(e.message ?? e)));
  } finally {
    if (peer) {
      try {
        peer.close();
      } catch {
        void 0;
      }
    }
  }
  return cellFromChecks(state, width, checks, shots, axe);
}

export async function runKeyboard({ cdp, width, projectFlat, navigate, evaluate, screenshot, runAxe }) {
  const state = "keyboard-and-accessibility";
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    await navigate(cdp, `${projectFlat}/risks`);
    let cellNames = await evaluate(cdp, riskCellsExpression());
    for (let waited = 0; waited < 12000; waited += 750) {
      if (Array.isArray(cellNames) && cellNames.some((n) => RISK_CELL_PATTERN.test(n))) break;
      await sleep(750);
      cellNames = await evaluate(cdp, riskCellsExpression());
    }
    if (!Array.isArray(cellNames) || !cellNames.some((n) => RISK_CELL_PATTERN.test(n))) {
      shots.push(await screenshot(cdp, state, width, "risks"));
      const landed = await evaluate(cdp, "location.pathname");
      const seen = Array.isArray(cellNames) ? cellNames.length : "not-an-array";
      const sample = Array.isArray(cellNames)
        ? cellNames.filter((n) => /probability/i.test(n)).slice(0, 2).join(" | ") || "none named probability"
        : "";
      checks.push(
        unreached(
          "risk matrix",
          `no named risk cells on ${landed} (${seen} buttons seen; ${sample})`,
        ),
      );
      return cellFromChecks(state, width, checks, shots, await runAxe(cdp));
    }
    await evaluate(cdp, "document.body.focus()");
    let reachedName = null;
    for (let i = 0; i < TAB_LIMIT && !reachedName; i += 1) {
      await cdp.send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await sleep(60);
      const active = await evaluate(cdp, activeElementExpression());
      if (active?.name && RISK_CELL_PATTERN.test(active.name)) reachedName = active.name;
    }
    if (reachedName) {
      for (const type of ["rawKeyDown", "char", "keyUp"]) {
        await cdp.send("Input.dispatchKeyEvent", {
          type,
          key: "Enter",
          code: "Enter",
          text: type === "char" ? "\r" : undefined,
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
        });
      }
      await sleep(1200);
    }
    const pressedNames = await evaluate(cdp, pressedCellsExpression());
    shots.push(await screenshot(cdp, state, width, "risks"));
    const verdict = keyboardVerdict({ reachedName, pressedNames });
    if (verdict.ok) checks.push(passed("Tab reaches a named risk cell and Enter selects it"));
    else checks.push(failed("keyboard", verdict.reason));
    axe = await runAxe(cdp);
    const serious = seriousViolations(axe.violations ?? []);
    if (axe.ran && serious.length > 0)
      checks.push(failed("axe", `${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`));
  } catch (e) {
    checks.push(unreached("keyboard", String(e.message ?? e)));
  }
  return cellFromChecks(state, width, checks, shots, axe);
}

export async function runResponsive({ cdp, width, projectPath, projectFlat, navigate, evaluate, screenshot, runAxe }) {
  const state = "responsive-layout";
  const shots = [];
  const checks = [];
  let axe = null;
  const routes = ["/build/all", `${projectPath}`, `${projectFlat}/backlog`];
  try {
    for (const route of routes) {
      await navigate(cdp, route);
      const measured = await evaluate(cdp, overflowExpression());
      const verdict = overflowVerdict(measured ?? {});
      shots.push(await screenshot(cdp, state, width, route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")));
      if (!verdict.measured) checks.push(unreached(`overflow ${route}`, "layout could not be measured"));
      else if (verdict.overflows)
        checks.push(
          failed(`overflow ${route}`, `document scrolls ${verdict.by}px horizontally; widest element ${measured.widest}`),
        );
      else checks.push(passed(`no horizontal overflow ${route}`));
    }
    axe = await runAxe(cdp);
  } catch (e) {
    checks.push(unreached("responsive", String(e.message ?? e)));
  }
  return cellFromChecks(state, width, checks, shots, axe);
}

