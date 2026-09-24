#!/usr/bin/env node
/**
 * Browser acceptance matrix for `/chat` (recovery-chat CH7, gate 8).
 *
 * Runs the eleven chat acceptance states at 360 / 768 / 1280 px and at 1280 px
 * with 200% browser zoom, capturing a screenshot and an axe pass per cell. It
 * reuses `lib/acceptance-matrix.mjs`, `lib/cdp.mjs`, `lib/axe.mjs`,
 * `lib/chrome-launcher.mjs` and `lib/acceptance-browser.mjs` unchanged, so the
 * honesty rules are the ones `calendar-acceptance.mjs` and
 * `build-acceptance.mjs` obey: a cell with no screenshot is NOT-RUN, a cell axe
 * never judged is NOT-RUN, a matrix that did not run every planned cell exits
 * non-zero even when every cell it produced passed, and landing on the sign-in
 * URL is a hard error rather than a pass.
 *
 * The application is SHARED and nothing here writes to it. Two fences:
 *
 *  1. Every state real data cannot reach — an empty channel, a 500 on the
 *     timeline, an unread count of 120, a 60-message page with an older cursor,
 *     a refused upload — is produced by pausing the real read with
 *     `Fetch.requestPaused` and fulfilling it with a body that matches the
 *     ACTUAL contract. The chat client parses every response through the
 *     contracts in `hooks/api/chat-schema/**` and `hooks/api/chat-extra-schema.ts`,
 *     and the channel shapes are `.strict()`: an extra or missing key is
 *     rejected, the query errors, and the surface renders an error or an empty
 *     state that would read as a product bug.
 *
 *  2. EVERY non-GET request to `/chat/**` and every `POST /storage/upload` is
 *     intercepted, answered synthetically and recorded. Sending a message,
 *     marking a channel read and uploading an attachment are writes; the
 *     composer and pagination states exercise all three, so without this fence
 *     the matrix would post into a real channel.
 *
 * The denied state is produced by proxying the caller's real `GET /me/access`
 * and removing the `chat:` scopes from the response before it reaches the page.
 * That changes what this browser session is told, not what the server holds.
 *
 * Usage:
 *   node scripts/chat-acceptance.mjs --self-test
 *   node scripts/chat-acceptance.mjs \
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
  obstructionVerdict,
  pointerObstructionExpression,
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
  typeText,
  TAB,
  ENTER,
  ESCAPE,
  clickByAccessibleNameExpression,
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

export const CHAT_STATES = [
  { key: "loading-skeleton", label: "Loading skeleton" },
  { key: "empty-channel", label: "Empty channel" },
  { key: "error-and-retry", label: "Error and retry" },
  { key: "denied", label: "Denied" },
  { key: "ownership-split", label: "Sidebar / conversation / settings ownership" },
  { key: "deferred-dialogs-and-threads", label: "Deferred dialogs and threads" },
  { key: "keyboard-composer", label: "Keyboard composer" },
  { key: "pending-and-retry-send", label: "Pending and retry send" },
  { key: "unread-indicators", label: "Unread indicators" },
  { key: "upload-error", label: "Upload error" },
  { key: "long-channel-pagination", label: "Long-channel pagination" },
];

// ----------------------------------------------------------------- fixtures

export const ACTIVE_CHANNEL_ID = 900001;
export const UNREAD_CHANNEL_ID = 900002;
export const MANY_UNREAD_CHANNEL_ID = 900003;

export const CHANNEL_NAME = "acceptance-harness";
export const UNREAD_CHANNEL_NAME = "acceptance-unread";
export const MANY_UNREAD_CHANNEL_NAME = "acceptance-many-unread";

export const UNREAD_COUNT = 7;
export const MANY_UNREAD_COUNT = 120;
export const MANY_UNREAD_BADGE = "99+";

export const UNREAD_TOTAL_CEILING = 100;
export const UNREAD_TOTAL = Math.min(UNREAD_TOTAL_CEILING, UNREAD_COUNT + MANY_UNREAD_COUNT);

export const COMPOSER_PLACEHOLDER = `Message #${CHANNEL_NAME}...`;
export const SEND_LABEL = "Send";
export const ATTACH_LABEL = "Attach file";
export const FILE_INPUT_LABEL = "Upload file";
export const LOAD_OLDER_LABEL = "Load older messages";
export const NEW_DM_LABEL = "New Direct Message";
export const OPEN_THREAD_LABEL = "Open thread";
export const CLOSE_THREAD_LABEL = "Close thread";
export const CHAT_NAV_LABEL = "Chat navigation";
export const SETTINGS_SAVE_LABEL = "Save settings";
export const RETRY_LABEL = "Try again";

export const EMPTY_CHANNEL_TITLE = `Welcome to #${CHANNEL_NAME}`;
export const EMPTY_CHANNEL_BODY = "Send a message to get things started.";
export const TIMELINE_ERROR_TITLE = "Couldn't load this conversation";
export const SIDEBAR_ERROR_TITLE = "Couldn't load your conversations";
export const SIDEBAR_EMPTY_TITLE = "No conversations yet";
export const DENIED_TITLE = "Access Restricted";
export const UPLOAD_FAILURE_PREFIX = "Failed:";
export const MESSAGE_PREFIX = "Acceptance chat message";
export const OLDER_MESSAGE_PREFIX = "Acceptance older chat message";
export const COMPOSER_DRAFT = "Acceptance composer draft";

export const CHAT_DENY_PREFIXES = ["chat:"];

export const SIDEBAR_LIST_LABELS = [
  "Conversations",
  "Favorites",
  "Public channels",
  "Groups",
  "Direct messages",
  "Archived conversations",
];

export const FIRST_PAGE_MESSAGE_COUNT = 60;
export const OLDER_PAGE_MESSAGE_COUNT = 20;
export const OLDER_CURSOR = 800000;

function iso(now, minutesAgo) {
  return new Date(new Date(now).getTime() - minutesAgo * 60 * 1000).toISOString();
}

export function memberPreviewFixture(channelId) {
  return {
    id: 910001,
    channelId,
    userId: "acceptance-user",
    role: "MEMBER",
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    user: { id: "acceptance-user", name: "Acceptance Harness", image: null },
  };
}

export function memberDetailFixture(now, channelId) {
  return {
    id: 910001,
    channelId,
    userId: "acceptance-user",
    role: "MEMBER",
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    lastReadAt: iso(now, 5),
    joinedAt: iso(now, 60 * 24),
    archivedAt: null,
    user: {
      id: "acceptance-user",
      name: "Acceptance Harness",
      image: null,
      email: "acceptance@example.invalid",
    },
  };
}

export function channelFixture(now, { id, name, unreadCount = 0, type = "PUBLIC" }) {
  return {
    id,
    name,
    type,
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [memberPreviewFixture(id)],
    memberCount: 2,
    membersTruncated: false,
    unreadCount,
    lastMessage: {
      content: `${MESSAGE_PREFIX} preview`,
      senderName: "Acceptance Harness",
      createdAt: iso(now, 4),
    },
  };
}

export function channelListFixture(now) {
  return {
    channels: [
      channelFixture(now, { id: ACTIVE_CHANNEL_ID, name: CHANNEL_NAME }),
      channelFixture(now, { id: UNREAD_CHANNEL_ID, name: UNREAD_CHANNEL_NAME, unreadCount: UNREAD_COUNT }),
      channelFixture(now, {
        id: MANY_UNREAD_CHANNEL_ID,
        name: MANY_UNREAD_CHANNEL_NAME,
        unreadCount: MANY_UNREAD_COUNT,
      }),
    ],
    nextCursor: null,
  };
}

export function channelDetailFixture(now, channelId = ACTIVE_CHANNEL_ID, name = CHANNEL_NAME) {
  return {
    id: channelId,
    orgId: "acceptance-org",
    name,
    description: null,
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    unreadCount: 0,
    lastMessage: {
      content: `${MESSAGE_PREFIX} preview`,
      senderName: "Acceptance Harness",
      createdAt: iso(now, 4),
    },
    createdAt: iso(now, 60 * 24 * 7),
    updatedAt: iso(now, 4),
    memberCount: 2,
    members: [memberDetailFixture(now, channelId)],
  };
}

export function messageFixture(now, { id, content, minutesAgo = 5, channelId = ACTIVE_CHANNEL_ID }) {
  return {
    id,
    channelId,
    senderId: "acceptance-user",
    sender: { id: "acceptance-user", name: "Acceptance Harness", image: null },
    content,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt: iso(now, minutesAgo),
    updatedAt: iso(now, minutesAgo),
    attachments: [],
    replyTo: null,
  };
}

export function messagePageFixture(now, count, prefix, startId, nextCursor) {
  const messages = [];
  for (let i = 0; i < count; i += 1)
    messages.push(
      messageFixture(now, {
        id: startId + i,
        content: `${prefix} ${i + 1}`,
        minutesAgo: count - i,
      }),
    );
  return { messages, nextCursor };
}

export function sentMessageFixture(now, content) {
  return messageFixture(now, { id: 950001, content, minutesAgo: 0 });
}

// ------------------------------------------------------------ interception

export function classifyChatRequest(url, method) {
  const path = String(url ?? "").split("?")[0];
  const verb = String(method ?? "GET").toUpperCase();
  if (/\/storage\/upload$/.test(path)) return "storage-upload";
  if (/\/me\/access$/.test(path)) return "access";
  if (verb !== "GET" && /\/chat\//.test(path)) return "chat-write";
  if (!/\/chat\//.test(path) && !/\/chat$/.test(path)) return null;
  if (/\/chat\/channels\/\d+\/messages\/poll$/.test(path)) return "messages-poll";
  if (/\/chat\/channels\/\d+\/messages\/\d+\/thread$/.test(path)) return "thread";
  if (/\/chat\/channels\/\d+\/messages$/.test(path)) return "messages";
  if (/\/chat\/channels\/public$/.test(path)) return "channels-public";
  if (/\/chat\/channels\/archived$/.test(path)) return "channels-archived";
  if (/\/chat\/channels\/\d+\/pins$/.test(path)) return "pins";
  if (/\/chat\/channels\/\d+\/huddle$/.test(path)) return "huddle";
  if (/\/chat\/channels\/\d+\/files$/.test(path)) return "files";
  if (/\/chat\/channels\/\d+$/.test(path)) return "channel-detail";
  if (/\/chat\/channels$/.test(path)) return "channels";
  if (/\/chat\/unread$/.test(path)) return "unread";
  return null;
}

export function parseChatWrite(url, method, postData) {
  const path = String(url ?? "").split("?")[0];
  const verb = String(method ?? "GET").toUpperCase();
  let body = null;
  try {
    body = postData ? JSON.parse(String(postData)) : null;
  } catch {
    body = null;
  }
  const send = path.match(/\/chat\/channels\/(\d+)\/messages$/);
  if (send && verb === "POST")
    return {
      action: "send",
      channelId: Number(send[1]),
      clientKey: body?.clientKey ?? null,
      content: body?.content ?? null,
      attachments: Array.isArray(body?.attachments) ? body.attachments.length : 0,
      method: verb,
    };
  const read = path.match(/\/chat\/channels\/(\d+)\/read$/);
  if (read) return { action: "read", channelId: Number(read[1]), method: verb };
  if (/\/storage\/upload$/.test(path)) return { action: "upload", channelId: null, method: verb };
  return { action: "other", path, method: verb };
}

export function strippedScopes(scopes, prefixes) {
  const kept = {};
  const removed = [];
  for (const [key, value] of Object.entries(scopes ?? {})) {
    if (prefixes.some((p) => key === p || key.startsWith(p))) removed.push(key);
    else kept[key] = value;
  }
  return { kept, removed };
}

export const OWNER_BYPASS_KEY = "isOrgOwner";

export function deniedAccessPayload(data, prefixes) {
  const { kept, removed } = strippedScopes(data?.scopes, prefixes);
  const authorities = [...removed];
  if (data?.isOrgOwner === true) authorities.push(OWNER_BYPASS_KEY);
  return {
    payload: { ...data, scopes: kept, isOrgOwner: false, canManageOrganizationMembership: false },
    removed: authorities,
  };
}

export function buildChatScenario() {
  return {
    mode: "passthrough",
    delayMs: 0,
    channels: null,
    channelDetail: null,
    messagePage: null,
    olderPage: null,
    messagesFail: false,
    channelsFail: false,
    uploadStatus: 200,
    sendStatus: 200,
    stallSendMs: 0,
    stripPermissions: [],
    strippedKeys: [],
    accessRequests: 0,
    writes: [],
    messageRequests: [],
    chunkRequests: [],
    stats: createInterceptionStats(),
  };
}

const PROXY_SKIP = new Set(["host", "origin", "referer", "connection", "content-length", "accept-encoding"]);

async function fulfilStrippedAccess(cdp, params, scenario, origin, apiOrigin, bakedOrigin) {
  const { requestId, request } = params;
  const source = new URL(request.url);
  const isBaked = bakedOrigin !== "" && request.url.startsWith(bakedOrigin);
  const target = isBaked ? `${apiOrigin}${source.pathname}${source.search}` : request.url;
  const headers = {};
  for (const [name, value] of Object.entries(request.headers ?? {}))
    if (!PROXY_SKIP.has(name.toLowerCase())) headers[name] = value;
  try {
    const res = await fetch(target, { method: "GET", headers, redirect: "manual" });
    const json = await res.json();
    const data = json && typeof json === "object" && "data" in json ? json.data : json;
    const { payload, removed } = deniedAccessPayload(data, scenario.stripPermissions);
    scenario.strippedKeys = removed;
    return fulfilJson(cdp, requestId, origin, envelope(payload), scenario.stats, res.status);
  } catch (err) {
    scenario.stats.proxyFailures.push(`GET ${source.pathname}: ${String(err.message ?? err)}`);
    await cdp.send("Fetch.failRequest", { requestId, errorReason: "Failed" }).catch(() => {});
  }
}

async function handleChatPaused(cdp, params, scenario, origin, apiOrigin, bakedOrigin, now) {
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

  const kind = classifyChatRequest(url, method);
  if (kind === null) return passThrough();

  if (kind === "access") {
    scenario.accessRequests += 1;
    if (scenario.stripPermissions.length === 0) return passThrough();
    return fulfilStrippedAccess(cdp, params, scenario, origin, apiOrigin, bakedOrigin);
  }

  if (kind === "storage-upload") {
    scenario.writes.push(parseChatWrite(url, method, null));
    if (scenario.uploadStatus !== 200)
      return fulfilJson(
        cdp,
        requestId,
        origin,
        JSON.stringify({ message: "Upload rejected by the acceptance harness" }),
        stats,
        scenario.uploadStatus,
      );
    return fulfilJson(
      cdp,
      requestId,
      origin,
      envelope({
        quarantineId: "acceptance-quarantine",
        status: "pending_scan",
        key: "acceptance/chat/file.txt",
        mimeType: "text/plain",
        size: 12,
        sha256: "0".repeat(64),
      }),
      stats,
    );
  }

  if (kind === "chat-write") {
    const write = parseChatWrite(url, method, params.request?.postData);
    scenario.writes.push(write);
    if (write.action === "send") {
      if (scenario.stallSendMs > 0) await sleep(scenario.stallSendMs);
      if (scenario.sendStatus !== 200)
        return fulfilJson(
          cdp,
          requestId,
          origin,
          JSON.stringify({ message: "Send rejected by the acceptance harness" }),
          stats,
          scenario.sendStatus,
        );
      return fulfilJson(cdp, requestId, origin, envelope(sentMessageFixture(now, write.content ?? "")), stats);
    }
    return fulfilJson(cdp, requestId, origin, envelope({ ok: true }), stats);
  }

  if (scenario.mode === "passthrough") return passThrough();
  if (scenario.mode === "delay") {
    await sleep(scenario.delayMs);
    return passThrough();
  }

  if (kind === "channels") {
    if (scenario.channelsFail)
      return fulfilJson(cdp, requestId, origin, JSON.stringify({ message: "Internal Server Error" }), stats, 500);
    return fulfilJson(cdp, requestId, origin, envelope(scenario.channels ?? channelListFixture(now)), stats);
  }
  if (kind === "channels-public" || kind === "channels-archived")
    return fulfilJson(cdp, requestId, origin, envelope({ channels: [], nextCursor: null }), stats);
  if (kind === "pins") return fulfilJson(cdp, requestId, origin, envelope([]), stats);
  if (kind === "huddle") return fulfilJson(cdp, requestId, origin, envelope(null), stats);
  if (kind === "files") return fulfilJson(cdp, requestId, origin, envelope({ files: [] }), stats);
  if (kind === "channel-detail")
    return fulfilJson(cdp, requestId, origin, envelope(scenario.channelDetail ?? channelDetailFixture(now)), stats);
  if (kind === "unread") return fulfilJson(cdp, requestId, origin, envelope({ total: UNREAD_TOTAL }), stats);
  if (kind === "thread")
    return fulfilJson(
      cdp,
      requestId,
      origin,
      envelope({
        parentMessage: messageFixture(now, { id: 940001, content: `${MESSAGE_PREFIX} thread parent` }),
        replies: [messageFixture(now, { id: 940002, content: `${MESSAGE_PREFIX} thread reply`, minutesAgo: 1 })],
        nextCursor: null,
      }),
      stats,
    );
  if (kind === "messages-poll")
    return fulfilJson(
      cdp,
      requestId,
      origin,
      envelope({ messages: [], nextCursor: null, hasMore: false, latestPosition: null }),
      stats,
    );

  if (kind === "messages") {
    const cursor = new URL(url).searchParams.get("cursor");
    scenario.messageRequests.push({ cursor });
    if (scenario.messagesFail)
      return fulfilJson(cdp, requestId, origin, JSON.stringify({ message: "Internal Server Error" }), stats, 500);
    if (cursor !== null && scenario.olderPage)
      return fulfilJson(cdp, requestId, origin, envelope(scenario.olderPage), stats);
    return fulfilJson(
      cdp,
      requestId,
      origin,
      envelope(scenario.messagePage ?? { messages: [], nextCursor: null }),
      stats,
    );
  }
  return passThrough();
}

// ------------------------------------------------------------- expressions

const CLEAN = `const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();`;

export function chatSurfaceExpression() {
  return `(() => {
    ${CLEAN}
    const composer = document.querySelector('textarea[placeholder^="Message "]');
    const send = document.querySelector('button[aria-label="Send"]');
    const navs = Array.from(document.querySelectorAll('nav[aria-label="${CHAT_NAV_LABEL}"]'))
      .filter((n) => n.getClientRects().length > 0).length;
    const statusTexts = Array.from(document.querySelectorAll('[role="status"]'))
      .filter((el) => el.getClientRects().length > 0 || el.className.indexOf("sr-only") !== -1)
      .map((el) => clean(el.innerText || el.textContent))
      .filter((t) => t.length > 0);
    const alertTexts = Array.from(document.querySelectorAll('[role="alert"]'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => clean(el.innerText))
      .filter((t) => t.length > 0);
    const openDialogEls = Array.from(document.querySelectorAll('[role="dialog"]'))
      .filter((d) => d.getClientRects().length > 0 && d.getAttribute("aria-hidden") !== "true");
    const dialogs = openDialogEls.length;
    const dialogTitles = openDialogEls.map((d) => clean(d.getAttribute("aria-label") || d.innerText).slice(0, 60));
    const lazyFallbacks = Array.from(document.querySelectorAll('[role="status"][aria-label]'))
      .map((el) => el.getAttribute("aria-label"))
      .filter((l) => l && l.indexOf("Loading ") === 0);
    const named = Array.from(document.querySelectorAll("button[aria-label]"))
      .filter((b) => b.getClientRects().length > 0)
      .map((b) => b.getAttribute("aria-label"));
    const texts = Array.from(document.querySelectorAll("button"))
      .filter((b) => b.getClientRects().length > 0)
      .map((b) => clean(b.textContent))
      .filter((t) => t.length > 0);
    return {
      url: location.href,
      pathname: location.pathname,
      search: location.search,
      hasComposer: Boolean(composer),
      composerPlaceholder: composer ? composer.getAttribute("placeholder") : null,
      composerAriaLabel: composer ? composer.getAttribute("aria-label") : null,
      composerLabelledBy: composer ? composer.getAttribute("aria-labelledby") : null,
      composerValue: composer ? composer.value : null,
      composerTag: composer ? composer.tagName.toLowerCase() : null,
      sendDisabled: send ? send.disabled === true : null,
      sendHasSpinner: send ? Boolean(send.querySelector(".animate-spin")) : null,
      chatNavCount: navs,
      openDialogs: dialogs,
      openDialogTitles: dialogTitles,
      statusTexts: statusTexts,
      alertTexts: alertTexts,
      lazyFallbacks: lazyFallbacks,
      buttonLabels: named,
      buttonTexts: texts,
      bodyText: clean(document.body ? document.body.innerText : "").slice(0, 6000),
      mainText: (() => { const m = document.querySelector("main"); return m ? clean(m.innerText).slice(0, 4000) : ""; })(),
      onLine: navigator.onLine,
    };
  })()`;
}

export function sidebarRowsExpression() {
  return `(() => {
    ${CLEAN}
    const labels = ${JSON.stringify(SIDEBAR_LIST_LABELS)};
    const lists = Array.from(document.querySelectorAll('[role="list"]')).filter(
      (l) => labels.indexOf(l.getAttribute("aria-label")) !== -1,
    );
    const rows = [];
    for (const list of lists)
      for (const item of Array.from(list.querySelectorAll('[role="listitem"]'))) {
        const button = item.querySelector("button");
        rows.push({
          listLabel: list.getAttribute("aria-label"),
          text: clean(item.innerText),
          name: button ? clean(button.getAttribute("aria-label") || button.textContent) : null,
          posinset: item.getAttribute("aria-posinset"),
        });
      }
    return { found: lists.length > 0, lists: lists.map((l) => l.getAttribute("aria-label")), rows: rows };
  })()`;
}

export function composerExpression() {
  return `(() => {
    const el = document.querySelector('textarea[placeholder^="Message "]');
    if (!el) return { found: false };
    el.focus();
    const range = el.value.length;
    el.setSelectionRange(range, range);
    return {
      found: true,
      focused: document.activeElement === el,
      tag: el.tagName.toLowerCase(),
      placeholder: el.getAttribute("placeholder"),
      ariaLabel: el.getAttribute("aria-label"),
      value: el.value,
    };
  })()`;
}

export function composerValueExpression() {
  return `(() => {
    const el = document.querySelector('textarea[placeholder^="Message "]');
    return el ? el.value : null;
  })()`;
}

export function toastsExpression() {
  return `(() => Array.from(document.querySelectorAll("[data-sonner-toast]"))
    .map((el) => (el.innerText || "").replace(/\\s+/g, " ").trim())
    .filter((t) => t.length > 0))()`;
}

export function attachmentChipsExpression() {
  return `(() => Array.from(document.querySelectorAll('button[aria-label="Remove attachment"]')).length)()`;
}

// ---------------------------------------------------------------- verdicts

export function ownershipVerdict({ chatSurface, settingsSurface }) {
  const problems = [];
  if (!(chatSurface?.chatNavCount > 0)) problems.push(`/chat exposes no nav labelled "${CHAT_NAV_LABEL}"`);
  if (chatSurface?.hasComposer !== true) problems.push("/chat mounted no conversation composer");
  if ((chatSurface?.buttonTexts ?? []).includes(SETTINGS_SAVE_LABEL))
    problems.push(`/chat renders the settings control "${SETTINGS_SAVE_LABEL}" — settings leaked into the conversation surface`);
  if (settingsSurface?.pathname !== "/chat")
    problems.push(`/chat/settings did not redirect to /chat (landed on ${settingsSurface?.pathname ?? "nowhere"})`);
  if ((settingsSurface?.buttonTexts ?? []).includes(SETTINGS_SAVE_LABEL))
    problems.push(`/chat/settings still exposes the retired settings form`);
  if (problems.length > 0) return { ok: false, reason: problems.join("; ") };
  return { ok: true, reason: null };
}

export function sidebarPresenceVerdict(sidebar) {
  if (!sidebar || sidebar.found !== true)
    return { ok: false, reason: `no sidebar list carrying one of ${SIDEBAR_LIST_LABELS.join(" / ")} is on screen` };
  if ((sidebar.rows ?? []).length === 0)
    return { ok: false, reason: "the sidebar rendered a list with no conversation rows" };
  return { ok: true, reason: null };
}

export function rowsForChannel(rows, name) {
  return (rows ?? []).filter(
    (r) => String(r.name ?? "").startsWith(name) || String(r.text ?? "").includes(name),
  );
}

export function unreadBadgeVerdict(rows) {
  const unread = rowsForChannel(rows, UNREAD_CHANNEL_NAME);
  const many = rowsForChannel(rows, MANY_UNREAD_CHANNEL_NAME);
  if (unread.length === 0 || many.length === 0)
    return { ok: false, measured: false, reason: "the seeded unread channels are not in the sidebar" };
  const reads = (list) => list.map((r) => `"${String(r.text ?? "")}"`).join(" | ");
  const countPattern = new RegExp(`(^|\\s)${UNREAD_COUNT}(\\s|$)`);
  if (!unread.some((r) => countPattern.test(String(r.text))))
    return {
      ok: false,
      measured: true,
      reason: `a channel with unreadCount ${UNREAD_COUNT} shows no count on any of its ${unread.length} sidebar row(s) — rows read ${reads(unread)}`,
    };
  if (!many.some((r) => String(r.text).includes(MANY_UNREAD_BADGE)))
    return {
      ok: false,
      measured: true,
      reason: `a channel with unreadCount ${MANY_UNREAD_COUNT} does not clamp to "${MANY_UNREAD_BADGE}" on any of its ${many.length} sidebar row(s) — rows read ${reads(many)}`,
    };
  return { ok: true, measured: true, reason: null };
}

export function deferredVerdict({ before, after, label }) {
  if (before?.openDialogs > 0)
    return {
      ok: false,
      reason: `a dialog was already mounted before "${label}" was operated: ${(before.openDialogTitles ?? []).map((t) => `"${t}"`).join(", ") || "unnamed"}`,
    };
  if (!(after?.openDialogs > 0))
    return { ok: false, reason: `"${label}" opened no dialog` };
  return { ok: true, reason: null };
}

export function threadDeferredVerdict({ before, after }) {
  const closable = (after?.buttonLabels ?? []).includes(CLOSE_THREAD_LABEL);
  if ((before?.buttonLabels ?? []).includes(CLOSE_THREAD_LABEL))
    return { ok: false, reason: "the thread panel was already mounted before any thread was opened" };
  if (!closable) return { ok: false, reason: `"${OPEN_THREAD_LABEL}" mounted no thread panel` };
  return { ok: true, reason: null };
}

export function composerKeyboardVerdict({ focus, afterShiftEnter, sendsAfterShiftEnter, afterEnter, sendsAfterEnter, draft }) {
  if (focus?.found !== true) return { ok: false, reason: "no composer textarea was found" };
  if (focus.focused !== true) return { ok: false, reason: "the composer could not take focus" };
  if (focus.tag !== "textarea")
    return { ok: false, reason: `the composer is a <${focus.tag}>, not a textarea` };
  if (!String(afterShiftEnter ?? "").includes(draft))
    return { ok: false, reason: "the typed draft never reached the composer" };
  if (!/\n/.test(String(afterShiftEnter ?? "")))
    return { ok: false, reason: "Shift+Enter inserted no newline" };
  if (sendsAfterShiftEnter !== 0)
    return { ok: false, reason: `Shift+Enter sent the message (${sendsAfterShiftEnter} send request(s))` };
  if (sendsAfterEnter !== 1)
    return { ok: false, reason: `Enter issued ${sendsAfterEnter} send request(s), expected exactly 1` };
  if (String(afterEnter ?? "").trim().length !== 0)
    return { ok: false, reason: `the composer still holds "${String(afterEnter).slice(0, 60)}" after a successful send` };
  return { ok: true, reason: null };
}

export function pendingSendVerdict({ duringSend }) {
  if (!duringSend) return { ok: false, measured: false, reason: "the surface could not be sampled during the send" };
  if (duringSend.sendDisabled !== true)
    return { ok: false, measured: true, reason: "the Send control stays enabled while a send is in flight" };
  if (duringSend.sendHasSpinner !== true)
    return { ok: false, measured: true, reason: "the Send control shows no pending affordance while a send is in flight" };
  return { ok: true, measured: true, reason: null };
}

export function retrySendVerdict({ restoredDraft, draft, firstClientKey, secondClientKey, toastTexts }) {
  if (String(restoredDraft ?? "") !== draft)
    return {
      ok: false,
      reason: `a failed send did not restore the draft — the composer holds "${String(restoredDraft ?? "").slice(0, 80)}"`,
    };
  if (!(toastTexts ?? []).some((t) => t.length > 0))
    return { ok: false, reason: "a failed send surfaced no error to the writer" };
  if (!firstClientKey || !secondClientKey)
    return { ok: false, reason: "the send requests carried no clientKey, so a retry cannot be deduplicated" };
  if (firstClientKey !== secondClientKey)
    return {
      ok: false,
      reason: `retrying an unchanged draft minted a new clientKey (${firstClientKey} then ${secondClientKey}) — a lost response would double-post`,
    };
  return { ok: true, reason: null };
}

export function uploadErrorVerdict({ toastTexts, attachmentChips }) {
  const failure = (toastTexts ?? []).find((t) => t.includes(UPLOAD_FAILURE_PREFIX));
  if (!failure)
    return { ok: false, reason: `a refused upload surfaced no "${UPLOAD_FAILURE_PREFIX}" message to the writer` };
  if (attachmentChips > 0)
    return { ok: false, reason: `a refused upload still attached ${attachmentChips} file(s) to the draft` };
  return { ok: true, reason: null };
}

/**
 * `controlOffered` is separate from `clicks` because reaching the control means
 * scrolling to the top of the timeline, and `useChatScroll` auto-loads there. A
 * page that arrived from that scroll rather than from the press still has to
 * render, and the control still has to disappear when the history is exhausted —
 * so the press count is recorded, and the three outcomes are what is asserted.
 */
export function paginationVerdict({ controlOffered, clicks, networkRequests, olderVisible, controlGone }) {
  if (controlOffered !== true)
    return { ok: false, reason: `no "${LOAD_OLDER_LABEL}" control was offered for a page with an older cursor` };
  const cursored = (networkRequests ?? []).filter((r) => r.cursor !== null && r.cursor !== undefined);
  if (cursored.length === 0)
    return {
      ok: false,
      reason: `${clicks} press(es) of "${LOAD_OLDER_LABEL}" issued no cursored GET /chat/channels/:id/messages — older history is unreachable`,
    };
  if (olderVisible !== true)
    return { ok: false, reason: "the older page was fetched but its messages never rendered" };
  if (controlGone !== true)
    return { ok: false, reason: `"${LOAD_OLDER_LABEL}" is still offered after the last page was delivered` };
  return { ok: true, reason: null };
}

export function deniedChatVerdict({ statusTexts, bodyText, strippedKeys }) {
  if ((strippedKeys ?? []).length === 0)
    return { ok: false, measured: false, reason: "no chat permission was actually removed from GET /me/access" };
  const denied = (statusTexts ?? []).find((t) => t.includes(DENIED_TITLE));
  if (denied) return { ok: true, measured: true, reason: null };
  const text = String(bodyText ?? "");
  if (text.includes(SIDEBAR_EMPTY_TITLE))
    return {
      ok: false,
      measured: true,
      reason: `a reader without ${(strippedKeys ?? []).join(", ")} is shown the empty state "${SIDEBAR_EMPTY_TITLE}" instead of a denied state`,
    };
  return { ok: false, measured: true, reason: "a reader without the chat permissions is shown neither a denied state nor anything identifiable" };
}

export function timelineErrorVerdict({ alertTexts, buttonTexts }) {
  const alert = (alertTexts ?? []).find((t) => t.includes(TIMELINE_ERROR_TITLE) || t.includes(SIDEBAR_ERROR_TITLE));
  if (!alert)
    return { ok: false, reason: `a 500 on the chat reads rendered no "${TIMELINE_ERROR_TITLE}" alert` };
  if (!(buttonTexts ?? []).includes(RETRY_LABEL))
    return { ok: false, reason: `the error state offered no "${RETRY_LABEL}" control` };
  return { ok: true, reason: null };
}

export function emptyChannelVerdict({ bodyText, alertTexts }) {
  const text = String(bodyText ?? "");
  if (!text.includes(EMPTY_CHANNEL_TITLE))
    return { ok: false, reason: `an empty channel did not render "${EMPTY_CHANNEL_TITLE}"` };
  if (!text.includes(EMPTY_CHANNEL_BODY))
    return { ok: false, reason: `an empty channel did not render "${EMPTY_CHANNEL_BODY}"` };
  if ((alertTexts ?? []).length > 0)
    return { ok: false, reason: `an empty channel is dressed as an error: ${alertTexts.join(" | ")}` };
  return { ok: true, reason: null };
}

/**
 * A control whose centre point belongs to some other element cannot be operated
 * by a pointer, and clicking it operates whatever is on top instead. That is not
 * a measurement of the control, so the cell that needed it is NOT-RUN and the
 * obstruction is named.
 */
export function writeFenceVerdict(writes, allowedActions) {
  const unexpected = (writes ?? []).filter((w) => !allowedActions.includes(w.action));
  if (unexpected.length > 0)
    return {
      ok: false,
      reason: `unexpected writes were attempted: ${unexpected.map((w) => `${w.method} ${w.action}`).join(", ")}`,
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

  assert("the matrix plans 11 states", CHAT_STATES.length === 11);
  assert("the matrix plans 4 viewports", ACCEPTANCE_VIEWPORTS.length === 4);
  assert("planned count multiplies", plannedCellCount(CHAT_STATES, ACCEPTANCE_VIEWPORTS) === 44);
  assert(
    "the zoom column halves the CSS width and doubles the pixel ratio",
    ACCEPTANCE_VIEWPORTS[3].cssWidth === 640 && ACCEPTANCE_VIEWPORTS[3].deviceScaleFactor === 2,
  );
  assert("the zoom column is labelled as zoom", viewportLabel("1280-zoom200") === "1280 px @ 200% zoom");
  assert("a viewport selector that matches nothing returns nothing", selectViewports("nope").length === 0);
  assert(
    "a reflowed 200% viewport passes",
    zoomVerdict({ innerWidth: 640, devicePixelRatio: 2 }, ACCEPTANCE_VIEWPORTS[3]).ok === true,
  );
  assert("an unmeasured viewport is not a pass", zoomVerdict(null, ACCEPTANCE_VIEWPORTS[0]).ok === false);

  assert("the channel list read is classified", classifyChatRequest("http://h/chat/channels?cursor=x", "GET") === "channels");
  assert(
    "the messages read is classified BEFORE the channel detail",
    classifyChatRequest("http://h/chat/channels/12/messages", "GET") === "messages",
  );
  assert("the channel detail is classified", classifyChatRequest("http://h/chat/channels/12", "GET") === "channel-detail");
  assert("the poll route is classified", classifyChatRequest("http://h/chat/channels/12/messages/poll", "GET") === "messages-poll");
  assert("a thread read is classified", classifyChatRequest("http://h/chat/channels/12/messages/34/thread", "GET") === "thread");
  assert("the public list is classified", classifyChatRequest("http://h/chat/channels/public", "GET") === "channels-public");
  assert("the pins read is classified", classifyChatRequest("http://h/chat/channels/12/pins", "GET") === "pins");
  assert("the active-huddle read is classified", classifyChatRequest("http://h/chat/channels/12/huddle", "GET") === "huddle");
  assert("the channel files read is classified", classifyChatRequest("http://h/chat/channels/12/files", "GET") === "files");
  assert("the unread total is classified", classifyChatRequest("http://h/chat/unread", "GET") === "unread");
  assert("a send is claimed by the write fence", classifyChatRequest("http://h/chat/channels/12/messages", "POST") === "chat-write");
  assert("a mark-read is claimed by the write fence", classifyChatRequest("http://h/chat/channels/12/read", "POST") === "chat-write");
  assert("the upload route is claimed", classifyChatRequest("http://h/storage/upload", "POST") === "storage-upload");
  assert("the access read is claimed", classifyChatRequest("http://h/me/access", "GET") === "access");
  assert("an unrelated read is not claimed", classifyChatRequest("http://h/build/all", "GET") === null);
  assert("the chat page document is not claimed as an API read", classifyChatRequest("http://h/chat/settings", "GET") === null);

  const send = parseChatWrite("http://h/chat/channels/12/messages", "POST", JSON.stringify({ clientKey: "k1", content: "hi", attachments: [] }));
  assert("a send parses its clientKey and content", send.action === "send" && send.clientKey === "k1" && send.content === "hi");
  assert("a send parses its channel", send.channelId === 12);
  assert("a mark-read parses as read", parseChatWrite("http://h/chat/channels/12/read", "POST", null).action === "read");
  assert("an upload parses as upload", parseChatWrite("http://h/storage/upload", "POST", null).action === "upload");
  assert(
    "a malformed body does not crash the parser",
    parseChatWrite("http://h/chat/channels/12/messages", "POST", "{not json").clientKey === null,
  );

  const stripped = strippedScopes({ "chat:channels:read": "all", "build:tickets:view": "own", "chatter:x": "all" }, CHAT_DENY_PREFIXES);
  assert("stripping removes every chat scope", stripped.removed.includes("chat:channels:read"));
  assert("stripping keeps unrelated scopes", stripped.kept["build:tickets:view"] === "own");
  assert("stripping does not over-match a different namespace", stripped.kept["chatter:x"] === "all");

  const ownerDenied = deniedAccessPayload(
    { scopes: { "chat:channels:read": "all" }, isOrgOwner: true, canManageOrganizationMembership: true, modules: { chat: true } },
    CHAT_DENY_PREFIXES,
  );
  assert(
    "denying an owner also removes the owner bypass — useCan returns true for every key while isOrgOwner holds",
    ownerDenied.payload.isOrgOwner === false && ownerDenied.removed.includes(OWNER_BYPASS_KEY),
  );
  assert("denying still removes the chat scopes", ownerDenied.removed.includes("chat:channels:read"));
  assert("denying leaves the module enablement alone — this is a permission denial, not a disabled module", ownerDenied.payload.modules.chat === true);
  const memberDenied = deniedAccessPayload(
    { scopes: { "chat:channels:read": "all", "build:tickets:view": "own" }, isOrgOwner: false },
    CHAT_DENY_PREFIXES,
  );
  assert("a non-owner reader records only the scopes that were removed", memberDenied.removed.join(",") === "chat:channels:read");
  assert("a non-owner reader keeps every unrelated scope", memberDenied.payload.scopes["build:tickets:view"] === "own");

  const channel = channelFixture(now, { id: ACTIVE_CHANNEL_ID, name: CHANNEL_NAME });
  assert(
    "the channel fixture carries exactly the strict contract's twelve keys",
    Object.keys(channel).sort().join(",") ===
      "avatarUrl,entityId,entityType,id,isArchived,lastMessage,memberCount,members,membersTruncated,name,type,unreadCount",
  );
  assert(
    "the member preview carries exactly the strict contract's eight keys",
    Object.keys(memberPreviewFixture(1)).sort().join(",") ===
      "channelId,id,isFavorite,mutedUntil,notificationPreference,role,user,userId",
  );
  assert(
    "the member preview user carries no email — that shape belongs to the detail route",
    Object.keys(memberPreviewFixture(1).user).sort().join(",") === "id,image,name",
  );
  assert(
    "the member detail user does carry the address",
    Object.keys(memberDetailFixture(now, 1).user).sort().join(",") === "email,id,image,name",
  );
  assert(
    "the member detail adds exactly the three detail-only fields",
    Object.keys(memberDetailFixture(now, 1)).sort().join(",") ===
      "archivedAt,channelId,id,isFavorite,joinedAt,lastReadAt,mutedUntil,notificationPreference,role,user,userId",
  );
  assert(
    "the last-message preview carries exactly its three strict keys",
    Object.keys(channel.lastMessage).sort().join(",") === "content,createdAt,senderName",
  );
  assert(
    "the unread total the harness serves is inside the ceiling both chatUnreadResponseSchema and chatUnreadContract enforce",
    UNREAD_TOTAL <= UNREAD_TOTAL_CEILING,
  );
  assert(
    "the seeded per-channel unread counts still sum past that ceiling, which is why the total is clamped and not summed",
    UNREAD_COUNT + MANY_UNREAD_COUNT > UNREAD_TOTAL_CEILING,
  );
  assert("the channel list page envelope is channels + nextCursor", Object.keys(channelListFixture(now)).sort().join(",") === "channels,nextCursor");
  assert("the channel list seeds one read and two unread channels", channelListFixture(now).channels.length === 3);
  assert(
    "one seeded channel is above the 99+ clamp",
    channelListFixture(now).channels.some((c) => c.unreadCount === MANY_UNREAD_COUNT) && MANY_UNREAD_COUNT > 99,
  );

  const message = messageFixture(now, { id: 1, content: "x" });
  assert(
    "the message fixture carries every required contract key",
    ["id", "channelId", "senderId", "sender", "content", "replyToId", "isEdited", "isDeleted", "messageType", "metadata", "actionStatus", "createdAt", "updatedAt", "attachments", "replyTo"].every(
      (k) => k in message,
    ),
  );
  assert(
    "senderId is present — its absence is the defect the contract exists to catch",
    message.senderId === "acceptance-user",
  );
  assert("messageType is one of the three the contract allows", message.messageType === "text");
  const page = messagePageFixture(now, FIRST_PAGE_MESSAGE_COUNT, MESSAGE_PREFIX, 930000, OLDER_CURSOR);
  assert("the first page is long enough to exceed the client render window", page.messages.length === 60);
  assert("the first page advertises an older cursor", page.nextCursor === OLDER_CURSOR);
  assert("the older page terminates", messagePageFixture(now, OLDER_PAGE_MESSAGE_COUNT, OLDER_MESSAGE_PREFIX, 920000, null).nextCursor === null);
  assert("the channel detail fixture names its members array", Array.isArray(channelDetailFixture(now).members));

  assert(
    "the composer placeholder follows the component's template",
    COMPOSER_PLACEHOLDER === `Message #${CHANNEL_NAME}...`,
  );
  assert("the empty-channel title follows the component's template", EMPTY_CHANNEL_TITLE === `Welcome to #${CHANNEL_NAME}`);
  assert(
    "the timeline error title is the literal message-list.tsx renders, apostrophe included",
    TIMELINE_ERROR_TITLE === "Couldn't load this conversation" && !TIMELINE_ERROR_TITLE.includes("’"),
  );
  assert(
    "the sidebar error title is the literal channel-sidebar.tsx renders",
    SIDEBAR_ERROR_TITLE === "Couldn't load your conversations" && !SIDEBAR_ERROR_TITLE.includes("’"),
  );

  assert(
    "a surface owning nav, composer and no settings control passes ownership",
    ownershipVerdict({
      chatSurface: { chatNavCount: 1, hasComposer: true, buttonTexts: ["Send"] },
      settingsSurface: { hasComposer: true, pathname: "/chat", buttonTexts: ["Send"] },
    }).ok === true,
  );
  assert(
    "a settings control on /chat fails ownership",
    ownershipVerdict({
      chatSurface: { chatNavCount: 1, hasComposer: true, buttonTexts: [SETTINGS_SAVE_LABEL] },
      settingsSurface: { hasComposer: true, pathname: "/chat", buttonTexts: [] },
    }).reason.includes("settings leaked"),
  );
  assert(
    "a surviving settings form fails ownership",
    ownershipVerdict({
      chatSurface: { chatNavCount: 1, hasComposer: true, buttonTexts: [] },
      settingsSurface: { hasComposer: false, pathname: "/chat", buttonTexts: [SETTINGS_SAVE_LABEL] },
    }).reason.includes("retired settings form"),
  );
  assert(
    "a non-redirecting /chat/settings fails ownership",
    ownershipVerdict({
      chatSurface: { chatNavCount: 1, hasComposer: true, buttonTexts: [] },
      settingsSurface: { hasComposer: false, pathname: "/chat/settings", buttonTexts: [] },
    }).ok === false,
  );

  assert("a sidebar with rows passes", sidebarPresenceVerdict({ found: true, rows: [{}] }).ok === true);
  assert("no sidebar list is not a pass", sidebarPresenceVerdict({ found: false, rows: [] }).ok === false);
  assert("a sidebar with no rows is not a pass", sidebarPresenceVerdict({ found: true, rows: [] }).ok === false);

  const unreadRows = [
    { name: UNREAD_CHANNEL_NAME, text: `${UNREAD_CHANNEL_NAME} preview ${UNREAD_COUNT}` },
    { name: MANY_UNREAD_CHANNEL_NAME, text: `${MANY_UNREAD_CHANNEL_NAME} preview ${MANY_UNREAD_BADGE}` },
  ];
  assert("a counted and a clamped unread badge pass", unreadBadgeVerdict(unreadRows).ok === true);
  assert(
    "a missing count fails",
    unreadBadgeVerdict([{ name: UNREAD_CHANNEL_NAME, text: UNREAD_CHANNEL_NAME }, unreadRows[1]]).reason.includes("shows no count"),
  );
  assert(
    "an unclamped 120 fails",
    unreadBadgeVerdict([unreadRows[0], { name: MANY_UNREAD_CHANNEL_NAME, text: `${MANY_UNREAD_CHANNEL_NAME} 120` }]).reason.includes("clamp"),
  );
  assert("absent seeded channels are unmeasured, not clean", unreadBadgeVerdict([]).measured === false);

  const railAndSectionRows = [
    { name: UNREAD_CHANNEL_NAME, text: "" },
    { name: MANY_UNREAD_CHANNEL_NAME, text: "" },
    ...unreadRows,
  ];
  assert(
    "the icon-only compact rail row does not mask the section row that carries the count",
    unreadBadgeVerdict(railAndSectionRows).ok === true,
  );
  assert(
    "a channel whose EVERY sidebar row lacks the count still fails, and the reason quotes all of them",
    unreadBadgeVerdict([
      { name: UNREAD_CHANNEL_NAME, text: "" },
      { name: UNREAD_CHANNEL_NAME, text: UNREAD_CHANNEL_NAME },
      unreadRows[1],
    ]).reason.includes("2 sidebar row(s)"),
  );
  assert(
    "an unclamped 120 on every row still fails",
    unreadBadgeVerdict([
      unreadRows[0],
      { name: MANY_UNREAD_CHANNEL_NAME, text: "" },
      { name: MANY_UNREAD_CHANNEL_NAME, text: `${MANY_UNREAD_CHANNEL_NAME} 120` },
    ]).reason.includes("clamp"),
  );

  assert(
    "a dialog that mounts only on its trigger passes",
    deferredVerdict({ before: { openDialogs: 0 }, after: { openDialogs: 1 }, label: NEW_DM_LABEL }).ok === true,
  );
  assert(
    "a dialog already mounted before its trigger fails",
    deferredVerdict({ before: { openDialogs: 1 }, after: { openDialogs: 1 }, label: NEW_DM_LABEL }).reason.includes("already mounted"),
  );
  assert(
    "the already-mounted dialog is NAMED, so the failure is attributable to whoever owns it",
    deferredVerdict({
      before: { openDialogs: 1, openDialogTitles: ["Getting Started 2/5"] },
      after: { openDialogs: 1 },
      label: NEW_DM_LABEL,
    }).reason.includes("Getting Started"),
  );
  assert(
    "a trigger that opened nothing fails",
    deferredVerdict({ before: { openDialogs: 0 }, after: { openDialogs: 0 }, label: NEW_DM_LABEL }).ok === false,
  );
  assert(
    "a thread panel that mounts on demand passes",
    threadDeferredVerdict({ before: { buttonLabels: [] }, after: { buttonLabels: [CLOSE_THREAD_LABEL] } }).ok === true,
  );
  assert(
    "a thread panel present before any thread was opened fails",
    threadDeferredVerdict({ before: { buttonLabels: [CLOSE_THREAD_LABEL] }, after: { buttonLabels: [CLOSE_THREAD_LABEL] } }).ok === false,
  );

  const goodComposer = {
    focus: { found: true, focused: true, tag: "textarea" },
    afterShiftEnter: `${COMPOSER_DRAFT}\n`,
    sendsAfterShiftEnter: 0,
    afterEnter: "",
    sendsAfterEnter: 1,
    draft: COMPOSER_DRAFT,
  };
  assert("Shift+Enter newline plus Enter send passes", composerKeyboardVerdict(goodComposer).ok === true);
  assert(
    "Shift+Enter that sent the message fails",
    composerKeyboardVerdict({ ...goodComposer, sendsAfterShiftEnter: 1 }).reason.includes("Shift+Enter sent"),
  );
  assert(
    "Shift+Enter that inserted no newline fails",
    composerKeyboardVerdict({ ...goodComposer, afterShiftEnter: COMPOSER_DRAFT }).reason.includes("no newline"),
  );
  assert(
    "Enter that sent nothing fails",
    composerKeyboardVerdict({ ...goodComposer, sendsAfterEnter: 0 }).reason.includes("expected exactly 1"),
  );
  assert(
    "Enter that double-sent fails",
    composerKeyboardVerdict({ ...goodComposer, sendsAfterEnter: 2 }).ok === false,
  );
  assert(
    "a composer that kept the draft after a successful send fails",
    composerKeyboardVerdict({ ...goodComposer, afterEnter: COMPOSER_DRAFT }).reason.includes("still holds"),
  );
  assert("an unfocusable composer fails", composerKeyboardVerdict({ ...goodComposer, focus: { found: true, focused: false, tag: "textarea" } }).ok === false);
  assert("a missing composer fails", composerKeyboardVerdict({ ...goodComposer, focus: { found: false } }).ok === false);

  assert(
    "a disabled, spinning Send during flight passes",
    pendingSendVerdict({ duringSend: { sendDisabled: true, sendHasSpinner: true } }).ok === true,
  );
  assert(
    "a Send that stays enabled during flight fails",
    pendingSendVerdict({ duringSend: { sendDisabled: false, sendHasSpinner: true } }).reason.includes("stays enabled"),
  );
  assert(
    "a Send with no pending affordance fails",
    pendingSendVerdict({ duringSend: { sendDisabled: true, sendHasSpinner: false } }).ok === false,
  );
  assert("an unsampled send is unmeasured, not clean", pendingSendVerdict({ duringSend: null }).measured === false);

  const goodRetry = {
    restoredDraft: COMPOSER_DRAFT,
    draft: COMPOSER_DRAFT,
    firstClientKey: "k1",
    secondClientKey: "k1",
    toastTexts: ["Send rejected"],
  };
  assert("a restored draft retried under one clientKey passes", retrySendVerdict(goodRetry).ok === true);
  assert(
    "a lost draft fails",
    retrySendVerdict({ ...goodRetry, restoredDraft: "" }).reason.includes("did not restore the draft"),
  );
  assert("a silent failure fails", retrySendVerdict({ ...goodRetry, toastTexts: [] }).ok === false);
  assert(
    "a new clientKey on retry fails and says why",
    retrySendVerdict({ ...goodRetry, secondClientKey: "k2" }).reason.includes("double-post"),
  );
  assert("a missing clientKey fails", retrySendVerdict({ ...goodRetry, firstClientKey: null }).ok === false);

  assert(
    "a refused upload that told the writer and attached nothing passes",
    uploadErrorVerdict({ toastTexts: ["Failed: Upload rejected"], attachmentChips: 0 }).ok === true,
  );
  assert("a silent refused upload fails", uploadErrorVerdict({ toastTexts: [], attachmentChips: 0 }).ok === false);
  assert(
    "a refused upload that still attached the file fails",
    uploadErrorVerdict({ toastTexts: ["Failed: x"], attachmentChips: 1 }).reason.includes("still attached"),
  );

  assert(
    "a cursored older page that rendered and exhausted passes",
    paginationVerdict({ controlOffered: true, clicks: 2, networkRequests: [{ cursor: null }, { cursor: "800000" }], olderVisible: true, controlGone: true }).ok === true,
  );
  assert(
    "no control at all fails",
    paginationVerdict({ controlOffered: false, clicks: 0, networkRequests: [], olderVisible: false, controlGone: false }).ok === false,
  );
  assert(
    "a page the scroll-to-top auto-load fetched still has to render and exhaust the control",
    paginationVerdict({ controlOffered: true, clicks: 0, networkRequests: [{ cursor: null }, { cursor: "800000" }], olderVisible: true, controlGone: true }).ok === true,
  );
  assert(
    "a page the auto-load fetched but never rendered still fails",
    paginationVerdict({ controlOffered: true, clicks: 0, networkRequests: [{ cursor: "800000" }], olderVisible: false, controlGone: true }).ok === false,
  );
  assert(
    "clicks that never reached the network fail",
    paginationVerdict({ controlOffered: true, clicks: 3, networkRequests: [{ cursor: null }], olderVisible: false, controlGone: false }).reason.includes(
      "older history is unreachable",
    ),
  );
  assert(
    "a fetched page that never rendered fails",
    paginationVerdict({ controlOffered: true, clicks: 1, networkRequests: [{ cursor: "1" }], olderVisible: false, controlGone: true }).ok === false,
  );
  assert(
    "a control still offered after the last page fails",
    paginationVerdict({ controlOffered: true, clicks: 1, networkRequests: [{ cursor: "1" }], olderVisible: true, controlGone: false }).ok === false,
  );

  assert(
    "a denied state naming itself passes",
    deniedChatVerdict({ statusTexts: [`${DENIED_TITLE} chat:channels:read`], bodyText: "", strippedKeys: ["chat:channels:read"] }).ok === true,
  );
  assert(
    "an empty-success state standing in for a denied state fails and says so",
    deniedChatVerdict({ statusTexts: [], bodyText: SIDEBAR_EMPTY_TITLE, strippedKeys: ["chat:channels:read"] }).reason.includes(
      "instead of a denied state",
    ),
  );
  assert(
    "stripping nothing means the cell measured nothing",
    deniedChatVerdict({ statusTexts: [], bodyText: "", strippedKeys: [] }).measured === false,
  );

  assert(
    "a 500 announced with a retry passes",
    timelineErrorVerdict({ alertTexts: [TIMELINE_ERROR_TITLE], buttonTexts: [RETRY_LABEL] }).ok === true,
  );
  assert("a silent 500 fails", timelineErrorVerdict({ alertTexts: [], buttonTexts: [RETRY_LABEL] }).ok === false);
  assert(
    "an error with no way back fails",
    timelineErrorVerdict({ alertTexts: [TIMELINE_ERROR_TITLE], buttonTexts: [] }).reason.includes(RETRY_LABEL),
  );

  assert(
    "an empty channel with both strings and no alert passes",
    emptyChannelVerdict({ bodyText: `${EMPTY_CHANNEL_TITLE} ${EMPTY_CHANNEL_BODY}`, alertTexts: [] }).ok === true,
  );
  assert(
    "an empty channel dressed as an error fails",
    emptyChannelVerdict({ bodyText: `${EMPTY_CHANNEL_TITLE} ${EMPTY_CHANNEL_BODY}`, alertTexts: [TIMELINE_ERROR_TITLE] }).ok === false,
  );
  assert("a channel with no empty copy fails", emptyChannelVerdict({ bodyText: "chat", alertTexts: [] }).ok === false);

  assert(
    "a control whose centre belongs to an overlay is NOT-RUN, not a product failure",
    obstructionVerdict({ found: true, obstructed: true, x: 180, y: 140, hit: "div.checklist :: Getting Started", target: "button :: Load older messages" }, LOAD_OLDER_LABEL, "360 px").obstructed === true,
  );
  assert(
    "the obstruction reason names what took the press",
    obstructionVerdict({ found: true, obstructed: true, x: 180, y: 140, hit: "div.checklist :: Getting Started", target: "button" }, LOAD_OLDER_LABEL, "360 px").reason.includes("Getting Started"),
  );
  assert(
    "an unobstructed control is operable",
    obstructionVerdict({ found: true, obstructed: false }, LOAD_OLDER_LABEL, "360 px").ok === true,
  );
  assert(
    "an absent control is not reported as an obstruction",
    obstructionVerdict({ found: false }, LOAD_OLDER_LABEL, "360 px").obstructed === false,
  );

  assert("an unexpected write fails the fence", writeFenceVerdict([{ action: "send", method: "POST" }], ["read"]).ok === false);
  assert("an allowed write passes the fence", writeFenceVerdict([{ action: "read", method: "POST" }], ["read"]).ok === true);

  assert("overflow detected", overflowVerdict({ scrollWidth: 500, innerWidth: 360 }).overflows === true);
  assert("unmeasured overflow is not a pass claim", overflowVerdict({}).measured === false);
  assert("signin url is refused", isSignInUrl("http://x/signin"));
  assert("the chat route is not a sign-in", !isSignInUrl("http://x/chat"));
  assert("screenshot name carries state, viewport and variant", screenshotName("empty-channel", "360", "pane") === "empty-channel-360px-pane.png");

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

  const allPass = new Array(44).fill(null).map(() => ({ verdict: PASS }));
  assert("a complete all-pass matrix exits 0", matrixExitCode(allPass, 44) === 0);
  assert("one NOT-RUN exits 1", matrixExitCode(allPass.slice(0, 43).concat([{ verdict: NOT_RUN }]), 44) === 1);
  assert("a partial matrix exits 1 even if every cell it has passed", matrixExitCode(allPass.slice(0, 11), 44) === 1);
  assert("a short matrix is incomplete", matrixIncomplete(allPass.slice(0, 11), 44) === true);

  const table = renderMarkdownTable(
    [{ state: "empty-channel", width: "360", verdict: PASS, screenshots: ["a.png"] }],
    ACCEPTANCE_VIEWPORTS.map((v) => v.key),
    CHAT_STATES,
    viewportLabel,
  );
  assert("the table has a row per state", table.split("\n").length === 2 + CHAT_STATES.length);
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
  console.log(`chat-acceptance self-tests: ${passedCount} passed`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

// ----------------------------------------------------------------- runners

const SHIFT_ENTER = { ...ENTER, modifiers: 8 };

async function axeCell(ctx, checks) {
  const axe = await ctx.runAxe(ctx.cdp);
  const serious = seriousViolations(axe.violations ?? []);
  if (axe.ran && serious.length > 0)
    checks.push(
      failed("axe", `${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`),
    );
  return axe;
}

function seedHealthyChat(ctx, messagePage) {
  const { scenario, now } = ctx;
  scenario.mode = "synthetic";
  scenario.channelsFail = false;
  scenario.messagesFail = false;
  scenario.channels = channelListFixture(now);
  scenario.channelDetail = channelDetailFixture(now);
  scenario.messagePage = messagePage ?? messagePageFixture(now, 3, MESSAGE_PREFIX, 930000, null);
  scenario.olderPage = null;
  scenario.uploadStatus = 200;
  scenario.sendStatus = 200;
  scenario.stallSendMs = 0;
}

async function openChatHome(ctx) {
  const { cdp, navigate, evaluate, settleMs } = ctx;
  await navigate(cdp, "/chat", settleMs);
  for (let i = 0; i < 15; i += 1) {
    const surface = await evaluate(cdp, chatSurfaceExpression());
    if (surface?.chatNavCount > 0 || String(surface?.bodyText ?? "").includes("Welcome to Chat")) return surface;
    await sleep(400);
  }
  return evaluate(cdp, chatSurfaceExpression());
}

async function openChannel(ctx) {
  const { cdp, navigate, evaluate, settleMs } = ctx;
  await navigate(cdp, `/chat?channel=${ACTIVE_CHANNEL_ID}`, settleMs);
  let last = null;
  for (let i = 0; i < 18; i += 1) {
    const surface = await evaluate(cdp, chatSurfaceExpression());
    last = surface ?? last;
    if ((surface?.alertTexts ?? []).length > 0) return surface;
    if (surface?.hasComposer && surface.composerPlaceholder === COMPOSER_PLACEHOLDER) return surface;
    await sleep(400);
  }
  if (last?.hasComposer) return last;
  const clicked = await evaluate(cdp, clickByAccessibleNameExpression(CHANNEL_NAME));
  if (clicked === true) {
    await sleep(settleMs);
    return evaluate(cdp, chatSurfaceExpression());
  }
  return evaluate(cdp, chatSurfaceExpression());
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
    await cdp.send("Page.navigate", { url: `${ctx.baseUrl}/chat?channel=${ACTIVE_CHANNEL_ID}` });
    let skeletons = 0;
    let surface = null;
    for (let i = 0; i < 45 && skeletons === 0; i += 1) {
      await sleep(150);
      skeletons = Number(await evaluate(cdp, skeletonCountExpression())) || 0;
      surface = await evaluate(cdp, chatSurfaceExpression());
    }
    if (skeletons > 0) {
      shots.push(await screenshot(cdp, state, viewport.key, "skeleton"));
      checks.push(passed(`a delayed chat read paints ${skeletons} skeleton blocks, not a spinner`));
    } else {
      shots.push(await screenshot(cdp, state, viewport.key, "no-skeleton"));
      checks.push(unreached("loading skeleton", "no skeleton was observed before the page settled"));
    }
    const announced = (surface?.statusTexts ?? []).some(
      (t) => t.includes("Loading conversations") || t.includes("Loading messages") || t.includes("Loading chat"),
    );
    if (announced) checks.push(passed("the loading surface announces itself in a live region"));
    else checks.push(failed("loading skeleton", "nothing announces that chat is loading to a screen-reader user"));
    scenario.delayMs = 0;
    seedHealthyChat(ctx);
    await sleep(settleMs);
    axe = await axeCell(ctx, checks);
  } catch (e) {
    ctx.scenario.delayMs = 0;
    checks.push(unreached("loading skeleton", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runEmptyChannel(ctx) {
  const state = "empty-channel";
  const { cdp, viewport, screenshot } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx, { messages: [], nextCursor: null });
    const surface = await openChannel(ctx);
    shots.push(await screenshot(cdp, state, viewport.key, "empty"));
    const verdict = emptyChannelVerdict(surface ?? {});
    if (verdict.ok) checks.push(passed("a channel with no messages renders its own empty state"));
    else checks.push(failed("empty channel", verdict.reason));
    if (surface?.hasComposer === true) checks.push(passed("the composer stays available in an empty channel"));
    else checks.push(failed("empty channel", "an empty channel offers no way to write the first message"));
    const older = (surface?.buttonTexts ?? []).includes(LOAD_OLDER_LABEL);
    if (older) checks.push(failed("empty channel", `an exhausted channel still offers "${LOAD_OLDER_LABEL}"`));
    else checks.push(passed("an exhausted channel offers no load-older control"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("empty channel", String(e.message ?? e)));
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
    seedHealthyChat(ctx);
    scenario.messagesFail = true;
    scenario.messageRequests = [];
    await openChannel(ctx);
    await sleep(1200);
    const surface = await evaluate(cdp, chatSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "500"));
    const verdict = timelineErrorVerdict(surface ?? {});
    if (verdict.ok) checks.push(passed("a 500 on the timeline is announced with a retry"));
    else checks.push(failed("error state", verdict.reason));

    const before = scenario.messageRequests.length;
    const clicked =
      (await realClick(cdp, evaluate, RETRY_LABEL)) ||
      (await evaluate(cdp, clickByAccessibleNameExpression(RETRY_LABEL))) === true;
    if (!clicked) {
      checks.push(failed("retry", `the error surface offered no operable "${RETRY_LABEL}" control`));
    } else {
      scenario.messagesFail = false;
      await sleep(settleMs);
      if (scenario.messageRequests.length > before)
        checks.push(passed(`"${RETRY_LABEL}" re-issues the timeline read`));
      else checks.push(failed("retry", `"${RETRY_LABEL}" issued no new GET /chat/channels/:id/messages`));
      const recovered = await evaluate(cdp, chatSurfaceExpression());
      shots.push(await screenshot(cdp, state, viewport.key, "recovered"));
      if (recovered?.hasComposer === true && (recovered.alertTexts ?? []).length === 0)
        checks.push(passed("a healthy read after the failure restores the conversation in place"));
      else checks.push(failed("recovery", "the conversation never recovered after the read started succeeding again"));
    }
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("error and retry", String(e.message ?? e)));
  } finally {
    ctx.scenario.messagesFail = false;
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runDenied(ctx) {
  const state = "denied";
  const { cdp, viewport, evaluate, screenshot, scenario } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    scenario.stripPermissions = CHAT_DENY_PREFIXES;
    scenario.strippedKeys = [];
    scenario.accessRequests = 0;
    await openChatHome(ctx);
    await sleep(1500);
    const surface = await evaluate(cdp, chatSurfaceExpression());
    const sidebar = await evaluate(cdp, sidebarRowsExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "denied"));
    const notDenied =
      scenario.accessRequests === 0
        ? `the browser issued no GET /me/access — the access snapshot is fetched server-side and dehydrated into the page, so removing scopes from a browser response cannot make this session a denied reader; this state needs a session that genuinely lacks ${CHAT_DENY_PREFIXES.join(", ")}`
        : scenario.strippedKeys.length === 0
          ? "no chat permission and no owner bypass was actually removed from GET /me/access"
          : null;
    if (notDenied !== null) {
      checks.push(unreached("denied", notDenied));
      checks.push(unreached("denied", "the conversation rows were not inspected: this session was never denied"));
    } else {
      const verdict = deniedChatVerdict({
        statusTexts: surface?.statusTexts ?? [],
        bodyText: surface?.bodyText ?? "",
        strippedKeys: scenario.strippedKeys,
      });
      if (verdict.ok) checks.push(passed("a reader without the chat permissions is told so, not shown an empty room"));
      else if (!verdict.measured) checks.push(unreached("denied", verdict.reason));
      else checks.push(failed("denied", verdict.reason));

      if ((sidebar?.rows ?? []).length > 0)
        checks.push(failed("denied", `a reader without the chat permissions still sees ${sidebar.rows.length} conversation row(s)`));
      else checks.push(passed("no conversation rows are rendered without the chat read permission"));
    }
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("denied", String(e.message ?? e)));
  } finally {
    ctx.scenario.stripPermissions = [];
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.strippedKeys = ctx.scenario.strippedKeys;
  cellResult.accessRequestsSeenInBrowser = ctx.scenario.accessRequests;
  return cellResult;
}

async function runOwnershipSplit(ctx) {
  const state = "ownership-split";
  const { cdp, viewport, navigate, evaluate, screenshot, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    const chatSurface = await openChannel(ctx);
    const sidebar = await evaluate(cdp, sidebarRowsExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "conversation"));

    const sidebarVerdict = sidebarPresenceVerdict(sidebar);
    if (sidebarVerdict.ok)
      checks.push(passed(`the sidebar owns the conversation list (${(sidebar.lists ?? []).join(", ")})`));
    else checks.push(failed("sidebar ownership", sidebarVerdict.reason));

    await navigate(cdp, "/chat/settings", settleMs);
    await sleep(1000);
    const settingsSurface = await evaluate(cdp, chatSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "legacy-settings-redirect"));

    const verdict = ownershipVerdict({ chatSurface, settingsSurface });
    if (verdict.ok) checks.push(passed("the retired settings route returns users to chat"));
    else checks.push(failed("ownership", verdict.reason));

    const overflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    if (!overflow.measured) checks.push(unreached("overflow", "layout could not be measured"));
    else if (overflow.overflows)
      checks.push(failed("overflow", `/chat scrolls ${overflow.by}px horizontally after the redirect`));
    else checks.push(passed("no horizontal overflow after the settings redirect"));

    const measured = await evaluate(cdp, viewportExpression());
    const zoom = zoomVerdict(measured, viewport);
    if (zoom.ok) checks.push(passed(`viewport is ${viewport.label}`));
    else checks.push(failed("viewport", zoom.reason));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("ownership split", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runDeferredDialogsAndThreads(ctx) {
  const state = "deferred-dialogs-and-threads";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  let chunksForDialog = 0;
  try {
    seedHealthyChat(ctx);
    await openChatHome(ctx);
    await sleep(1200);
    const before = await evaluate(cdp, chatSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "closed"));

    const chunksBefore = scenario.chunkRequests.length;
    const dmReach = obstructionVerdict(
      await evaluate(cdp, pointerObstructionExpression(NEW_DM_LABEL)),
      NEW_DM_LABEL,
      viewport.label,
    );
    const openedDm =
      dmReach.ok &&
      ((await realClick(cdp, evaluate, NEW_DM_LABEL)) ||
        (await evaluate(cdp, clickByAccessibleNameExpression(NEW_DM_LABEL))) === true);
    if (!openedDm) {
      checks.push(
        unreached(
          "deferred dialog",
          dmReach.reason ?? `no "${NEW_DM_LABEL}" trigger could be operated at ${viewport.label}`,
        ),
      );
    } else {
      await sleep(Math.max(1500, settleMs));
      const after = await evaluate(cdp, chatSurfaceExpression());
      chunksForDialog = scenario.chunkRequests.length - chunksBefore;
      shots.push(await screenshot(cdp, state, viewport.key, "dialog"));
      const verdict = deferredVerdict({ before, after, label: NEW_DM_LABEL });
      if (verdict.ok) checks.push(passed(`"${NEW_DM_LABEL}" mounts its dialog only when operated`));
      else checks.push(failed("deferred dialog", verdict.reason));
      const dialog = await evaluate(cdp, dialogExpression());
      if (dialog?.open === true) {
        await pressKey(cdp, ESCAPE);
        await sleep(800);
      }
      const closed = await evaluate(cdp, dialogExpression());
      if (closed?.open === true) checks.push(failed("deferred dialog", "Escape did not close the dialog"));
      else checks.push(passed("Escape closes the deferred dialog"));
    }

    await openChannel(ctx);
    const threadBefore = await evaluate(cdp, chatSurfaceExpression());
    const threadReach = obstructionVerdict(
      await evaluate(cdp, pointerObstructionExpression(OPEN_THREAD_LABEL)),
      OPEN_THREAD_LABEL,
      viewport.label,
    );
    const openedThread =
      threadReach.ok &&
      ((await realClick(cdp, evaluate, OPEN_THREAD_LABEL)) ||
        (await evaluate(cdp, clickByAccessibleNameExpression(OPEN_THREAD_LABEL))) === true);
    if (!openedThread) {
      checks.push(
        unreached(
          "deferred thread",
          threadReach.obstructed
            ? threadReach.reason
            : `no "${OPEN_THREAD_LABEL}" trigger is reachable at ${viewport.label} — it is revealed on message hover`,
        ),
      );
    } else {
      await sleep(Math.max(1500, settleMs));
      const threadAfter = await evaluate(cdp, chatSurfaceExpression());
      shots.push(await screenshot(cdp, state, viewport.key, "thread"));
      const verdict = threadDeferredVerdict({ before: threadBefore, after: threadAfter });
      if (verdict.ok) checks.push(passed(`"${OPEN_THREAD_LABEL}" mounts the thread panel only when operated`));
      else checks.push(failed("deferred thread", verdict.reason));
      await evaluate(cdp, clickByAccessibleNameExpression(CLOSE_THREAD_LABEL));
      await sleep(600);
    }
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("deferred dialogs and threads", String(e.message ?? e)));
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.chunkRequestsForDialog = chunksForDialog;
  return cellResult;
}

async function runKeyboardComposer(ctx) {
  const state = "keyboard-composer";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    scenario.writes = [];
    const surface = await openChannel(ctx);
    if (surface?.hasComposer !== true) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-composer"));
      checks.push(unreached("composer", `the conversation pane did not mount at ${viewport.label}`));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }
    if (surface.composerPlaceholder === COMPOSER_PLACEHOLDER)
      checks.push(passed(`the composer names its channel: "${COMPOSER_PLACEHOLDER}"`));
    else
      checks.push(
        failed("composer", `the composer placeholder reads "${surface.composerPlaceholder}", expected "${COMPOSER_PLACEHOLDER}"`),
      );
    const nameSource = surface.composerAriaLabel || surface.composerLabelledBy || surface.composerPlaceholder;
    if (nameSource) checks.push(passed(`the composer has an accessible name ("${nameSource}")`));
    else checks.push(failed("composer", "the composer textarea has no accessible name at all"));

    const focus = await evaluate(cdp, composerExpression());
    await typeText(cdp, COMPOSER_DRAFT);
    await sleep(300);
    const sendsBeforeShift = scenario.writes.filter((w) => w.action === "send").length;
    await pressKey(cdp, SHIFT_ENTER);
    await sleep(700);
    const afterShiftEnter = await evaluate(cdp, composerValueExpression());
    const sendsAfterShiftEnter = scenario.writes.filter((w) => w.action === "send").length - sendsBeforeShift;
    shots.push(await screenshot(cdp, state, viewport.key, "draft"));

    await pressKey(cdp, ENTER);
    await sleep(Math.max(1500, settleMs));
    const afterEnter = await evaluate(cdp, composerValueExpression());
    const sendsAfterEnter = scenario.writes.filter((w) => w.action === "send").length - sendsBeforeShift - sendsAfterShiftEnter;
    shots.push(await screenshot(cdp, state, viewport.key, "sent"));

    const verdict = composerKeyboardVerdict({
      focus,
      afterShiftEnter,
      sendsAfterShiftEnter,
      afterEnter,
      sendsAfterEnter,
      draft: COMPOSER_DRAFT,
    });
    if (verdict.ok)
      checks.push(passed("Shift+Enter writes a newline, Enter sends exactly once and clears the draft"));
    else checks.push(failed("composer keyboard", verdict.reason));

    await evaluate(cdp, composerExpression());
    await typeText(cdp, COMPOSER_DRAFT);
    await sleep(300);
    const sendEnabled = (await evaluate(cdp, chatSurfaceExpression()))?.sendDisabled === false;
    if (sendEnabled) checks.push(passed(`a draft in the composer enables the "${SEND_LABEL}" control`));
    else checks.push(failed("composer keyboard", `the "${SEND_LABEL}" control stays disabled with a draft in the composer`));
    let reachedSend = false;
    for (let i = 0; i < 12 && !reachedSend; i += 1) {
      await pressKey(cdp, TAB);
      await sleep(60);
      const active = await evaluate(cdp, activeElementExpression());
      if (String(active?.ariaLabel ?? "") === SEND_LABEL) reachedSend = true;
    }
    if (reachedSend) checks.push(passed(`Tab from a composer holding a draft reaches the "${SEND_LABEL}" control`));
    else
      checks.push(
        failed(
          "composer keyboard",
          `Tab from a composer holding a draft never reached "${SEND_LABEL}" within 12 presses`,
        ),
      );

    const fence = writeFenceVerdict(scenario.writes, ["send", "read", "other"]);
    if (fence.ok) checks.push(passed("every write the composer attempted was intercepted, not delivered"));
    else checks.push(failed("write fence", fence.reason));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("keyboard composer", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runPendingAndRetrySend(ctx) {
  const state = "pending-and-retry-send";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    scenario.writes = [];
    const surface = await openChannel(ctx);
    if (surface?.hasComposer !== true) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-composer"));
      checks.push(unreached("pending send", `the conversation pane did not mount at ${viewport.label}`));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }

    scenario.stallSendMs = 5000;
    scenario.sendStatus = 500;
    await evaluate(cdp, composerExpression());
    await typeText(cdp, COMPOSER_DRAFT);
    await sleep(250);
    await pressKey(cdp, ENTER);

    let duringSend = null;
    for (const delay of [250, 300, 400]) {
      await sleep(delay);
      const sample = await evaluate(cdp, chatSurfaceExpression());
      if (sample?.sendDisabled === true) {
        duringSend = sample;
        break;
      }
      duringSend = sample;
    }
    shots.push(await screenshot(cdp, state, viewport.key, "in-flight"));
    const pending = pendingSendVerdict({ duringSend });
    if (pending.ok) checks.push(passed("an in-flight send disables the Send control and shows a pending affordance"));
    else if (!pending.measured) checks.push(unreached("pending send", pending.reason));
    else checks.push(failed("pending send", pending.reason));

    await sleep(scenario.stallSendMs + 1500);
    const restoredDraft = await evaluate(cdp, composerValueExpression());
    const toastTexts = await evaluate(cdp, toastsExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "failed"));

    scenario.stallSendMs = 0;
    scenario.sendStatus = 200;
    await evaluate(cdp, composerExpression());
    await pressKey(cdp, ENTER);
    await sleep(Math.max(1800, settleMs));
    shots.push(await screenshot(cdp, state, viewport.key, "retried"));

    const sends = scenario.writes.filter((w) => w.action === "send");
    const retry = retrySendVerdict({
      restoredDraft,
      draft: COMPOSER_DRAFT,
      firstClientKey: sends[0]?.clientKey ?? null,
      secondClientKey: sends[1]?.clientKey ?? null,
      toastTexts: toastTexts ?? [],
    });
    if (retry.ok)
      checks.push(passed("a failed send restores the draft, tells the writer, and retries under the same clientKey"));
    else checks.push(failed("retry send", retry.reason));

    if (sends.length === 2) checks.push(passed("exactly two send attempts were dispatched"));
    else checks.push(failed("retry send", `${sends.length} send attempt(s) were dispatched, expected 2`));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("pending and retry send", String(e.message ?? e)));
  } finally {
    ctx.scenario.stallSendMs = 0;
    ctx.scenario.sendStatus = 200;
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

async function runUnreadIndicators(ctx) {
  const state = "unread-indicators";
  const { cdp, viewport, evaluate, screenshot } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    await openChatHome(ctx);
    await sleep(1200);
    const sidebar = await evaluate(cdp, sidebarRowsExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "sidebar"));

    const presence = sidebarPresenceVerdict(sidebar);
    if (presence.ok) checks.push(passed("the sidebar rendered the seeded conversations"));
    else checks.push(failed("sidebar", presence.reason));

    const verdict = unreadBadgeVerdict(sidebar?.rows ?? []);
    if (verdict.ok)
      checks.push(passed(`unread counts render from the server field and clamp at "${MANY_UNREAD_BADGE}"`));
    else if (!verdict.measured) checks.push(unreached("unread indicators", verdict.reason));
    else checks.push(failed("unread indicators", verdict.reason));

    const overflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    if (!overflow.measured) checks.push(unreached("overflow", "layout could not be measured"));
    else if (overflow.overflows)
      checks.push(failed("overflow", `the sidebar scrolls the document ${overflow.by}px horizontally`));
    else checks.push(passed("unread badges introduce no horizontal overflow"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("unread indicators", String(e.message ?? e)));
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.unobservable =
    "The unread badge is a bare number with no aria-label and no role; its accessible text is the count itself. This cell asserts the rendered count and the 99+ clamp, not that a screen reader announces the number as an unread count.";
  return cellResult;
}

async function runUploadError(ctx) {
  const state = "upload-error";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs, uploadFile } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    seedHealthyChat(ctx);
    scenario.writes = [];
    scenario.uploadStatus = 500;
    const surface = await openChannel(ctx);
    if (surface?.hasComposer !== true) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-composer"));
      checks.push(unreached("upload error", `the conversation pane did not mount at ${viewport.label}`));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }
    if ((surface.buttonLabels ?? []).includes(ATTACH_LABEL))
      checks.push(passed(`the composer exposes a named "${ATTACH_LABEL}" control`));
    else checks.push(failed("upload error", `the composer exposes no "${ATTACH_LABEL}" control`));

    const doc = await cdp.send("DOM.getDocument", { depth: 1 });
    const node = await cdp
      .send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: `input[type="file"][aria-label="${FILE_INPUT_LABEL}"]`,
      })
      .catch(() => null);
    if (!node?.nodeId) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-input"));
      checks.push(unreached("upload error", `no input[type=file][aria-label="${FILE_INPUT_LABEL}"] is mounted`));
      return cellFromChecks(state, viewport.key, checks, shots, await ctx.runAxe(cdp));
    }
    await cdp.send("DOM.setFileInputFiles", { files: [uploadFile], nodeId: node.nodeId });
    await sleep(Math.max(2000, settleMs));

    const toastTexts = await evaluate(cdp, toastsExpression());
    const attachmentChips = Number(await evaluate(cdp, attachmentChipsExpression())) || 0;
    shots.push(await screenshot(cdp, state, viewport.key, "failed"));

    const verdict = uploadErrorVerdict({ toastTexts: toastTexts ?? [], attachmentChips });
    if (verdict.ok) checks.push(passed("a refused upload tells the writer and attaches nothing to the draft"));
    else checks.push(failed("upload error", verdict.reason));

    const attempted = scenario.writes.filter((w) => w.action === "upload").length;
    if (attempted === 1) checks.push(passed("the upload was attempted exactly once and was intercepted, not delivered"));
    else checks.push(failed("upload error", `${attempted} upload request(s) were dispatched, expected 1`));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("upload error", String(e.message ?? e)));
  } finally {
    ctx.scenario.uploadStatus = 200;
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.unobservable =
    "Upload failures are Sonner toasts only. There is no inline error node, no role=alert and no per-file retry control, so this cell reads the toast region; the retry gesture is re-selecting the file.";
  return cellResult;
}

async function runLongChannelPagination(ctx) {
  const state = "long-channel-pagination";
  const { cdp, viewport, evaluate, screenshot, scenario, settleMs, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  let clicks = 0;
  let obstruction = null;
  let controlOffered = false;
  try {
    seedHealthyChat(ctx, messagePageFixture(now, FIRST_PAGE_MESSAGE_COUNT, MESSAGE_PREFIX, 930000, OLDER_CURSOR));
    scenario.olderPage = messagePageFixture(now, OLDER_PAGE_MESSAGE_COUNT, OLDER_MESSAGE_PREFIX, 920000, null);
    scenario.messageRequests = [];
    await openChannel(ctx);
    await sleep(1200);
    shots.push(await screenshot(cdp, state, viewport.key, "first-page"));

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const surface = await evaluate(cdp, chatSurfaceExpression());
      if (!(surface?.buttonTexts ?? []).includes(LOAD_OLDER_LABEL)) break;
      controlOffered = true;
      const probe = await evaluate(cdp, pointerObstructionExpression(LOAD_OLDER_LABEL));
      const reach = obstructionVerdict(probe, LOAD_OLDER_LABEL, viewport.label);
      if (reach.obstructed) {
        obstruction = reach.reason;
        break;
      }
      const clicked =
        (await realClick(cdp, evaluate, LOAD_OLDER_LABEL)) ||
        (await evaluate(cdp, clickByAccessibleNameExpression(LOAD_OLDER_LABEL))) === true;
      if (!clicked) break;
      clicks += 1;
      await sleep(Math.max(1500, settleMs));
      const here = String(await evaluate(cdp, "location.pathname"));
      if (!here.startsWith("/chat")) {
        obstruction = `pressing "${LOAD_OLDER_LABEL}" at ${viewport.label} left /chat for ${here} — the press reached some other control`;
        break;
      }
      if (scenario.messageRequests.some((r) => r.cursor !== null && r.cursor !== undefined)) break;
    }
    await sleep(1200);
    const after = await evaluate(cdp, chatSurfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "older-page"));
    const olderVisible = String(after?.bodyText ?? "").includes(OLDER_MESSAGE_PREFIX);
    const controlGone = !(after?.buttonTexts ?? []).includes(LOAD_OLDER_LABEL);

    const verdict = paginationVerdict({
      controlOffered,
      clicks,
      networkRequests: scenario.messageRequests,
      olderVisible,
      controlGone,
    });
    if (verdict.ok)
      checks.push(
        passed(`"${LOAD_OLDER_LABEL}" reached the server cursor after ${clicks} press(es) and rendered the older page`),
      );
    else if (obstruction !== null) checks.push(unreached("pagination", obstruction));
    else checks.push(failed("pagination", verdict.reason));

    const overflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    if (!overflow.measured) checks.push(unreached("overflow", "layout could not be measured"));
    else if (overflow.overflows)
      checks.push(failed("overflow", `a long channel scrolls the document ${overflow.by}px horizontally`));
    else checks.push(passed("a long channel introduces no horizontal overflow"));
    axe = await axeCell(ctx, checks);
  } catch (e) {
    checks.push(unreached("long-channel pagination", String(e.message ?? e)));
  } finally {
    ctx.scenario.olderPage = null;
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.loadOlderPressesBeforeNetwork = clicks;
  cellResult.pointerObstruction = obstruction;
  cellResult.messageRequests = ctx.scenario.messageRequests.slice(0, 10);
  cellResult.unobservable =
    "`hasNextPage` passed to the message list is `hasNextPage || hasOlderHeld` and the first presses widen a purely client-side render window (MESSAGE_RENDER_PAGE_SIZE = 60) before any network page is requested, so the press count before the cursored request is recorded rather than asserted.";
  return cellResult;
}

const CHAT_RUNNERS = [
  runLoadingSkeleton,
  runEmptyChannel,
  runErrorAndRetry,
  runDenied,
  runOwnershipSplit,
  runDeferredDialogsAndThreads,
  runKeyboardComposer,
  runPendingAndRetrySend,
  runUnreadIndicators,
  runUploadError,
  runLongChannelPagination,
];

// -------------------------------------------------------------------- main

async function main() {
  const baseUrl = flag("base-url", "http://127.0.0.1:1000").replace(/\/$/, "");
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const settleMs = Number(flag("settle-ms", "3500"));
  const browserPath = findBrowser(flag("browser", ""));
  const shotDir = flag("screenshot-dir", process.env.CHAT_ACCEPTANCE_DIR || join(tmpdir(), "chat-acceptance"));
  const outPath = flag("out", join(shotDir, "chat-acceptance-results.json"));
  const apiOrigin = flag("api-origin", "http://127.0.0.1:1500").replace(/\/$/, "");
  const bakedOrigin = flag("baked-api-origin", "https://api.streamlineos.in").replace(/\/$/, "");
  const viewports = selectViewports(flag("viewports", ""));

  if (!browserPath) throw new Error("no Chrome/Chromium found — pass --browser=<path>");
  if (viewports.length === 0)
    throw new Error(`--viewports matched none of ${ACCEPTANCE_VIEWPORTS.map((v) => v.key).join(",")}`);
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file is required: /chat is an authenticated surface");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  if (!cookieValue) throw new Error("cookie file is empty");
  mkdirSync(shotDir, { recursive: true });

  const uploadFile = join(shotDir, "chat-acceptance-upload.txt");
  writeFileSync(uploadFile, "acceptance harness upload fixture\n");

  const axeSource = readFileSync(axeSourcePath(), "utf8");
  const origin = new URL(baseUrl).origin;
  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);

  const { proc, debugPort } = launchChrome(browserPath);
  const cells = [];
  const planned = plannedCellCount(CHAT_STATES, viewports);
  const scenario = buildChatScenario();
  const now = new Date();

  try {
    await waitForDevTools(debugPort, 20000);
    const cdp = await cdpSession(await firstPageTarget(debugPort));
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("DOM.enable");
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
    cdp.on("Network.requestWillBeSent", (params) => {
      const url = String(params.request?.url ?? "");
      if (/\.js(\?|$)/.test(url)) scenario.chunkRequests.push(url);
    });
    cdp.on("Fetch.requestPaused", (params) => {
      void handleChatPaused(cdp, params, scenario, origin, apiOrigin, bakedOrigin, now);
    });
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*/chat/*" },
        { urlPattern: "*/me/access*" },
        { urlPattern: "*/storage/upload*" },
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
    await navigate(cdp, "/chat");
    const pollSurface = async (attempts) => {
      let seen = await evaluate(cdp, chatSurfaceExpression());
      for (let i = 0; i < attempts && !(seen?.chatNavCount > 0); i += 1) {
        await sleep(1000);
        seen = await evaluate(cdp, chatSurfaceExpression());
      }
      return seen;
    };
    const live = await pollSurface(25);
    const livePreflight = {
      rendered: live?.chatNavCount > 0,
      screenshot: await screenshot(cdp, "preflight", "live", null),
      mainExcerpt: String(live?.bodyText ?? "").slice(0, 400),
    };
    if (!livePreflight.rendered)
      console.error(`!  the LIVE chat did not render for this session — body says: ${livePreflight.mainExcerpt}`);

    scenario.mode = "synthetic";
    scenario.channels = channelListFixture(now);
    scenario.channelDetail = channelDetailFixture(now);
    scenario.messagePage = messagePageFixture(now, 3, MESSAGE_PREFIX, 930000, null);
    await navigate(cdp, `/chat?channel=${ACTIVE_CHANNEL_ID}`);
    let intercepted = await evaluate(cdp, chatSurfaceExpression());
    for (let i = 0; i < 20 && intercepted?.hasComposer !== true; i += 1) {
      await sleep(1000);
      intercepted = await evaluate(cdp, chatSurfaceExpression());
    }
    if (intercepted?.hasComposer !== true) {
      await screenshot(cdp, "preflight", "intercepted", "failed");
      throw new Error(
        `preflight: ${baseUrl}/chat?channel=${ACTIVE_CHANNEL_ID} did not mount the conversation composer even with every chat read intercepted — refusing to capture a matrix against a surface that is not chat (body: ${String(intercepted?.bodyText ?? "").slice(0, 400)})`,
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
        uploadFile,
      };
      for (const runner of CHAT_RUNNERS) {
        const cell = await runner(ctx);
        log(`${cell.state} → ${cell.verdict}${cell.reason ? ` (${cell.reason})` : ""}`);
        cells.push(cell);
        scenario.mode = "passthrough";
        scenario.stripPermissions = [];
        scenario.stallSendMs = 0;
        scenario.sendStatus = 200;
        scenario.uploadStatus = 200;
        scenario.messagesFail = false;
        scenario.channelsFail = false;
        scenario.olderPage = null;
      }
      shellAxe.push({ viewport: viewport.key, result: await runShellAxe(cdp) });
    }

    const table = renderMarkdownTable(cells, viewports.map((v) => v.key), CHAT_STATES, viewportLabel);
    const counts = summarise(cells);
    const results = {
      capturedAt: new Date().toISOString(),
      surface: "/chat",
      lane: "recovery-chat CH7, gate 8",
      baseUrl,
      viewports,
      planned,
      counts,
      screenshotDir: shotDir,
      apiOrigin,
      bakedOrigin,
      activeChannelId: ACTIVE_CHANNEL_ID,
      composerPlaceholder: COMPOSER_PLACEHOLDER,
      deniedPrefixes: CHAT_DENY_PREFIXES,
      livePreflight,
      interceptedWrites: scenario.writes,
      messageRequests: scenario.messageRequests.slice(-60),
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
    writeFileSync(join(shotDir, "chat-acceptance-table.md"), `${table}\n`);
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
