#!/usr/bin/env node
/**
 * Browser acceptance matrix for `/inbox` (recovery-inbox IN4/IN7, gate 8).
 *
 * Runs the nine unified-inbox acceptance states at 360 / 768 / 1280 px and at
 * 1280 px with 200% browser zoom, capturing a screenshot and an axe pass per
 * cell. It reuses `lib/acceptance-matrix.mjs`, `lib/cdp.mjs`, `lib/axe.mjs`,
 * `lib/chrome-launcher.mjs` and `lib/acceptance-browser.mjs` unchanged, so the
 * honesty rules are the ones `calendar-acceptance.mjs` and
 * `build-acceptance.mjs` obey: a cell with no screenshot is NOT-RUN, a cell axe
 * never judged is NOT-RUN, a matrix that did not run every planned cell exits
 * non-zero even when every cell it produced passed, and landing on the sign-in
 * URL is a hard error rather than a pass.
 *
 * The application is SHARED and nothing here writes to it. Two separate fences:
 *
 *  1. Every state that needs data real rows cannot reach — an empty page, a 500,
 *     a refused source, "2 of 3 mail accounts unavailable", four kinds carrying
 *     the same numeric id — is produced by pausing the real
 *     `GET /me/inbox/unified` with `Fetch.requestPaused` and fulfilling it with a
 *     body that matches `backend/src/modules/notifications/dto/unified-inbox.schemas.ts`
 *     exactly. `hooks/api/inbox.ts` parses the response through
 *     `unifiedInboxContract`, so a body that drifts from the contract is stripped
 *     and renders the empty state — which would read as a product bug.
 *
 *  2. EVERY non-GET request to `/notifications/**` and `/broadcasts/**` is
 *     intercepted and answered synthetically, in every scenario mode including
 *     passthrough, and recorded. Opening an inbox row marks it read and dismisses
 *     a broadcast; without this fence a keyboard cell would mutate a real
 *     person's inbox. The recorded writes are reported as evidence, and the
 *     keyboard state deliberately seeds `isRead: true` rows so no write fires at
 *     all during activation.
 *
 * Usage:
 *   node scripts/inbox-acceptance.mjs --self-test
 *   node scripts/inbox-acceptance.mjs \
 *     --base-url=http://127.0.0.1:1000 --cookie-file=<path> \
 *     --api-origin=http://127.0.0.1:1500 --screenshot-dir=<dir>
 *
 * Flags: --base-url= --cookie-file= --cookie-name= --settle-ms= --browser=
 *        --screenshot-dir= --out= --api-origin= --baked-api-origin= --viewports=
 *        --self-test
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findBrowser } from "./lib/chrome-launcher.mjs";
import { sleep, waitForDevTools, cdpSession, launchChrome, firstPageTarget } from "./lib/cdp.mjs";
import { axeSourcePath, axeExpression, axeVerdict, seriousViolations } from "./lib/axe.mjs";
import {
  PASS,
  FAIL,
  NOT_RUN,
  isSignInUrl,
  screenshotName,
  cellFromChecks,
  overflowVerdict,
  passed,
  failed,
  unreached,
  plannedCellCount,
  matrixIncomplete,
  summarise,
  matrixExitCode,
  renderMarkdownTable,
} from "./lib/acceptance-matrix.mjs";
import {
  ACCEPTANCE_VIEWPORTS,
  selectViewports,
  viewportLabel,
  zoomVerdict,
  envelope,
  createInterceptionStats,
  fulfilJson,
  fulfilPreflight,
  continuePaused,
  proxyBakedApiRequest,
  realClick,
  pressKey,
  setOffline,
  TAB,
  ENTER,
  SPACE,
  ESCAPE,
  focusByAccessibleNameExpression,
  pointByAccessibleNameExpression,
  activeElementExpression,
  dialogExpression,
  viewportExpression,
  overflowExpression,
  skeletonCountExpression,
  axeMainContextExpression,
} from "./lib/acceptance-browser.mjs";

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

// ------------------------------------------------------------------- states

export const INBOX_STATES = [
  { key: "loading-skeleton", label: "Loading skeleton" },
  { key: "empty", label: "Empty" },
  { key: "error-and-retry", label: "Error and retry" },
  { key: "denied-source", label: "Denied source view" },
  { key: "degraded-sources", label: "Degraded sources" },
  { key: "populated-all-kinds", label: "Populated — all kinds, colliding ids" },
  { key: "offline-and-load-more", label: "Offline and load more" },
  { key: "pending-kind-and-id", label: "Pending gated on kind and id" },
  { key: "keyboard-row-activation", label: "Keyboard row activation" },
];

// ----------------------------------------------------------------- fixtures

export const COLLIDING_ID = 900001;
export const SIBLING_NOTIFICATION_ID = 900002;

export const NOTIFICATION_SUBJECT = "Acceptance notification row";
export const SIBLING_NOTIFICATION_SUBJECT = "Acceptance sibling notification row";
export const BROADCAST_SUBJECT = "Acceptance broadcast row";
export const MAIL_SUBJECT = "Acceptance mail row";
export const APPROVAL_SUBJECT = "Acceptance approval row";
export const MAIL_SENDER = "Acceptance Harness";

export const MAIL_ROW_NAME = `Mail from ${MAIL_SENDER}: ${MAIL_SUBJECT}`;
export const APPROVAL_ROW_NAME = `Approval request: ${APPROVAL_SUBJECT}`;

export const INBOX_KINDS = ["notification", "broadcast", "mail", "build_approval"];

export const EMPTY_TITLE = "All caught up";
export const ERROR_TITLE = "Couldn’t load inbox";
export const ERROR_RETRY_NAME = "Try again";
export const DEGRADED_HEADLINE = "Some sources could not be read.";
export const DEGRADED_MAIL_ERROR = "2 of 3 mail accounts unavailable";
export const DEGRADED_MAIL_LINE = `Mail — ${DEGRADED_MAIL_ERROR}`;
export const DEGRADED_RETRY_NAME = "Retry Mail";
export const DENIED_PERMISSION = "mail:inbox:view";
export const DENIED_TITLE = "Access Restricted";
export const SHELL_OFFLINE_TEXT = "You are offline. Some features may be unavailable.";

export const LOAD_MORE_IDLE = "Load more";
export const LOAD_MORE_FETCHING = "Loading…";
export const LOAD_MORE_OFFLINE = "Offline — reconnect to load more";
export const LOAD_MORE_NAMES = [LOAD_MORE_IDLE, LOAD_MORE_FETCHING, LOAD_MORE_OFFLINE];

export const ROW_ACTION_LABELS = [
  "Archive notification",
  "Delete notification",
  "Pin notification",
  "Unpin notification",
];

export const SYNTHETIC_CURSOR = "eyJuIjo5MDAwMDAsIm50IjpudWxsLCJiIjpudWxsLCJidCI6bnVsbCwibSI6bnVsbCwiYSI6bnVsbH0";

function isoAt(now, hoursAgo) {
  return new Date(new Date(now).getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function baseFields(now, hoursAgo, subject, dedupKey, isRead) {
  return {
    sourceModule: "acceptance",
    actor: { id: "acceptance-actor", name: MAIL_SENDER, image: null },
    subject,
    timestamp: isoAt(now, hoursAgo),
    isRead,
    deepLink: null,
    dedupKey,
  };
}

export function notificationItem(now, { id = COLLIDING_ID, subject = NOTIFICATION_SUBJECT, hoursAgo = 1, isRead = false } = {}) {
  return {
    kind: "notification",
    id,
    notifType: "MENTION",
    priority: "NORMAL",
    category: "work",
    eventKey: null,
    body: "Seeded by the inbox acceptance matrix.",
    pinned: false,
    ...baseFields(now, hoursAgo, subject, `notification:${id}`, isRead),
  };
}

export function broadcastItem(now, { id = COLLIDING_ID, subject = BROADCAST_SUBJECT, hoursAgo = 2, isRead = false } = {}) {
  return {
    kind: "broadcast",
    id,
    notifType: "ANNOUNCEMENT",
    priority: "NORMAL",
    category: "announcement",
    body: "Seeded by the inbox acceptance matrix.",
    ...baseFields(now, hoursAgo, subject, `broadcast:${id}`, isRead),
  };
}

export function mailItem(now, { id = COLLIDING_ID, subject = MAIL_SUBJECT, hoursAgo = 3, isRead = false } = {}) {
  return {
    kind: "mail",
    id: String(id),
    threadId: null,
    accountId: COLLIDING_ID,
    snippet: "Seeded by the inbox acceptance matrix.",
    hasAttachments: true,
    ...baseFields(now, hoursAgo, subject, `mail:${id}`, isRead),
  };
}

export function approvalItem(now, { id = COLLIDING_ID, subject = APPROVAL_SUBJECT, hoursAgo = 4, isRead = false } = {}) {
  return {
    kind: "build_approval",
    id,
    status: "pending",
    projectId: COLLIDING_ID,
    ticketId: null,
    dueAt: isoAt(now, -24),
    ...baseFields(now, hoursAgo, subject, `build_approval:${id}`, isRead),
  };
}

export function allKindItems(now, { isRead = false } = {}) {
  return [
    notificationItem(now, { isRead }),
    broadcastItem(now, { isRead }),
    mailItem(now, { isRead }),
    approvalItem(now, { isRead }),
  ];
}

export function pendingFixtureItems(now) {
  return [
    notificationItem(now, { id: COLLIDING_ID, subject: NOTIFICATION_SUBJECT }),
    notificationItem(now, {
      id: SIBLING_NOTIFICATION_ID,
      subject: SIBLING_NOTIFICATION_SUBJECT,
      hoursAgo: 1.5,
    }),
    broadcastItem(now),
    mailItem(now),
    approvalItem(now),
  ];
}

export function sourceStatus(kind, overrides = {}) {
  return { kind, included: true, reason: null, available: true, error: null, ...overrides };
}

export function healthySources() {
  return INBOX_KINDS.map((kind) => sourceStatus(kind));
}

export function degradedSourcesFixture() {
  return INBOX_KINDS.map((kind) =>
    kind === "mail"
      ? sourceStatus("mail", { available: false, error: DEGRADED_MAIL_ERROR })
      : sourceStatus(kind),
  );
}

export function refusedMailSources() {
  return INBOX_KINDS.map((kind) =>
    kind === "mail"
      ? sourceStatus("mail", { included: false, reason: `no permission: ${DENIED_PERMISSION}` })
      : sourceStatus(kind),
  );
}

export function inboxPage(scenario) {
  return {
    items: scenario.items,
    hasMore: scenario.hasMore,
    nextCursor: scenario.nextCursor,
    sources: scenario.sources,
    degraded: scenario.degraded,
  };
}

// ------------------------------------------------------------ interception

export function classifyInboxRequest(url, method) {
  const path = String(url ?? "").split("?")[0];
  const verb = String(method ?? "GET").toUpperCase();
  if (/\/me\/inbox\/unified\/count$/.test(path)) return "unified-count";
  if (/\/me\/inbox\/unified$/.test(path)) return "unified";
  if (verb !== "GET" && /\/notifications\/events\/token$/.test(path))
    return "stream-token";
  if (verb !== "GET" && /\/notifications\//.test(path)) return "notification-write";
  if (verb !== "GET" && /\/broadcasts\//.test(path)) return "broadcast-write";
  return null;
}

export function parseInboxWrite(url, method) {
  const path = String(url ?? "").split("?")[0];
  const verb = String(method ?? "GET").toUpperCase();
  let match = path.match(/\/notifications\/(\d+)\/([a-z-]+)$/);
  if (match) return { kind: "notification", id: Number(match[1]), action: match[2], method: verb };
  match = path.match(/\/notifications\/(\d+)$/);
  if (match)
    return {
      kind: "notification",
      id: Number(match[1]),
      action: verb === "DELETE" ? "delete" : "update",
      method: verb,
    };
  match = path.match(/\/broadcasts\/([^/]+)\/dismiss$/);
  if (match) return { kind: "broadcast", id: match[1], action: "dismiss", method: verb };
  return null;
}

export function buildInboxScenario() {
  return {
    mode: "passthrough",
    delayMs: 0,
    items: [],
    sources: healthySources(),
    degraded: false,
    hasMore: false,
    nextCursor: null,
    stallWriteMs: 0,
    writes: [],
    streamTokens: [],
    unifiedRequests: [],
    stats: createInterceptionStats(),
  };
}

async function handleInboxPaused(cdp, params, scenario, origin, apiOrigin, bakedOrigin) {
  const { requestId } = params;
  const url = String(params.request?.url ?? "");
  const method = String(params.request?.method ?? "GET").toUpperCase();
  const isBaked = bakedOrigin !== "" && url.startsWith(bakedOrigin);
  const stats = scenario.stats;
  const passThrough = async () => {
    if (isBaked) return proxyBakedApiRequest(cdp, params, origin, apiOrigin, stats);
    return continuePaused(cdp, requestId, stats);
  };

  if (method === "OPTIONS") {
    if (isBaked) return fulfilPreflight(cdp, requestId, origin, stats);
    return passThrough();
  }

  const kind = classifyInboxRequest(url, method);
  if (kind === null) return passThrough();

  if (kind === "stream-token") {
    scenario.streamTokens.push({ method, url });
    return fulfilJson(cdp, requestId, origin, envelope({ success: true }), stats);
  }

  if (kind === "notification-write" || kind === "broadcast-write") {
    const write = parseInboxWrite(url, method);
    scenario.writes.push(write ?? { kind: "unknown", id: null, action: null, method, url });
    if (scenario.stallWriteMs > 0) await sleep(scenario.stallWriteMs);
    return fulfilJson(cdp, requestId, origin, envelope({ success: true }), stats);
  }

  if (kind === "unified-count") {
    if (scenario.mode === "passthrough" || scenario.mode === "delay") return passThrough();
    return fulfilJson(
      cdp,
      requestId,
      origin,
      envelope({ notification: 0, mail: 0, approval: 0, total: 0, mailExact: true }),
      stats,
    );
  }

  const parsed = new URL(url);
  scenario.unifiedRequests.push({
    kinds: parsed.searchParams.get("kinds"),
    cursor: parsed.searchParams.get("cursor"),
    limit: parsed.searchParams.get("limit"),
  });
  if (scenario.mode === "passthrough") return passThrough();
  if (scenario.mode === "delay") {
    await sleep(scenario.delayMs);
    return passThrough();
  }
  if (scenario.mode === "error")
    return fulfilJson(cdp, requestId, origin, JSON.stringify({ message: "Internal Server Error" }), stats, 500);
  return fulfilJson(cdp, requestId, origin, envelope(inboxPage(scenario)), stats);
}

// ------------------------------------------------------------- expressions

export function inboxSurfaceExpression() {
  return `(() => {
    const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();
    const h1 = document.querySelector("main h1");
    const list = document.querySelector('[role="list"][aria-label="Inbox items"]');
    const tabs = Array.from(document.querySelectorAll("main button[aria-pressed]")).map((b) => ({
      name: clean(b.textContent),
      pressed: b.getAttribute("aria-pressed") === "true",
    }));
    const statusTexts = Array.from(document.querySelectorAll('[role="status"]'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => clean(el.innerText))
      .filter((t) => t.length > 0);
    const alertTexts = Array.from(document.querySelectorAll('[role="alert"]'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => clean(el.innerText))
      .filter((t) => t.length > 0);
    const retryNames = Array.from(document.querySelectorAll("button[aria-label]"))
      .map((b) => b.getAttribute("aria-label"))
      .filter((l) => l && l.indexOf("Retry ") === 0);
    const bodyRetry = Array.from(document.querySelectorAll("button")).some(
      (b) => clean(b.textContent) === "Try again" && b.getClientRects().length > 0,
    );
    return {
      url: location.href,
      pathname: location.pathname,
      search: location.search,
      title: h1 ? clean(h1.textContent) : null,
      hasList: Boolean(list),
      tabs: tabs,
      statusTexts: statusTexts,
      alertTexts: alertTexts,
      retryNames: retryNames,
      hasInPageRetry: bodyRetry,
      onLine: navigator.onLine,
      mainText: (() => {
        const m = document.querySelector("main");
        return m ? clean(m.innerText).slice(0, 4000) : "";
      })(),
    };
  })()`;
}

export function inboxRowsExpression() {
  return `(() => {
    const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();
    const actionLabels = ${JSON.stringify(ROW_ACTION_LABELS)};
    const list = document.querySelector('[role="list"][aria-label="Inbox items"]');
    if (!list) return { found: false, rows: [] };
    const rows = Array.from(list.querySelectorAll('[role="listitem"]')).map((row) => {
      const controls = Array.from(row.querySelectorAll("button")).map((b) => {
        const rect = b.getBoundingClientRect();
        return {
          tag: b.tagName.toLowerCase(),
          type: b.getAttribute("type"),
          ariaLabel: b.getAttribute("aria-label"),
          name: clean(b.getAttribute("aria-label") || b.textContent),
          disabled: b.disabled === true || b.getAttribute("aria-disabled") === "true",
          tabIndex: b.tabIndex,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
      const primary =
        controls.find((c) => !c.ariaLabel || actionLabels.indexOf(c.ariaLabel) === -1) || null;
      const root = row.firstElementChild;
      return {
        posinset: Number(row.getAttribute("aria-posinset")),
        setsize: Number(row.getAttribute("aria-setsize")),
        rootTag: root ? root.tagName.toLowerCase() : null,
        primary: primary,
        controls: controls,
        text: clean(row.innerText).slice(0, 300),
      };
    });
    return { found: true, rows: rows };
  })()`;
}

export function clickWithinMainExpression(selector, name) {
  return `(() => {
    const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();
    const scope = document.querySelector("main") || document.body;
    const target = Array.from(scope.querySelectorAll(${JSON.stringify(selector)}))
      .filter((el) => el.getClientRects().length > 0)
      .find((el) => clean(el.getAttribute("aria-label") || el.textContent) === ${JSON.stringify(name)});
    if (!target) return false;
    target.click();
    return true;
  })()`;
}

export function clickRowActionExpression(rowName, actionLabel) {
  return `(() => {
    const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();
    const list = document.querySelector('[role="list"][aria-label="Inbox items"]');
    if (!list) return false;
    const row = Array.from(list.querySelectorAll('[role="listitem"]')).find((item) =>
      Array.from(item.querySelectorAll("button")).some(
        (b) => clean(b.getAttribute("aria-label") || b.textContent) === ${JSON.stringify(rowName)},
      ),
    );
    if (!row) return false;
    const action = Array.from(row.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === ${JSON.stringify(actionLabel)},
    );
    if (!action) return false;
    action.click();
    return true;
  })()`;
}

export function splitInboxRows(rows) {
  const items = [];
  let loadMore = null;
  for (const row of rows ?? []) {
    const name = row?.primary?.name ?? "";
    if (LOAD_MORE_NAMES.includes(name)) loadMore = row.primary;
    else items.push(row);
  }
  return { items, loadMore };
}

// ---------------------------------------------------------------- verdicts

export function rowIdentityVerdict(rows, expectedNames) {
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, reason: "the inbox list rendered no rows" };
  const names = rows.map((r) => r.primary?.name ?? "");
  const missing = expectedNames.filter((n) => !names.includes(n));
  if (missing.length > 0)
    return { ok: false, reason: `rows missing from the list: ${missing.join(", ")}` };
  if (rows.length !== expectedNames.length)
    return {
      ok: false,
      reason: `${rows.length} rows rendered for ${expectedNames.length} seeded items — colliding ids across kinds collapsed or duplicated a row`,
    };
  return { ok: true, reason: null };
}

export function nativeButtonVerdict(rows) {
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, measured: false, reason: "no rows were rendered to inspect" };
  const offenders = [];
  for (const row of rows) {
    const primary = row.primary;
    if (!primary) {
      offenders.push(`"${row.text.slice(0, 60)}" exposes no button at all`);
      continue;
    }
    if (primary.tag !== "button")
      offenders.push(`"${primary.name}" activates a <${primary.tag}>, not a native button`);
    else if (primary.type !== "button")
      offenders.push(`"${primary.name}" is a button with type="${primary.type}"`);
    if (primary.name.length === 0)
      offenders.push(`a row button in "${row.text.slice(0, 60)}" has no accessible name`);
    if (Number(primary.tabIndex) < 0)
      offenders.push(`"${primary.name}" carries tabindex="${primary.tabIndex}" and cannot be tabbed to`);
  }
  if (offenders.length > 0) return { ok: false, measured: true, reason: offenders.join("; ") };
  return { ok: true, measured: true, reason: null };
}

export function activationVerdict(observations) {
  if (!Array.isArray(observations) || observations.length === 0)
    return { ok: false, reason: "no row was activated" };
  const byKind = new Map();
  for (const obs of observations) {
    if (!byKind.has(obs.kind)) byKind.set(obs.kind, []);
    byKind.get(obs.kind).push(obs);
  }
  const problems = [];
  for (const [kind, list] of byKind) {
    const vias = list.map((o) => o.via);
    for (const required of ["enter", "space", "click"])
      if (!vias.includes(required)) problems.push(`${kind}: ${required} was never dispatched`);
    const blank = list.filter((o) => !o.observed);
    if (blank.length > 0)
      problems.push(`${kind}: ${blank.map((o) => o.via).join(", ")} reached no handler`);
    const distinct = new Set(list.filter((o) => o.observed).map((o) => o.observed));
    if (distinct.size > 1)
      problems.push(
        `${kind}: Enter/Space/click reached different handlers — ${list
          .map((o) => `${o.via}=${o.observed || "nothing"}`)
          .join(" | ")}`,
      );
  }
  if (problems.length > 0) return { ok: false, reason: problems.join("; ") };
  return { ok: true, reason: null };
}

export function loadMoreVerdict(control, expectedName, expectedDisabled) {
  if (!control) return { ok: false, reason: "no load-more control was rendered for a page with hasMore" };
  if (control.name !== expectedName)
    return { ok: false, reason: `the load-more control reads "${control.name}", expected "${expectedName}"` };
  if (control.disabled !== expectedDisabled)
    return {
      ok: false,
      reason: `the load-more control is ${control.disabled ? "disabled" : "enabled"}, expected ${expectedDisabled ? "disabled" : "enabled"}`,
    };
  return { ok: true, reason: null };
}

export function degradedBannerVerdict({ statusTexts, retryNames, itemRowCount }) {
  const texts = statusTexts ?? [];
  const banner = texts.find((t) => t.includes(DEGRADED_HEADLINE));
  if (!banner)
    return { ok: false, reason: "a degraded page announced no source failure on the surface" };
  if (!banner.includes(DEGRADED_MAIL_LINE))
    return {
      ok: false,
      reason: `the banner does not name the failed source — expected "${DEGRADED_MAIL_LINE}" in "${banner.slice(0, 200)}"`,
    };
  if (!(retryNames ?? []).includes(DEGRADED_RETRY_NAME))
    return { ok: false, reason: `the degraded banner offers no "${DEGRADED_RETRY_NAME}" control` };
  if (!(itemRowCount > 0))
    return { ok: false, reason: "one failed source took the healthy sources' rows with it" };
  return { ok: true, reason: null };
}

export function deniedVerdict({ statusTexts, mainText, itemRowCount }) {
  const denied = (statusTexts ?? []).find((t) => t.includes(DENIED_TITLE));
  if (!denied)
    return {
      ok: false,
      reason: String(mainText ?? "").includes(EMPTY_TITLE)
        ? "a refused source rendered the empty state instead of a denied state"
        : "a refused source rendered no denied state",
    };
  if (!denied.includes(DENIED_PERMISSION))
    return { ok: false, reason: `the denied state does not name the refused permission ${DENIED_PERMISSION}` };
  if (itemRowCount > 0)
    return { ok: false, reason: "a denied view still rendered inbox rows" };
  return { ok: true, reason: null };
}

export function emptyVerdict({ mainText, alertTexts, statusTexts }) {
  const text = String(mainText ?? "");
  if (!text.includes(EMPTY_TITLE))
    return { ok: false, reason: `an empty page did not render "${EMPTY_TITLE}"` };
  if ((alertTexts ?? []).length > 0)
    return { ok: false, reason: `empty is dressed as an error: ${alertTexts.join(" | ")}` };
  const degraded = (statusTexts ?? []).find((t) => t.includes(DEGRADED_HEADLINE));
  if (degraded) return { ok: false, reason: "an empty page raised a source-failure banner" };
  return { ok: true, reason: null };
}

export function errorVerdict({ alertTexts, hasInPageRetry }) {
  const alert = (alertTexts ?? []).find((t) => t.includes(ERROR_TITLE));
  if (!alert)
    return { ok: false, reason: `a 500 on /me/inbox/unified rendered no "${ERROR_TITLE}" alert` };
  if (hasInPageRetry !== true)
    return { ok: false, reason: `the error state offered no "${ERROR_RETRY_NAME}" control` };
  return { ok: true, reason: null };
}

export function retryVerdict(before, after) {
  if (!(after > before))
    return { ok: false, reason: "the retry control issued no new GET /me/inbox/unified" };
  return { ok: true, reason: null };
}

export function pendingIsolationVerdict({ during, targetName, siblingName, otherKindNames }) {
  const rows = during ?? [];
  const names = rows.map((r) => r.primary?.name ?? "");
  if (names.length === 0)
    return { ok: false, measured: false, reason: "the list was empty while the archive was in flight" };
  if (names.includes(targetName))
    return {
      ok: false,
      measured: false,
      reason: "the archived notification was still listed in every sample, so no in-flight state was observed",
    };
  const missingOther = otherKindNames.filter((n) => !names.includes(n));
  if (missingOther.length > 0)
    return {
      ok: false,
      measured: true,
      reason: `archiving notification ${COLLIDING_ID} also removed rows of another kind carrying the same id: ${missingOther.join(", ")}`,
    };
  if (!names.includes(siblingName))
    return {
      ok: false,
      measured: true,
      reason: `archiving notification ${COLLIDING_ID} also removed notification ${SIBLING_NOTIFICATION_ID}`,
    };
  const sibling = rows.find((r) => (r.primary?.name ?? "") === siblingName);
  const busy = (sibling?.controls ?? []).filter((c) => c.disabled === true);
  if (busy.length > 0)
    return {
      ok: false,
      measured: true,
      reason: `notification ${SIBLING_NOTIFICATION_ID} shows a pending control (${busy
        .map((c) => c.name)
        .join(", ")}) while a different notification is archiving — pending is not gated on the id`,
    };
  const strangers = rows.filter(
    (r) => otherKindNames.includes(r.primary?.name ?? "") && r.controls.some((c) => c.disabled === true),
  );
  if (strangers.length > 0)
    return {
      ok: false,
      measured: true,
      reason: `a row of another kind shows a pending control while a notification is archiving: ${strangers
        .map((r) => r.primary?.name)
        .join(", ")}`,
    };
  return { ok: true, measured: true, reason: null };
}

export function writeFenceVerdict(writes, allowed) {
  const unexpected = (writes ?? []).filter(
    (w) => !allowed.some((a) => a.kind === w.kind && String(a.id) === String(w.id) && a.action === w.action),
  );
  if (unexpected.length > 0)
    return {
      ok: false,
      reason: `unexpected writes were attempted: ${unexpected
        .map((w) => `${w.method} ${w.kind}:${w.id}:${w.action}`)
        .join(", ")}`,
    };
  return { ok: true, reason: null };
}

// --------------------------------------------------------------- self-test

function runSelfTest() {
  const failures = [];
  let passedCount = 0;
  const assert = (label, condition) => {
    if (condition) passedCount++;
    else failures.push(label);
  };
  const now = new Date("2026-09-12T12:00:00.000Z");

  assert("the matrix plans 9 states", INBOX_STATES.length === 9);
  assert("the matrix plans 4 viewports", ACCEPTANCE_VIEWPORTS.length === 4);
  assert("planned count multiplies", plannedCellCount(INBOX_STATES, ACCEPTANCE_VIEWPORTS) === 36);
  assert(
    "the zoom column halves the CSS width and doubles the pixel ratio",
    ACCEPTANCE_VIEWPORTS[3].cssWidth === 640 && ACCEPTANCE_VIEWPORTS[3].deviceScaleFactor === 2,
  );
  assert("a viewport selector that matches nothing returns nothing", selectViewports("nope").length === 0);
  assert("an absent viewport selector keeps all four", selectViewports("").length === 4);
  assert("the zoom column is labelled as zoom", viewportLabel("1280-zoom200") === "1280 px @ 200% zoom");

  assert(
    "a viewport that did not reflow fails the zoom check",
    zoomVerdict({ innerWidth: 1280, devicePixelRatio: 2 }, ACCEPTANCE_VIEWPORTS[3]).ok === false,
  );
  assert(
    "a reflowed 200% viewport passes",
    zoomVerdict({ innerWidth: 640, devicePixelRatio: 2 }, ACCEPTANCE_VIEWPORTS[3]).ok === true,
  );
  assert("an unmeasured viewport is not a pass", zoomVerdict(null, ACCEPTANCE_VIEWPORTS[0]).ok === false);

  assert("the unified read is classified", classifyInboxRequest("http://h/me/inbox/unified?limit=25", "GET") === "unified");
  assert("the unified count is classified", classifyInboxRequest("http://h/me/inbox/unified/count", "GET") === "unified-count");
  assert(
    "a notification write is claimed by the fence",
    classifyInboxRequest("http://h/notifications/5/read", "PATCH") === "notification-write",
  );
  assert(
    "a broadcast dismiss is claimed by the fence",
    classifyInboxRequest("http://h/broadcasts/5/dismiss", "POST") === "broadcast-write",
  );
  assert(
    "a notification READ is not claimed — the list still comes from the real API",
    classifyInboxRequest("http://h/notifications?limit=20", "GET") === null,
  );
  assert(
    "the realtime stream's token mint is named, not counted as an inbox write",
    classifyInboxRequest("http://h/notifications/events/token", "POST") === "stream-token",
  );
  assert(
    "naming the token mint did not stop the fence claiming a real notification write",
    classifyInboxRequest("http://h/notifications/900001/archive", "PATCH") === "notification-write",
  );
  assert("an unrelated read is not claimed", classifyInboxRequest("http://h/build/all", "GET") === null);

  assert(
    "an archive write parses to kind, id and action",
    JSON.stringify(parseInboxWrite("http://h/notifications/901/archive", "PATCH")) ===
      JSON.stringify({ kind: "notification", id: 901, action: "archive", method: "PATCH" }),
  );
  assert(
    "a delete write parses to the delete action",
    parseInboxWrite("http://h/notifications/901", "DELETE").action === "delete",
  );
  assert(
    "a broadcast dismiss keeps its id as a string",
    parseInboxWrite("http://h/broadcasts/abc/dismiss", "POST").id === "abc",
  );
  assert("an unparseable write is null", parseInboxWrite("http://h/notifications", "POST") === null);

  assert("the envelope is what api-client unwraps", JSON.parse(envelope({ a: 1 })).data.a === 1);

  const kinds = allKindItems(now);
  assert("the all-kinds fixture seeds one row per kind", kinds.length === 4);
  assert(
    "every kind of the discriminated union is present",
    INBOX_KINDS.every((k) => kinds.some((i) => i.kind === k)),
  );
  assert(
    "all four kinds carry the SAME numeric id — that is the point of the fixture",
    kinds.every((i) => String(i.id) === String(COLLIDING_ID)),
  );
  assert(
    "dedupKey still distinguishes them, so a correct list renders four rows",
    new Set(kinds.map((i) => i.dedupKey)).size === 4,
  );
  assert(
    "the mail row's accessible name follows the component's aria-label template",
    MAIL_ROW_NAME === `Mail from ${MAIL_SENDER}: ${MAIL_SUBJECT}`,
  );
  assert("the approval row's accessible name follows its template", APPROVAL_ROW_NAME === `Approval request: ${APPROVAL_SUBJECT}`);
  assert("mail ids are strings on the wire", typeof mailItem(now).id === "string");
  assert("the pending fixture seeds two notifications plus three colliding kinds", pendingFixtureItems(now).length === 5);

  assert("healthy sources report every kind available", healthySources().every((s) => s.available && s.error === null));
  assert(
    "the degraded fixture leaves mail unavailable with the backend's own string",
    degradedSourcesFixture().find((s) => s.kind === "mail").error === DEGRADED_MAIL_ERROR,
  );
  assert(
    "the refused fixture uses the backend's permission-reason prefix",
    refusedMailSources().find((s) => s.kind === "mail").reason === `no permission: ${DENIED_PERMISSION}`,
  );
  assert(
    "a refused source is still reported available — refusal is not failure",
    refusedMailSources().find((s) => s.kind === "mail").available === true,
  );

  const page = inboxPage({ items: kinds, hasMore: true, nextCursor: SYNTHETIC_CURSOR, sources: healthySources(), degraded: false });
  assert(
    "the page envelope carries exactly the contract's six keys",
    Object.keys(page).sort().join(",") === "degraded,hasMore,items,nextCursor,sources",
  );

  const rows = [
    { primary: { name: NOTIFICATION_SUBJECT, tag: "button", type: "button", tabIndex: 0 }, controls: [], text: "" },
    { primary: { name: BROADCAST_SUBJECT, tag: "button", type: "button", tabIndex: 0 }, controls: [], text: "" },
    { primary: { name: MAIL_ROW_NAME, tag: "button", type: "button", tabIndex: 0 }, controls: [], text: "" },
    { primary: { name: APPROVAL_ROW_NAME, tag: "button", type: "button", tabIndex: 0 }, controls: [], text: "" },
  ];
  const expectedNames = [NOTIFICATION_SUBJECT, BROADCAST_SUBJECT, MAIL_ROW_NAME, APPROVAL_ROW_NAME];
  assert("four distinct rows for four colliding ids passes", rowIdentityVerdict(rows, expectedNames).ok === true);
  assert(
    "a collapsed list fails and says so",
    rowIdentityVerdict(rows.slice(0, 3), expectedNames).reason.includes("rows missing"),
  );
  assert("an empty list is never a row-identity pass", rowIdentityVerdict([], expectedNames).ok === false);

  assert("four native row buttons pass", nativeButtonVerdict(rows).ok === true);
  assert(
    "a div activator fails",
    nativeButtonVerdict([{ primary: { name: "x", tag: "div", type: null, tabIndex: 0 }, controls: [], text: "x" }]).reason.includes(
      "not a native button",
    ),
  );
  assert(
    "an unnamed row button fails",
    nativeButtonVerdict([{ primary: { name: "", tag: "button", type: "button", tabIndex: 0 }, controls: [], text: "row" }]).ok === false,
  );
  assert(
    "a row button removed from the tab order fails",
    nativeButtonVerdict([{ primary: { name: "x", tag: "button", type: "button", tabIndex: -1 }, controls: [], text: "x" }]).reason.includes(
      "cannot be tabbed to",
    ),
  );
  assert("no rows is unmeasured, not clean", nativeButtonVerdict([]).measured === false);

  const sameHandler = [
    { kind: "mail", via: "enter", observed: "nav:/mail?messageId=900001" },
    { kind: "mail", via: "space", observed: "nav:/mail?messageId=900001" },
    { kind: "mail", via: "click", observed: "nav:/mail?messageId=900001" },
  ];
  assert("Enter, Space and click reaching one handler passes", activationVerdict(sameHandler).ok === true);
  assert(
    "a missing Space dispatch is not a pass",
    activationVerdict([sameHandler[0], sameHandler[2]]).reason.includes("space was never dispatched"),
  );
  assert(
    "Space reaching nothing fails",
    activationVerdict([
      sameHandler[0],
      { kind: "mail", via: "space", observed: null },
      sameHandler[2],
    ]).reason.includes("reached no handler"),
  );
  assert(
    "three activations reaching different handlers fails",
    activationVerdict([
      sameHandler[0],
      { kind: "mail", via: "space", observed: "nav:/build/approvals" },
      sameHandler[2],
    ]).reason.includes("different handlers"),
  );
  assert("no activation at all is not a pass", activationVerdict([]).ok === false);

  assert(
    "an enabled Load more passes",
    loadMoreVerdict({ name: LOAD_MORE_IDLE, disabled: false }, LOAD_MORE_IDLE, false).ok === true,
  );
  assert(
    "an offline Load more that is still enabled fails",
    loadMoreVerdict({ name: LOAD_MORE_OFFLINE, disabled: false }, LOAD_MORE_OFFLINE, true).reason.includes("enabled"),
  );
  assert(
    "an offline page that never changed the control text fails",
    loadMoreVerdict({ name: LOAD_MORE_IDLE, disabled: true }, LOAD_MORE_OFFLINE, true).ok === false,
  );
  assert("a missing control is not a pass", loadMoreVerdict(null, LOAD_MORE_IDLE, false).ok === false);
  assert(
    "the offline label uses the component's em dash",
    LOAD_MORE_OFFLINE === "Offline — reconnect to load more",
  );

  const degradedBanner = `${DEGRADED_HEADLINE} Everything listed below is still current. Mail — ${DEGRADED_MAIL_ERROR} Retry`;
  assert(
    "a banner naming the failed source, offering retry, over surviving rows passes",
    degradedBannerVerdict({ statusTexts: [degradedBanner], retryNames: [DEGRADED_RETRY_NAME], itemRowCount: 2 }).ok === true,
  );
  assert(
    "a degraded page that announced nothing fails",
    degradedBannerVerdict({ statusTexts: [], retryNames: [], itemRowCount: 2 }).ok === false,
  );
  assert(
    "a banner that does not name the failed source fails",
    degradedBannerVerdict({
      statusTexts: [`${DEGRADED_HEADLINE} Everything listed below is still current.`],
      retryNames: [DEGRADED_RETRY_NAME],
      itemRowCount: 2,
    }).reason.includes("does not name the failed source"),
  );
  assert(
    "a degraded source that took the healthy rows with it fails",
    degradedBannerVerdict({ statusTexts: [degradedBanner], retryNames: [DEGRADED_RETRY_NAME], itemRowCount: 0 }).reason.includes(
      "took the healthy sources",
    ),
  );
  assert(
    "a banner with no retry control fails",
    degradedBannerVerdict({ statusTexts: [degradedBanner], retryNames: [], itemRowCount: 2 }).ok === false,
  );

  const deniedText = `${DENIED_TITLE} This inbox view is not available to your role. ${DENIED_PERMISSION} Contact your administrator to request access.`;
  assert(
    "a denied view naming its permission passes",
    deniedVerdict({ statusTexts: [deniedText], mainText: deniedText, itemRowCount: 0 }).ok === true,
  );
  assert(
    "a refused source rendered as an empty success fails loudly",
    deniedVerdict({ statusTexts: [], mainText: `Inbox ${EMPTY_TITLE}`, itemRowCount: 0 }).reason.includes(
      "empty state instead of a denied state",
    ),
  );
  assert(
    "a denied state that hides the permission key fails",
    deniedVerdict({ statusTexts: [`${DENIED_TITLE} nope`], mainText: "", itemRowCount: 0 }).ok === false,
  );
  assert(
    "a denied view still listing rows fails",
    deniedVerdict({ statusTexts: [deniedText], mainText: deniedText, itemRowCount: 3 }).ok === false,
  );

  assert(
    "an empty page with the empty copy and no failure surface passes",
    emptyVerdict({ mainText: `Inbox ${EMPTY_TITLE} Notifications, mail and approvals`, alertTexts: [], statusTexts: [] }).ok === true,
  );
  assert(
    "an empty page dressed as an error fails",
    emptyVerdict({ mainText: EMPTY_TITLE, alertTexts: [ERROR_TITLE], statusTexts: [] }).ok === false,
  );
  assert(
    "an empty page raising a degraded banner fails",
    emptyVerdict({ mainText: EMPTY_TITLE, alertTexts: [], statusTexts: [degradedBanner] }).ok === false,
  );
  assert("a page with no empty copy fails", emptyVerdict({ mainText: "Inbox", alertTexts: [], statusTexts: [] }).ok === false);

  assert(
    "a 500 announced as an alert with a retry passes",
    errorVerdict({ alertTexts: [`${ERROR_TITLE} Something went wrong`], hasInPageRetry: true }).ok === true,
  );
  assert("a 500 that announced nothing fails", errorVerdict({ alertTexts: [], hasInPageRetry: true }).ok === false);
  assert(
    "an error with no way back fails",
    errorVerdict({ alertTexts: [ERROR_TITLE], hasInPageRetry: false }).reason.includes(ERROR_RETRY_NAME),
  );
  assert("the error title uses the component's typographic apostrophe", ERROR_TITLE === "Couldn’t load inbox");

  assert("a retry that re-issued the read passes", retryVerdict(1, 2).ok === true);
  assert("a retry that issued nothing fails", retryVerdict(2, 2).ok === false);

  const during = [
    { primary: { name: SIBLING_NOTIFICATION_SUBJECT }, controls: [{ name: "Archive notification", disabled: false }] },
    { primary: { name: BROADCAST_SUBJECT }, controls: [] },
    { primary: { name: MAIL_ROW_NAME }, controls: [] },
    { primary: { name: APPROVAL_ROW_NAME }, controls: [] },
  ];
  const otherKinds = [BROADCAST_SUBJECT, MAIL_ROW_NAME, APPROVAL_ROW_NAME];
  assert(
    "archiving one notification leaves the colliding-id rows of every other kind alone",
    pendingIsolationVerdict({ during, targetName: NOTIFICATION_SUBJECT, siblingName: SIBLING_NOTIFICATION_SUBJECT, otherKindNames: otherKinds }).ok ===
      true,
  );
  assert(
    "removing a same-id row of another kind is the defect this cell exists to catch",
    pendingIsolationVerdict({
      during: during.filter((r) => r.primary.name !== MAIL_ROW_NAME),
      targetName: NOTIFICATION_SUBJECT,
      siblingName: SIBLING_NOTIFICATION_SUBJECT,
      otherKindNames: otherKinds,
    }).reason.includes("same id"),
  );
  assert(
    "a sibling notification going pending too means pending is not gated on the id",
    pendingIsolationVerdict({
      during: [
        { primary: { name: SIBLING_NOTIFICATION_SUBJECT }, controls: [{ name: "Archive notification", disabled: true }] },
        ...during.slice(1),
      ],
      targetName: NOTIFICATION_SUBJECT,
      siblingName: SIBLING_NOTIFICATION_SUBJECT,
      otherKindNames: otherKinds,
    }).reason.includes("not gated on the id"),
  );
  assert(
    "a sample where the target never left the list is unmeasured, not clean",
    pendingIsolationVerdict({
      during: [{ primary: { name: NOTIFICATION_SUBJECT }, controls: [] }, ...during],
      targetName: NOTIFICATION_SUBJECT,
      siblingName: SIBLING_NOTIFICATION_SUBJECT,
      otherKindNames: otherKinds,
    }).measured === false,
  );

  assert(
    "an unexpected write fails the fence",
    writeFenceVerdict([{ kind: "notification", id: 5, action: "delete", method: "DELETE" }], []).ok === false,
  );
  assert(
    "an expected write passes the fence",
    writeFenceVerdict(
      [{ kind: "notification", id: COLLIDING_ID, action: "archive", method: "PATCH" }],
      [{ kind: "notification", id: COLLIDING_ID, action: "archive" }],
    ).ok === true,
  );

  const split = splitInboxRows([
    { primary: { name: NOTIFICATION_SUBJECT } },
    { primary: { name: LOAD_MORE_IDLE } },
  ]);
  assert("the load-more row is not counted as an item", split.items.length === 1 && split.loadMore.name === LOAD_MORE_IDLE);

  assert("overflow detected", overflowVerdict({ scrollWidth: 500, innerWidth: 360 }).overflows === true);
  assert("one pixel is tolerated", overflowVerdict({ scrollWidth: 361, innerWidth: 360 }).overflows === false);
  assert("unmeasured overflow is not a pass claim", overflowVerdict({}).measured === false);

  assert("signin url is refused", isSignInUrl("http://x/signin?session=expired"));
  assert("the inbox route is not a sign-in", !isSignInUrl("http://x/inbox"));
  assert("screenshot name carries state, viewport and variant", screenshotName("empty", "360", "list") === "empty-360px-list.png");

  const shots = ["a.png"];
  const okAxe = { ran: true, reason: null, nodesChecked: 10, violations: [] };
  assert(
    "a cell with no screenshot is NOT-RUN, never PASS",
    cellFromChecks("s", "360", [passed("x")], [], okAxe).verdict === NOT_RUN,
  );
  assert(
    "a cell where axe never ran is NOT-RUN, not clean",
    cellFromChecks("s", "360", [passed("x")], shots, { ran: false, reason: "axe-not-injected" }).verdict === NOT_RUN,
  );
  assert("a failing check fails the cell", cellFromChecks("s", "360", [failed("x", "bad")], shots, okAxe).verdict === FAIL);
  assert("an unreached check is NOT-RUN", cellFromChecks("s", "360", [unreached("x", "gone")], shots, okAxe).verdict === NOT_RUN);
  assert(
    "a failure outranks an unreached check",
    cellFromChecks("s", "360", [unreached("a", "g"), failed("b", "bad")], shots, okAxe).verdict === FAIL,
  );

  const allPass = new Array(36).fill(null).map(() => ({ verdict: PASS }));
  assert("a complete all-pass matrix exits 0", matrixExitCode(allPass, 36) === 0);
  assert("one NOT-RUN exits 1", matrixExitCode(allPass.slice(0, 35).concat([{ verdict: NOT_RUN }]), 36) === 1);
  assert("a partial matrix exits 1 even if every cell it has passed", matrixExitCode(allPass.slice(0, 9), 36) === 1);
  assert("a short matrix is incomplete", matrixIncomplete(allPass.slice(0, 9), 36) === true);

  const table = renderMarkdownTable(
    [{ state: "empty", width: "360", verdict: PASS, screenshots: ["a.png"] }],
    ACCEPTANCE_VIEWPORTS.map((v) => v.key),
    INBOX_STATES,
    viewportLabel,
  );
  assert("the table has a row per state", table.split("\n").length === 2 + INBOX_STATES.length);
  assert("the zoom column is labelled as zoom, not as a width", table.includes("1280 px @ 200% zoom"));
  assert("the table cites the screenshot", table.includes("[shot](a.png)"));
  assert("a missing cell renders NOT-RUN", table.includes(NOT_RUN));

  const counts = summarise([{ verdict: PASS }, { verdict: FAIL }, { verdict: NOT_RUN }]);
  assert("the summary counts each verdict", counts.PASS === 1 && counts.FAIL === 1 && counts["NOT-RUN"] === 1);

  if (failures.length) {
    for (const f of failures) console.error(`  [FAIL] ${f}`);
    console.error(`\nSELF-TEST FAILED — ${failures.length} of ${failures.length + passedCount}`);
    process.exit(1);
  }
  console.log(`inbox-acceptance self-tests: ${passedCount} passed`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

// ----------------------------------------------------------------- runners

async function axeCell(ctx, checks) {
  const axe = await ctx.runAxe(ctx.cdp);
  const serious = seriousViolations(axe.violations ?? []);
  if (axe.ran && serious.length > 0)
    checks.push(
      failed("axe", `${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`),
    );
  return axe;
}

async function openInbox(ctx, wait) {
  const { cdp, navigate, evaluate, settleMs } = ctx;
  await navigate(cdp, "/inbox", wait ?? settleMs);
  for (let i = 0; i < 20; i += 1) {
    const surface = await evaluate(cdp, inboxSurfaceExpression());
    if (surface?.hasList || surface?.alertTexts?.length > 0 || String(surface?.mainText ?? "").includes(EMPTY_TITLE))
      return surface;
    await sleep(400);
  }
  return evaluate(cdp, inboxSurfaceExpression());
}

async function readRows(ctx) {
  const result = await ctx.evaluate(ctx.cdp, inboxRowsExpression());
  return splitInboxRows(result?.rows ?? []);
}

async function hoverRow(ctx, name) {
  const point = await ctx.evaluate(ctx.cdp, pointByAccessibleNameExpression(name));
  if (!point) return false;
  await ctx.cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, buttons: 0 });
  await sleep(250);
  return true;
}

async function runLoadingSkeleton(ctx) {
  const state = "loading-skeleton";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "delay";
    scenario.delayMs = 4000;
    await cdp.send("Page.navigate", { url: `${ctx.baseUrl}/inbox` });
    let skeletons = 0;
    for (let i = 0; i < 45 && skeletons === 0; i += 1) {
      await sleep(150);
      skeletons = Number(await evaluate(cdp, skeletonCountExpression())) || 0;
    }
    if (skeletons > 0) {
      shots.push(await screenshot(cdp, state, viewport.key, "skeleton"));
      checks.push(passed(`a delayed inbox read paints ${skeletons} skeleton blocks, not a spinner`));
    } else {
      shots.push(await screenshot(cdp, state, viewport.key, "no-skeleton"));
      checks.push(unreached("loading skeleton", "no skeleton was observed before the page settled"));
    }
    const spinners = Number(await evaluate(cdp, `document.querySelectorAll("main .animate-spin").length`)) || 0;
    if (spinners > 0)
      checks.push(failed("loading skeleton", `${spinners} spinners render inside main while the inbox loads`));
    else checks.push(passed("no page-level spinner stands in for the skeleton"));
    scenario.delayMs = 0;
    scenario.mode = "synthetic";
    scenario.items = allKindItems(ctx.now);
    scenario.sources = healthySources();
    await sleep(settleMs);
    axe = await axeCell(ctx, checks);
  } catch (e) {
    scenario.delayMs = 0;
    checks.push(unreached("loading skeleton", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runEmpty(ctx) {
  const state = "empty";
  const { cdp, viewport, screenshot, scenario } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.items = [];
    scenario.sources = healthySources();
    scenario.degraded = false;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    const surface = await openInbox(ctx);
    shots.push(await screenshot(cdp, state, viewport.key, "empty"));
    const verdict = emptyVerdict(surface ?? {});
    if (verdict.ok) checks.push(passed("an empty inbox renders its own empty state"));
    else checks.push(failed("empty state", verdict.reason));
    const { loadMore } = await readRows(ctx);
    if (loadMore) checks.push(failed("empty state", "an exhausted page still offers a load-more control"));
    else checks.push(passed("an exhausted page offers no load-more control"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("empty", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runErrorAndRetry(ctx) {
  const state = "error-and-retry";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "error";
    scenario.unifiedRequests = [];
    await openInbox(ctx, settleMs + 2500);
    const surface = await evaluate(cdp, inboxSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "500"));
    const verdict = errorVerdict(surface ?? {});
    if (verdict.ok) checks.push(passed("a 500 on the unified read is announced with a retry"));
    else checks.push(failed("error state", verdict.reason));

    const before = scenario.unifiedRequests.length;
    const clicked = (await evaluate(cdp, clickWithinMainExpression("button", ERROR_RETRY_NAME))) === true;
    if (!clicked) {
      checks.push(failed("retry", `the error surface offered no operable "${ERROR_RETRY_NAME}" control`));
    } else {
      await sleep(settleMs);
      const retry = retryVerdict(before, scenario.unifiedRequests.length);
      if (retry.ok) checks.push(passed(`"${ERROR_RETRY_NAME}" re-issues GET /me/inbox/unified`));
      else checks.push(failed("retry", retry.reason));
    }

    scenario.mode = "synthetic";
    scenario.items = allKindItems(ctx.now);
    scenario.sources = healthySources();
    await sleep(settleMs);
    const recovered = await evaluate(cdp, inboxSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "recovered"));
    if (recovered?.hasList) checks.push(passed("a healthy read after the failure restores the list in place"));
    else checks.push(failed("recovery", "the inbox never recovered after the read started succeeding again"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("error and retry", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runDeniedSource(ctx) {
  const state = "denied-source";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.items = [];
    scenario.sources = refusedMailSources();
    scenario.degraded = false;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    await openInbox(ctx);
    const opened = (await evaluate(cdp, clickWithinMainExpression("button[aria-pressed]", "Mail"))) === true;
    if (!opened) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-tab"));
      checks.push(unreached("denied view", 'the "Mail" view tab could not be operated'));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }
    await sleep(settleMs);
    const surface = await evaluate(cdp, inboxSurfaceExpression());
    const { items } = await readRows(ctx);
    shots.push(await screenshot(cdp, state, viewport.key, "denied"));
    const verdict = deniedVerdict({
      statusTexts: surface?.statusTexts ?? [],
      mainText: surface?.mainText ?? "",
      itemRowCount: items.length,
    });
    if (verdict.ok) checks.push(passed("a source the reader may not read renders a denied state naming the permission"));
    else checks.push(failed("denied state", verdict.reason));

    const allTab = (surface?.tabs ?? []).find((t) => t.name === "All");
    if (allTab && allTab.pressed === true)
      checks.push(failed("denied state", "the Mail tab did not become the active view"));
    else checks.push(passed("the denied state belongs to the Mail view, not the whole surface"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("denied source", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runDegradedSources(ctx) {
  const state = "degraded-sources";
  const { cdp, viewport, evaluate, screenshot, scenario } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.items = [notificationItem(ctx.now), approvalItem(ctx.now)];
    scenario.sources = degradedSourcesFixture();
    scenario.degraded = true;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    const surface = await openInbox(ctx);
    const { items } = await readRows(ctx);
    shots.push(await screenshot(cdp, state, viewport.key, "degraded"));
    const verdict = degradedBannerVerdict({
      statusTexts: surface?.statusTexts ?? [],
      retryNames: surface?.retryNames ?? [],
      itemRowCount: items.length,
    });
    if (verdict.ok)
      checks.push(passed(`a partially failed source is announced as "${DEGRADED_MAIL_LINE}" over surviving rows`));
    else checks.push(failed("degraded banner", verdict.reason));

    if ((surface?.alertTexts ?? []).length > 0)
      checks.push(
        failed("degraded banner", `a partial failure replaced the page with an error: ${surface.alertTexts.join(" | ")}`),
      );
    else checks.push(passed("a partial failure degrades in place rather than replacing the page"));

    const overflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    if (!overflow.measured) checks.push(unreached("overflow", "layout could not be measured"));
    else if (overflow.overflows)
      checks.push(failed("overflow", `the degraded banner pushes the document ${overflow.by}px horizontally`));
    else checks.push(passed("the degraded banner introduces no horizontal overflow"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("degraded sources", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runPopulatedAllKinds(ctx) {
  const state = "populated-all-kinds";
  const { cdp, viewport, evaluate, screenshot, scenario } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.items = allKindItems(ctx.now);
    scenario.sources = healthySources();
    scenario.degraded = false;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    await openInbox(ctx);
    const { items } = await readRows(ctx);
    shots.push(await screenshot(cdp, state, viewport.key, "rows"));
    const expected = [NOTIFICATION_SUBJECT, BROADCAST_SUBJECT, MAIL_ROW_NAME, APPROVAL_ROW_NAME];
    const identity = rowIdentityVerdict(items, expected);
    if (identity.ok)
      checks.push(
        passed(`all four kinds render as distinct rows although every one carries id ${COLLIDING_ID}`),
      );
    else checks.push(failed("row identity", identity.reason));

    const setsizes = new Set(items.map((r) => r.setsize).filter((n) => Number.isFinite(n)));
    if (setsizes.size === 1 && setsizes.has(items.length))
      checks.push(passed(`the list reports aria-setsize ${items.length}`));
    else if (items.length > 0)
      checks.push(
        failed("row identity", `aria-setsize is ${Array.from(setsizes).join("/")} for ${items.length} rendered rows`),
      );

    const native = nativeButtonVerdict(items);
    if (native.ok) checks.push(passed("every row variant exposes a native, named, tabbable button"));
    else if (!native.measured) checks.push(unreached("row buttons", native.reason));
    else checks.push(failed("row buttons", native.reason));

    const overflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    if (!overflow.measured) checks.push(unreached("overflow", "layout could not be measured"));
    else if (overflow.overflows)
      checks.push(failed("overflow", `the populated list scrolls ${overflow.by}px horizontally`));
    else checks.push(passed("no horizontal overflow in the populated list"));

    const measured = await evaluate(cdp, viewportExpression());
    const zoom = zoomVerdict(measured, viewport);
    if (zoom.ok) checks.push(passed(`viewport is ${viewport.label}`));
    else checks.push(failed("viewport", zoom.reason));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("populated", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runOfflineAndLoadMore(ctx) {
  const state = "offline-and-load-more";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.items = allKindItems(ctx.now);
    scenario.sources = healthySources();
    scenario.degraded = false;
    scenario.hasMore = true;
    scenario.nextCursor = SYNTHETIC_CURSOR;
    await openInbox(ctx);

    const online = await readRows(ctx);
    const idle = loadMoreVerdict(online.loadMore, LOAD_MORE_IDLE, false);
    if (idle.ok) checks.push(passed(`a page with more rows offers an enabled "${LOAD_MORE_IDLE}"`));
    else checks.push(failed("load more", idle.reason));

    await setOffline(cdp, true);
    await sleep(1200);
    const offlineRows = await readRows(ctx);
    const offlineSurface = await evaluate(cdp, inboxSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "offline"));
    const offline = loadMoreVerdict(offlineRows.loadMore, LOAD_MORE_OFFLINE, true);
    if (offline.ok) checks.push(passed("going offline relabels and genuinely disables the load-more control"));
    else checks.push(failed("load more offline", offline.reason));

    if (offlineSurface?.onLine === false) checks.push(passed("the page observes navigator.onLine === false"));
    else checks.push(failed("offline", "the page never saw the offline transition"));

    const announced = (offlineSurface?.statusTexts ?? []).some((t) => t.includes(SHELL_OFFLINE_TEXT));
    if (announced) checks.push(passed("being offline is announced in a live region"));
    else checks.push(failed("offline", "nothing on screen announces that the reader is offline"));

    await setOffline(cdp, false);
    await sleep(1500);
    const restoredRows = await readRows(ctx);
    const restored = loadMoreVerdict(restoredRows.loadMore, LOAD_MORE_IDLE, false);
    if (restored.ok) checks.push(passed("reconnecting restores the load-more control"));
    else checks.push(failed("load more reconnect", restored.reason));

    const before = scenario.unifiedRequests.length;
    const clicked =
      (await realClick(cdp, evaluate, LOAD_MORE_IDLE)) ||
      (await evaluate(cdp, clickWithinMainExpression("button", LOAD_MORE_IDLE))) === true;
    if (!clicked) {
      checks.push(failed("load more", "the load-more control could not be clicked after reconnecting"));
    } else {
      await sleep(settleMs);
      const issued = scenario.unifiedRequests.slice(before);
      shots.push(await screenshot(cdp, state, viewport.key, "loaded"));
      if (issued.some((r) => typeof r.cursor === "string" && r.cursor.length > 0))
        checks.push(passed("load more requests the next page with the server's cursor"));
      else
        checks.push(
          failed(
            "load more",
            `load more issued ${issued.length} request(s) and none carried a cursor — the reader cannot reach page two`,
          ),
        );
    }
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("offline and load more", String(e.message ?? e)));
  } finally {
    await setOffline(ctx.cdp, false).catch(() => {});
    ctx.scenario.hasMore = false;
    ctx.scenario.nextCursor = null;
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runPendingKindAndId(ctx) {
  const state = "pending-kind-and-id";
  const { cdp, viewport, evaluate, screenshot, scenario } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  const samples = [];
  try {
    scenario.mode = "synthetic";
    scenario.items = pendingFixtureItems(ctx.now);
    scenario.sources = healthySources();
    scenario.degraded = false;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    scenario.writes = [];
    await openInbox(ctx);

    const before = await readRows(ctx);
    const seeded = rowIdentityVerdict(before.items, [
      NOTIFICATION_SUBJECT,
      SIBLING_NOTIFICATION_SUBJECT,
      BROADCAST_SUBJECT,
      MAIL_ROW_NAME,
      APPROVAL_ROW_NAME,
    ]);
    if (!seeded.ok) {
      shots.push(await screenshot(cdp, state, viewport.key, "not-seeded"));
      checks.push(unreached("pending fixture", seeded.reason));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }

    await hoverRow(ctx, NOTIFICATION_SUBJECT);
    scenario.stallWriteMs = 8000;
    const archived =
      (await evaluate(cdp, clickRowActionExpression(NOTIFICATION_SUBJECT, "Archive notification"))) === true;
    if (!archived) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-archive"));
      checks.push(unreached("pending state", 'no "Archive notification" control could be operated on the target row'));
      scenario.stallWriteMs = 0;
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }

    for (const delay of [120, 200, 350, 600]) {
      await sleep(delay);
      const sample = await readRows(ctx);
      samples.push(sample.items.map((r) => r.primary?.name ?? ""));
      const verdict = pendingIsolationVerdict({
        during: sample.items,
        targetName: NOTIFICATION_SUBJECT,
        siblingName: SIBLING_NOTIFICATION_SUBJECT,
        otherKindNames: [BROADCAST_SUBJECT, MAIL_ROW_NAME, APPROVAL_ROW_NAME],
      });
      if (verdict.measured) {
        shots.push(await screenshot(cdp, state, viewport.key, "in-flight"));
        if (verdict.ok)
          checks.push(
            passed(
              `an in-flight archive of notification ${COLLIDING_ID} touches only that row — the broadcast, mail and approval rows carrying id ${COLLIDING_ID} and notification ${SIBLING_NOTIFICATION_ID} are untouched`,
            ),
          );
        else checks.push(failed("pending identity", verdict.reason));
        break;
      }
      if (delay === 600) {
        shots.push(await screenshot(cdp, state, viewport.key, "unsampled"));
        checks.push(unreached("pending identity", verdict.reason));
      }
    }

    const writes = scenario.writes;
    if (writes.length === 1 && writes[0].kind === "notification" && writes[0].id === COLLIDING_ID && writes[0].action === "archive")
      checks.push(passed(`the archive dispatched exactly PATCH /notifications/${COLLIDING_ID}/archive`));
    else
      checks.push(
        failed(
          "pending dispatch",
          `the archive dispatched ${writes.length} write(s): ${writes.map((w) => `${w.method} ${w.kind}:${w.id}:${w.action}`).join(", ") || "none"}`,
        ),
      );
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("pending state", String(e.message ?? e)));
  } finally {
    ctx.scenario.stallWriteMs = 0;
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.pendingSamples = samples;
  cellResult.unobservable =
    "Broadcast, mail and approval rows render no archive or delete control at all, so the KIND half of the pending gate has no DOM affordance to disable. What this cell proves is the ID half (a sibling notification stays idle) and that an archive keyed on a bare numeric id would have removed the three same-id rows of other kinds.";
  return cellResult;
}

const ACTIVATION_TARGETS = [
  { kind: "notification", name: NOTIFICATION_SUBJECT, observable: "dialog" },
  { kind: "broadcast", name: BROADCAST_SUBJECT, observable: "dialog" },
  { kind: "mail", name: MAIL_ROW_NAME, observable: "navigation" },
  { kind: "build_approval", name: APPROVAL_ROW_NAME, observable: "navigation" },
];

async function activateRow(ctx, target, via) {
  const { cdp, evaluate, settleMs } = ctx;
  const focus = await evaluate(cdp, focusByAccessibleNameExpression(target.name));
  if (focus?.focused !== true) return { focus, observed: null };
  if (via === "click") await realClick(cdp, evaluate, target.name);
  else await pressKey(cdp, via === "enter" ? ENTER : SPACE);
  await sleep(Math.max(1200, Math.round(settleMs / 2)));

  if (target.observable === "dialog") {
    const dialog = await evaluate(cdp, dialogExpression());
    const observed = dialog?.open === true ? `dialog:${String(dialog.text ?? "").slice(0, 120)}` : null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const open = await evaluate(cdp, dialogExpression());
      if (open?.open !== true) break;
      await pressKey(cdp, ESCAPE);
      await sleep(700);
    }
    return { focus, observed };
  }
  const surface = await evaluate(cdp, inboxSurfaceExpression());
  const path = String(surface?.pathname ?? "");
  const observed = path !== "/inbox" ? `nav:${path}${surface?.search ?? ""}` : null;
  if (path !== "/inbox") {
    await evaluate(cdp, "history.back()");
    await sleep(Math.max(1500, Math.round(settleMs / 2)));
  }
  return { focus, observed };
}

async function runKeyboardRowActivation(ctx) {
  const state = "keyboard-row-activation";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  const observations = [];
  try {
    scenario.mode = "synthetic";
    scenario.items = allKindItems(ctx.now, { isRead: true });
    scenario.sources = healthySources();
    scenario.degraded = false;
    scenario.hasMore = false;
    scenario.nextCursor = null;
    scenario.writes = [];
    await openInbox(ctx);

    const { items } = await readRows(ctx);
    const native = nativeButtonVerdict(items);
    shots.push(await screenshot(cdp, state, viewport.key, "rows"));
    if (native.ok) checks.push(passed("all four row variants are native, named, tabbable buttons"));
    else if (!native.measured) checks.push(unreached("row buttons", native.reason));
    else checks.push(failed("row buttons", native.reason));

    await evaluate(cdp, "document.body.focus()");
    let reached = null;
    for (let i = 0; i < 80 && reached === null; i += 1) {
      await pressKey(cdp, TAB);
      await sleep(45);
      const active = await evaluate(cdp, activeElementExpression());
      const name = String(active?.name ?? "");
      if (ACTIVATION_TARGETS.some((t) => t.name === name)) reached = { name, nativeButton: active?.nativeButton === true };
    }
    if (reached && reached.nativeButton) {
      shots.push(await screenshot(cdp, state, viewport.key, "tab-focus"));
      checks.push(passed(`Tab reaches "${reached.name}" and lands on a native button`));
    } else if (reached) {
      checks.push(failed("keyboard", `Tab reached "${reached.name}" but it is not a native button`));
    } else {
      checks.push(failed("keyboard", "Tab never reached any inbox row within 80 presses"));
    }

    for (const target of ACTIVATION_TARGETS) {
      for (const via of ["enter", "space", "click"]) {
        const present = (await readRows(ctx)).items.some((r) => (r.primary?.name ?? "") === target.name);
        if (!present) {
          await openInbox(ctx);
        }
        const result = await activateRow(ctx, target, via);
        if (result.focus?.focused !== true) {
          checks.push(failed("keyboard", `"${target.name}" could not be focused for the ${via} activation`));
          continue;
        }
        if (via === "enter") {
          if (result.focus.nativeButton === true) checks.push(passed(`"${target.name}" focuses a native button`));
          else checks.push(failed("row buttons", `"${target.name}" focuses a <${result.focus.tag}>`));
        }
        observations.push({ kind: target.kind, via, observed: result.observed });
      }
    }
    shots.push(await screenshot(cdp, state, viewport.key, "activated"));

    const verdict = activationVerdict(observations);
    if (verdict.ok) checks.push(passed("Enter, Space and click reach the same handler on every row variant"));
    else checks.push(failed("keyboard activation", verdict.reason));

    const fence = writeFenceVerdict(scenario.writes, []);
    if (fence.ok) checks.push(passed("activating already-read rows attempted no write against the shared application"));
    else checks.push(failed("write fence", fence.reason));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("keyboard activation", String(e.message ?? e)));
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.activations = observations;
  return cellResult;
}

const INBOX_RUNNERS = [
  runLoadingSkeleton,
  runEmpty,
  runErrorAndRetry,
  runDeniedSource,
  runDegradedSources,
  runPopulatedAllKinds,
  runOfflineAndLoadMore,
  runPendingKindAndId,
  runKeyboardRowActivation,
];

// -------------------------------------------------------------------- main

async function main() {
  const baseUrl = flag("base-url", "http://127.0.0.1:1000").replace(/\/$/, "");
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const settleMs = Number(flag("settle-ms", "3500"));
  const browserPath = findBrowser(flag("browser", ""));
  const shotDir = flag("screenshot-dir", process.env.INBOX_ACCEPTANCE_DIR || join(tmpdir(), "inbox-acceptance"));
  const outPath = flag("out", join(shotDir, "inbox-acceptance-results.json"));
  const apiOrigin = flag("api-origin", "http://127.0.0.1:1500").replace(/\/$/, "");
  const bakedOrigin = flag("baked-api-origin", "https://api.streamlineos.in").replace(/\/$/, "");
  const viewports = selectViewports(flag("viewports", ""));

  if (!browserPath) throw new Error("no Chrome/Chromium found — pass --browser=<path>");
  if (viewports.length === 0)
    throw new Error(`--viewports matched none of ${ACCEPTANCE_VIEWPORTS.map((v) => v.key).join(",")}`);
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file is required: /inbox is an authenticated surface");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  if (!cookieValue) throw new Error("cookie file is empty");
  mkdirSync(shotDir, { recursive: true });

  const axeSource = readFileSync(axeSourcePath(), "utf8");
  const origin = new URL(baseUrl).origin;
  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);

  const { proc, debugPort } = launchChrome(browserPath);
  const cells = [];
  const planned = plannedCellCount(INBOX_STATES, viewports);
  const scenario = buildInboxScenario();
  const now = new Date();

  try {
    await waitForDevTools(debugPort, 20000);
    const cdp = await cdpSession(await firstPageTarget(debugPort));
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
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: axeSource });

    const pageErrors = [];
    cdp.on("Runtime.consoleAPICalled", (params) => {
      if (params.type !== "error") return;
      const text = (params.args ?? [])
        .map((a) => String(a.value ?? a.description ?? ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 300);
      if (text && !pageErrors.includes(text)) pageErrors.push(text);
    });
    cdp.on("Fetch.requestPaused", (params) => {
      void handleInboxPaused(cdp, params, scenario, origin, apiOrigin, bakedOrigin);
    });
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*/me/inbox*" },
        { urlPattern: "*/notifications/*" },
        { urlPattern: "*/broadcasts/*" },
        ...(bakedOrigin ? [{ urlPattern: `${bakedOrigin}/*` }] : []),
      ],
    });

    const evaluate = async (session, expression, awaitPromise = false) => {
      const r = await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
      return r.result?.value;
    };
    const navigate = async (session, path, wait = settleMs) => {
      await session.send("Page.navigate", { url: `${baseUrl}${path}` });
      await sleep(wait);
      const url = await evaluate(session, "location.href");
      if (isSignInUrl(url))
        throw new Error(`navigating to ${path} landed on ${url} — an unauthenticated run proves nothing`);
      return url;
    };
    const setViewport = async (session, viewport) =>
      session.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        mobile: viewport.mobile,
      });
    const screenshot = async (session, state, key, variant) => {
      const name = screenshotName(state, key, variant);
      const path = join(shotDir, name);
      const shot = await session.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path, Buffer.from(shot.data, "base64"));
      return path;
    };
    const runAxe = async (session) =>
      axeVerdict(await evaluate(session, axeExpression(undefined, undefined, axeMainContextExpression()), true));
    const runShellAxe = async (session) => axeVerdict(await evaluate(session, axeExpression(), true));

    await setViewport(cdp, ACCEPTANCE_VIEWPORTS[2]);
    await navigate(cdp, "/inbox");
    const pollSurface = async (attempts) => {
      let seen = await evaluate(cdp, inboxSurfaceExpression());
      for (let i = 0; i < attempts && seen?.title !== "Inbox"; i += 1) {
        await sleep(1000);
        seen = await evaluate(cdp, inboxSurfaceExpression());
      }
      return seen;
    };
    const live = await pollSurface(25);
    const livePreflight = {
      rendered: live?.title === "Inbox",
      screenshot: await screenshot(cdp, "preflight", "live", null),
      hasList: live?.hasList === true,
      tabs: live?.tabs ?? [],
      mainExcerpt: String(live?.mainText ?? "").slice(0, 400),
    };
    if (!livePreflight.rendered)
      console.error(`!  the LIVE inbox did not render for this session — main says: ${livePreflight.mainExcerpt}`);

    scenario.mode = "synthetic";
    scenario.items = allKindItems(now);
    scenario.sources = healthySources();
    await navigate(cdp, "/inbox");
    const intercepted = await pollSurface(20);
    if (intercepted?.title !== "Inbox" || intercepted?.hasList !== true) {
      await screenshot(cdp, "preflight", "intercepted", "failed");
      throw new Error(
        `preflight: ${baseUrl}/inbox did not render the unified inbox list even with every inbox read intercepted — refusing to capture a matrix against a surface that is not the inbox (main: ${String(intercepted?.mainText ?? "").slice(0, 400)})`,
      );
    }
    scenario.mode = "passthrough";
    log(`browser ${browserPath} · base ${baseUrl}`);
    log(`viewports ${viewports.map((v) => v.label).join(" / ")}`);

    const shellAxe = [];
    for (const viewport of viewports) {
      await setViewport(cdp, viewport);
      log(`--- ${viewport.label} ---`);
      const ctx = {
        cdp,
        baseUrl,
        viewport,
        navigate,
        evaluate,
        screenshot,
        runAxe,
        scenario,
        settleMs,
        now,
      };
      for (const runner of INBOX_RUNNERS) {
        const cell = await runner(ctx);
        log(`${cell.state} → ${cell.verdict}${cell.reason ? ` (${cell.reason})` : ""}`);
        cells.push(cell);
        scenario.mode = "passthrough";
        scenario.stallWriteMs = 0;
        scenario.degraded = false;
        scenario.hasMore = false;
        scenario.nextCursor = null;
        scenario.sources = healthySources();
      }
      shellAxe.push({ viewport: viewport.key, result: await runShellAxe(cdp) });
    }

    const table = renderMarkdownTable(cells, viewports.map((v) => v.key), INBOX_STATES, viewportLabel);
    const counts = summarise(cells);
    const results = {
      capturedAt: new Date().toISOString(),
      surface: "/inbox",
      lane: "recovery-inbox IN4/IN7, gate 8",
      baseUrl,
      viewports,
      planned,
      counts,
      screenshotDir: shotDir,
      apiOrigin,
      bakedOrigin,
      collidingId: COLLIDING_ID,
      siblingNotificationId: SIBLING_NOTIFICATION_ID,
      deniedPermission: DENIED_PERMISSION,
      degradedMailError: DEGRADED_MAIL_ERROR,
      livePreflight,
      interceptedWrites: scenario.writes,
      interceptedStreamTokens: scenario.streamTokens,
      unifiedRequests: scenario.unifiedRequests.slice(-60),
      pageErrors: pageErrors.slice(0, 30),
      interception: {
        fulfilled: scenario.stats.fulfilled,
        continued: scenario.stats.continued,
        proxiedToLocalBackend: scenario.stats.proxied,
        proxyFailures: scenario.stats.proxyFailures.slice(0, 20),
      },
      shellAxe,
      cells,
    };
    writeFileSync(outPath, JSON.stringify(results, null, 2));
    writeFileSync(join(shotDir, "inbox-acceptance-table.md"), `${table}\n`);
    console.log(`\n${table}\n`);
    console.log(`PASS ${counts.PASS} · FAIL ${counts.FAIL} · NOT-RUN ${counts["NOT-RUN"]} of ${planned}`);
    console.log(`results ${outPath}`);
    for (const c of cells)
      if (c.verdict !== PASS) console.error(`x  ${c.state} @ ${c.width} — ${c.verdict}: ${c.reason}`);
    if (matrixIncomplete(cells, planned))
      console.error(`x  only ${cells.length} of ${planned} cells ran — this matrix is incomplete, not clean`);
    process.exit(matrixExitCode(cells, planned));
  } finally {
    try {
      proc.kill();
    } catch {
      void 0;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
