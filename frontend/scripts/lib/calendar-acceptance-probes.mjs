/**
 * Page probes and pure verdicts for the `/calendar` acceptance matrix.
 *
 * Everything here is either a string of page script (evaluated through
 * `Runtime.evaluate`) or a pure function over what that script returned, so the
 * verdicts are self-testable without a browser. The runners live in
 * `calendar-acceptance-states.mjs`; the matrix primitives are shared with
 * `build-acceptance.mjs` and are not forked here.
 */

export {
  activeElementExpression,
  clickByAccessibleNameExpression,
  dialogExpression,
  liveRegionExpression,
  obstructionVerdict,
  overflowExpression,
  pointerObstructionExpression,
  skeletonCountExpression,
  viewportExpression,
  zoomVerdict,
} from "./acceptance-browser.mjs";

export const CALENDAR_STATES = [
  { key: "loading-and-populated", label: "Loading and populated" },
  { key: "empty-period", label: "Empty period" },
  { key: "error-and-retry", label: "Error and retry" },
  { key: "source-failure", label: "Source failure" },
  { key: "navigation-day-week-month", label: "Day / week / month navigation" },
  { key: "keyboard-and-detail-sheet", label: "Keyboard and event detail Sheet" },
  { key: "deep-link", label: "Deep links" },
  { key: "responsive-and-foreign-zone", label: "Responsive layout and foreign-zone row" },
];

export const READER_ZONE_FALLBACK = "Asia/Calcutta";
export const FOREIGN_ZONE = "America/New_York";

export const LOCAL_EVENT_TITLE = "Acceptance local-zone standup";
export const FOREIGN_EVENT_TITLE = "Acceptance foreign-zone review";
export const FOREIGN_LOCATION_EVENT_TITLE = "Acceptance foreign-zone offsite";
export const SURVIVING_SOURCE_EVENT_TITLE = "Acceptance surviving-source event";

export const FOREIGN_EVENT_NUMERIC_ID = 900002;
export const FOREIGN_EVENT_ID = `event-${FOREIGN_EVENT_NUMERIC_ID}`;

const HOUR_MS = 60 * 60 * 1000;

function isoAt(now, hour, minutes = 0) {
  const d = new Date(now);
  d.setHours(hour, minutes, 0, 0);
  return d;
}

function listItem(overrides) {
  return {
    allDay: false,
    color: "blue",
    category: "meeting",
    source: "event",
    timezone: null,
    location: null,
    description: null,
    creatorName: "Acceptance Harness",
    entityId: null,
    entityType: null,
    myRsvpStatus: null,
    projectId: null,
    ...overrides,
  };
}

/**
 * Three rows on today's date: one authored in the reader's zone, one authored
 * in a foreign zone with no location, and one authored in a foreign zone WITH a
 * location — which is the tallest string the virtualised row has to hold.
 */
export function syntheticCalendarEvents(now, readerZone) {
  const start = isoAt(now, 9);
  const foreignStart = isoAt(now, 11);
  const offsiteStart = isoAt(now, 14);
  return [
    listItem({
      id: "event-900001",
      title: LOCAL_EVENT_TITLE,
      start: start.toISOString(),
      end: new Date(start.getTime() + HOUR_MS).toISOString(),
      timezone: readerZone,
    }),
    listItem({
      id: FOREIGN_EVENT_ID,
      title: FOREIGN_EVENT_TITLE,
      start: foreignStart.toISOString(),
      end: new Date(foreignStart.getTime() + HOUR_MS).toISOString(),
      timezone: FOREIGN_ZONE,
    }),
    listItem({
      id: "event-900003",
      title: FOREIGN_LOCATION_EVENT_TITLE,
      start: offsiteStart.toISOString(),
      end: new Date(offsiteStart.getTime() + HOUR_MS).toISOString(),
      timezone: FOREIGN_ZONE,
      location: "Meeting room 4, Building B, 221B Baker Street, London",
    }),
  ];
}

export function survivingSourceEvents(now, readerZone) {
  const start = isoAt(now, 16);
  return [
    listItem({
      id: "event-900004",
      title: SURVIVING_SOURCE_EVENT_TITLE,
      start: start.toISOString(),
      end: new Date(start.getTime() + HOUR_MS).toISOString(),
      timezone: readerZone,
      category: "holiday",
      source: "holiday",
    }),
  ];
}

export function foreignEventDetail(now, canManage) {
  const start = isoAt(now, 11);
  return {
    id: FOREIGN_EVENT_NUMERIC_ID,
    title: FOREIGN_EVENT_TITLE,
    startDate: start.toISOString(),
    endDate: new Date(start.getTime() + HOUR_MS).toISOString(),
    allDay: false,
    timezone: FOREIGN_ZONE,
    color: "blue",
    category: "meeting",
    entityType: null,
    entityId: null,
    location: null,
    meetingUrl: null,
    description: "Authored in America/New_York so the detail surface must name the zone.",
    creatorName: "Acceptance Harness",
    myRsvpStatus: null,
    linkedTicket: null,
    rrule: null,
    isRecurring: false,
    localVersion: 1,
    canManage,
  };
}

export const SYNTHETIC_SOURCES = [
  { key: "holidays", label: "Holidays", module: "HRMS", enabled: true },
  { key: "leaves", label: "Leave", module: "HRMS", enabled: false },
  { key: "interviews", label: "Interviews", module: "HRMS", enabled: true },
];

export const DEEP_LINK_SOURCE_KEY = "leaves";

export const RETRY_CONTROL_LABELS = ["Retry", "Try Again", "Try again"];

/**
 * The two deep links `/calendar` actually implements: `?source=<key>`
 * (`use-calendar-source-deeplink.ts`) and `?create=1`
 * (`use-calendar-view-state.ts`). `?view=` and `?date=` are NOT implemented —
 * `view` and `currentDate` are local `useState` in `use-calendar-view-state.ts`
 * and are never read from or written to the URL. Asserting them would be a
 * requirement this harness invented, so the runner records the gap as an
 * observation and the matrix judges only the links the product defines.
 */
export const IMPLEMENTED_DEEP_LINKS = ["source", "create"];
export const UNIMPLEMENTED_DEEP_LINKS = ["view", "date"];

/** Which calendar read a paused request is, or `null` for everything else. */
export function classifyCalendarRequest(url) {
  const path = String(url ?? "").split("?")[0];
  if (/\/calendar\/events\/\d+\/sync-status$/.test(path)) return "sync-status";
  if (/\/calendar\/events\/\d+\/rsvp$/.test(path)) return "attendees";
  if (/\/calendar\/events\/\d+$/.test(path)) return "event-detail";
  if (/\/calendar\/events$/.test(path)) return "events-range";
  if (/\/calendar\/external-events$/.test(path)) return "external-events";
  if (/\/calendar\/sources\/[^/]+$/.test(path)) return "source-preference";
  if (/\/calendar\/sources$/.test(path)) return "sources";
  if (/\/integrations\/connections$/.test(path)) return "connections";
  return null;
}

/**
 * axe is scoped to the page body so a shell or third-party violation is not
 * charged to `/calendar`. The open Sheet is portalled out of `main`, so it is
 * included only when one is actually mounted — an include selector that matches
 * nothing makes axe throw.
 */
export function calendarAxeContextExpression() {
  return `(document.querySelector('[role="dialog"]')
    ? { include: [["main"], ['[role="dialog"]']] }
    : { include: [["main"]] })`;
}

// ---------------------------------------------------------------- expressions

export function readerZoneExpression() {
  return `Intl.DateTimeFormat().resolvedOptions().timeZone`;
}

export function surfaceExpression() {
  return `(() => {
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").replace(/\\s+/g, " ").trim();
    const alert = document.querySelector('[role="alert"]');
    const periodTrigger = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.getAttribute("aria-label") || "").startsWith("Choose month and year"),
    );
    const viewTrigger = document.querySelector('[aria-label="Calendar view"]');
    const labelStartingWith = (prefix) => {
      const b = Array.from(document.querySelectorAll("button")).find(
        (x) => (x.getAttribute("aria-label") || "").indexOf(prefix) === 0 && x.getClientRects().length > 0,
      );
      return b ? b.getAttribute("aria-label") : null;
    };
    const banners = Array.from(document.querySelectorAll(".border-status-warning-rule"))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.innerText.replace(/\\s+/g, " ").trim())
      .filter((t) => t.length > 0);
    const retryLabels = ${JSON.stringify(RETRY_CONTROL_LABELS)};
    const retryControls = Array.from(document.querySelectorAll("button"))
      .filter((b) => b.getClientRects().length > 0 && retryLabels.indexOf(named(b)) !== -1)
      .map(named);
    return {
      url: location.href,
      title: periodTrigger ? (periodTrigger.textContent || "").replace(/\\s+/g, " ").trim() : null,
      periodAriaLabel: periodTrigger ? periodTrigger.getAttribute("aria-label") : null,
      viewValue: viewTrigger ? (viewTrigger.textContent || "").trim() : null,
      prevLabel: labelStartingWith("Previous "),
      nextLabel: labelStartingWith("Next "),
      warningBanners: banners,
      retryControls: retryControls,
      hasRetry: retryControls.length > 0,
      hasAlert: Boolean(alert),
      alertText: alert ? alert.innerText.replace(/\\s+/g, " ").slice(0, 400) : null,
      eventButtons: Array.from(document.querySelectorAll("main button[aria-label]"))
        .map((b) => b.getAttribute("aria-label"))
        .filter((l) => l && l.indexOf("Acceptance ") === 0),
      bodyText: document.body ? document.body.innerText.replace(/\\s+/g, " ").slice(0, 6000) : "",
    };
  })()`;
}

/**
 * The one measurement that needed a browser: react-window gives the row a fixed
 * pixel height computed from `FOREIGN_ZONE_EXTRA_LINE`, while the card inside it
 * is auto-height. If the card is taller than the slot minus its bottom padding,
 * it paints over the next row; if the two-line clamp is shorter than the text,
 * the reader's own time is silently dropped.
 */
export function rowGeometryExpression(title) {
  return `(() => {
    const button = Array.from(document.querySelectorAll("button[aria-label]")).find(
      (b) => b.getAttribute("aria-label") === ${JSON.stringify(title)},
    );
    if (!button) return { found: false };
    const slot = button.parentElement;
    if (!slot) return { found: false };
    const slotRect = slot.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const slotStyle = window.getComputedStyle(slot);
    const paragraph = button.querySelector("p");
    const next = slot.nextElementSibling;
    return {
      found: true,
      slotStyleHeight: slot.style.height || null,
      slotHeight: Math.round(slotRect.height * 100) / 100,
      slotPaddingBottom: Math.round(parseFloat(slotStyle.paddingBottom) * 100) / 100,
      buttonHeight: Math.round(buttonRect.height * 100) / 100,
      buttonScrollHeight: button.scrollHeight,
      buttonBottom: Math.round(buttonRect.bottom * 100) / 100,
      slotBottom: Math.round(slotRect.bottom * 100) / 100,
      nextSlotTop: next ? Math.round(next.getBoundingClientRect().top * 100) / 100 : null,
      textHeight: paragraph ? Math.round(paragraph.getBoundingClientRect().height * 100) / 100 : null,
      textClientHeight: paragraph ? paragraph.clientHeight : null,
      textScrollHeight: paragraph ? paragraph.scrollHeight : null,
      textLineHeight: paragraph ? window.getComputedStyle(paragraph).lineHeight : null,
      text: paragraph ? (paragraph.textContent || "").replace(/\\s+/g, " ").trim() : null,
    };
  })()`;
}

// ------------------------------------------------------------------- verdicts

export function foreignZoneVerdict(geometry) {
  if (!geometry || geometry.found !== true)
    return { ok: false, measured: false, reason: "the foreign-zone row was not rendered" };
  const available = geometry.slotHeight - geometry.slotPaddingBottom;
  const overflowPx = Math.round((geometry.buttonHeight - available) * 100) / 100;
  const clamped = geometry.textScrollHeight > geometry.textClientHeight;
  if (overflowPx > 0.5)
    return {
      ok: false,
      measured: true,
      overflowPx,
      clamped,
      reason: `the card is ${geometry.buttonHeight}px inside a ${geometry.slotHeight}px slot with ${geometry.slotPaddingBottom}px bottom padding — it overruns the next row by ${overflowPx}px`,
    };
  if (clamped)
    return {
      ok: false,
      measured: true,
      overflowPx,
      clamped,
      reason: `the time string is clipped by line-clamp-2 (${geometry.textScrollHeight}px of text in ${geometry.textClientHeight}px), so the reader's own time is dropped`,
    };
  return { ok: true, measured: true, overflowPx, clamped, reason: null };
}

export function foreignZoneStringVerdict(text, foreignZone, readerZone) {
  if (typeof text !== "string" || text.length === 0)
    return { ok: false, reason: "no time string was rendered" };
  if (!text.includes(foreignZone))
    return { ok: false, reason: `the authored zone ${foreignZone} is not named in "${text}"` };
  if (!text.includes(readerZone))
    return { ok: false, reason: `the reader's zone ${readerZone} is not named in "${text}"` };
  return { ok: true, reason: null };
}

export function failureSurfaceSettled(surface) {
  const announced =
    surface?.hasAlert === true || (surface?.warningBanners ?? []).length > 0;
  return announced && (surface?.retryControls ?? []).length > 0;
}

export function offRouteVerdict(url, label) {
  const path = (() => {
    try {
      return new URL(String(url)).pathname;
    } catch {
      return String(url);
    }
  })();
  if (path.indexOf("/calendar") === 0) return { ok: true, reason: null };
  return {
    ok: false,
    reason: `pressing "${label}" left /calendar for ${path} — the press reached some other control`,
  };
}

export function sourceFailureVerdict({
  bannerTextOnSurface,
  bannerTextInPanel,
  failureLabel,
  survivingEventVisible,
}) {
  const inPanel = typeof bannerTextInPanel === "string" && bannerTextInPanel.includes(failureLabel);
  const onSurface =
    typeof bannerTextOnSurface === "string" && bannerTextOnSurface.includes(failureLabel);
  if (!inPanel && !onSurface)
    return { ok: false, discoverable: false, reason: `no banner named the failed source "${failureLabel}"` };
  if (survivingEventVisible !== true)
    return {
      ok: false,
      discoverable: onSurface,
      reason: "one source failed and the surviving source's events disappeared too",
    };
  if (!onSurface)
    return {
      ok: false,
      discoverable: false,
      reason: `the failure is announced only inside the "Event sources" popover; the calendar surface shows no indication that "${failureLabel}" failed`,
    };
  return { ok: true, discoverable: true, reason: null };
}

export function announcementVerdict(steps) {
  const silent = steps.filter((s) => s.liveBefore === s.liveAfter);
  if (steps.length === 0) return { ok: false, reason: "no navigation step was performed" };
  const moved = steps.filter((s) => s.movedPeriod === true);
  if (moved.length === 0) return { ok: false, reason: "no navigation step changed the period" };
  const silentMoves = silent.filter((s) => s.movedPeriod === true);
  if (silentMoves.length > 0)
    return {
      ok: false,
      reason: `${silentMoves.length} of ${moved.length} navigation steps moved the period without changing the aria-live text (${silentMoves
        .map((s) => s.label)
        .join(", ")})`,
    };
  return { ok: true, reason: null };
}

export function keyboardVerdict({ reachedName, sheetOpened, tabsStayedInsideSheet, focusReturnedTo, triggerName }) {
  if (!reachedName) return { ok: false, reason: "Tab never reached the event row" };
  if (sheetOpened !== true) return { ok: false, reason: "Enter on the focused event row opened no detail Sheet" };
  if (tabsStayedInsideSheet !== true)
    return { ok: false, reason: "Tab escaped the open Sheet — the dialog does not trap focus" };
  if (focusReturnedTo !== triggerName)
    return {
      ok: false,
      reason: `closing the Sheet returned focus to "${focusReturnedTo}" instead of the row that opened it`,
    };
  return { ok: true, reason: null };
}

export function unsupportedActionVerdict(controls, forbidden) {
  const offered = forbidden.filter((name) =>
    controls.some((c) => typeof c === "string" && c.toLowerCase() === name.toLowerCase()),
  );
  if (offered.length > 0)
    return {
      ok: false,
      reason: `an event the viewer cannot manage still offers ${offered.join(", ")}`,
    };
  return { ok: true, reason: null };
}

export function deepLinkVerdict({ requestedSource, preferenceWrites, urlAfter }) {
  const wrote = preferenceWrites.some((w) => w.sourceKey === requestedSource && w.enabled === true);
  if (!wrote)
    return { ok: false, reason: `?source=${requestedSource} did not enable that source` };
  if (/[?&]source=/.test(String(urlAfter)))
    return { ok: false, reason: "the source param survived in the URL, so a reload re-applies it" };
  return { ok: true, reason: null };
}

export function createDeepLinkVerdict({ dialogOpened, urlAfter }) {
  if (dialogOpened !== true) return { ok: false, reason: "?create=1 opened no event create dialog" };
  if (/[?&]create=/.test(String(urlAfter)))
    return { ok: false, reason: "the create param survived in the URL, so a reload re-opens the dialog" };
  return { ok: true, reason: null };
}
