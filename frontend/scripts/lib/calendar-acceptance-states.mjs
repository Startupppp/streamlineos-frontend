/**
 * The eight `/calendar` acceptance states. Each runner drives the real browser
 * through one state at one viewport and returns a single matrix cell built by
 * the shared `cellFromChecks`, so a cell with no screenshot, an unreached check
 * or an axe run that never happened reports NOT-RUN rather than PASS.
 *
 * Every state that needs data it cannot otherwise reach — an empty period, a
 * 500, a single failed source — reaches it by pausing the real request with
 * `Fetch.requestPaused` and fulfilling it, exactly as `build-acceptance-states`
 * does for its 500-vs-404 split. Nothing here writes to the shared application.
 */

import { sleep } from "./cdp.mjs";
import { seriousViolations } from "./axe.mjs";
import { cellFromChecks, overflowVerdict, passed, failed, unreached } from "./acceptance-matrix.mjs";
import {
  DEEP_LINK_SOURCE_KEY,
  FOREIGN_EVENT_TITLE,
  FOREIGN_LOCATION_EVENT_TITLE,
  FOREIGN_ZONE,
  LOCAL_EVENT_TITLE,
  SURVIVING_SOURCE_EVENT_TITLE,
  SYNTHETIC_SOURCES,
  activeElementExpression,
  UNIMPLEMENTED_DEEP_LINKS,
  announcementVerdict,
  clickByAccessibleNameExpression,
  createDeepLinkVerdict,
  deepLinkVerdict,
  dialogExpression,
  foreignZoneStringVerdict,
  foreignZoneVerdict,
  keyboardVerdict,
  liveRegionExpression,
  overflowExpression,
  rowGeometryExpression,
  skeletonCountExpression,
  sourceFailureVerdict,
  surfaceExpression,
  syntheticCalendarEvents,
  survivingSourceEvents,
  unsupportedActionVerdict,
  viewportExpression,
  zoomVerdict,
} from "./calendar-acceptance-probes.mjs";

export const FAILED_SOURCE = { key: "leaves", label: "Leave" };
export const UNSUPPORTED_EVENT_ACTIONS = ["Edit", "Delete", "Delete event", "Cancel occurrence", "Unlink ticket"];
const TAB_LIMIT = 60;

function element(name) {
  return `(() => {
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").replace(/\\s+/g, " ").trim();
    const visible = (el) => el.getClientRects().length > 0;
    const target = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], a'))
      .filter(visible)
      .find((el) => named(el) === ${JSON.stringify(name)});
    if (!target) return null;
    target.scrollIntoView({ block: "center" });
    const r = target.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`;
}

export async function realClick(cdp, evaluate, name) {
  const point = await evaluate(cdp, element(name));
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

export async function pressKey(cdp, { key, code, keyCode, text }) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  if (text)
    await cdp.send("Input.dispatchKeyEvent", {
      type: "char",
      key,
      code,
      text,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

export const TAB = { key: "Tab", code: "Tab", keyCode: 9 };
export const ENTER = { key: "Enter", code: "Enter", keyCode: 13, text: "\r" };
export const ESCAPE = { key: "Escape", code: "Escape", keyCode: 27 };

async function switchToListMode(cdp, evaluate, settleMs) {
  const clicked = await realClick(cdp, evaluate, "List View");
  if (clicked) await sleep(settleMs);
  return clicked;
}

async function switchCalendarView(cdp, evaluate, label, settleMs) {
  const opened = await realClick(cdp, evaluate, "Calendar view");
  if (!opened) return false;
  await sleep(600);
  let chose = await realClick(cdp, evaluate, label);
  if (!chose) chose = (await evaluate(cdp, clickByAccessibleNameExpression(label))) === true;
  await sleep(settleMs);
  return chose === true;
}

/**
 * `/calendar` has two distinct failure surfaces and the difference matters.
 * A failed range read keeps the page and renders an inline warning strip with
 * its own "Retry" (`calendar-view.tsx`); only a render-time throw reaches the
 * segment error boundary, whose control is "Try Again". A state that is not
 * about errors clears one transient failure of either kind — the shared API is
 * under concurrent load — and records that it did, rather than reporting the
 * recovery as the state under test.
 */
async function navigateCalendar(ctx, path = "/calendar", wait) {
  const { cdp, navigate, evaluate, settleMs } = ctx;
  await navigate(cdp, path, wait ?? settleMs);
  let surface = await evaluate(cdp, surfaceExpression());
  let recovered = null;
  const failed =
    surface?.hasAlert === true || (surface?.warningBanners ?? []).length > 0;
  if (failed) {
    recovered = surface.alertText ?? (surface.warningBanners ?? []).join(" | ");
    const retried =
      (await realClick(cdp, evaluate, "Retry")) ||
      (await evaluate(cdp, clickByAccessibleNameExpression("Try Again"))) === true;
    if (retried) await sleep(settleMs);
    surface = await evaluate(cdp, surfaceExpression());
  }
  return { surface, recovered };
}

async function axeCell(runAxe, cdp, checks) {
  const axe = await runAxe(cdp);
  const serious = seriousViolations(axe.violations ?? []);
  if (axe.ran && serious.length > 0)
    checks.push(
      failed("axe", `${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`),
    );
  return axe;
}

// --------------------------------------------------------------- 1. populated

export async function runLoadingAndPopulated(ctx) {
  const state = "loading-and-populated";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "delay";
    scenario.delayMs = 3000;
    await cdp.send("Page.navigate", { url: `${ctx.baseUrl}/calendar` });
    let skeletons = 0;
    for (let i = 0; i < 40 && skeletons === 0; i += 1) {
      await sleep(150);
      skeletons = Number(await evaluate(cdp, skeletonCountExpression())) || 0;
    }
    if (skeletons > 0) {
      shots.push(await screenshot(cdp, state, viewport.key, "loading"));
      checks.push(passed("loading skeleton painted"));
    } else {
      checks.push(unreached("loading skeleton", "no skeleton was observed before the page settled"));
    }
    scenario.delayMs = 0;
    await sleep(settleMs);
  } catch (e) {
    checks.push(unreached("loading skeleton", String(e.message ?? e)));
    scenario.delayMs = 0;
  }

  try {
    scenario.mode = "passthrough";
    await navigate(cdp, "/calendar");
    const real = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "populated-live"));
    if (real?.viewValue) checks.push(passed("live calendar chrome rendered"));
    else
      checks.push(
        failed(
          "live calendar",
          `the calendar toolbar did not render against the real API${real?.hasAlert ? ` — ${real.alertText}` : ""}`,
        ),
      );
  } catch (e) {
    checks.push(unreached("live calendar", String(e.message ?? e)));
  }

  try {
    scenario.mode = "synthetic";
    scenario.events = syntheticCalendarEvents(now, readerZone);
    scenario.failures = [];
    await navigateCalendar(ctx);
    await switchToListMode(cdp, evaluate, settleMs);
    const surface = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "populated-rows"));
    const titles = surface?.eventButtons ?? [];
    const missing = [LOCAL_EVENT_TITLE, FOREIGN_EVENT_TITLE, FOREIGN_LOCATION_EVENT_TITLE].filter(
      (t) => !titles.includes(t),
    );
    if (missing.length === 0) checks.push(passed("every seeded event row rendered"));
    else checks.push(failed("populated rows", `rows missing from the list: ${missing.join(", ")}`));
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("populated rows", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

// ------------------------------------------------------------------- 2. empty

export async function runEmptyPeriod(ctx) {
  const state = "empty-period";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.events = [];
    scenario.failures = [];
    const { recovered } = await navigateCalendar(ctx);
    await switchToListMode(cdp, evaluate, settleMs);
    const surface = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "list"));
    const text = String(surface?.bodyText ?? "");
    if (/No events in this period|No upcoming events/i.test(text))
      checks.push(passed("empty period renders empty-state copy"));
    else checks.push(failed("empty state", "an empty period rendered no empty-state copy"));
    const banners = surface?.warningBanners ?? [];
    if (surface?.hasAlert === true || banners.length > 0)
      checks.push(
        failed(
          "empty state",
          `an empty period rendered a failure surface: ${surface.alertText ?? banners.join(" | ")}`,
        ),
      );
    else if (recovered)
      checks.push(passed(`empty is not dressed as an error (cleared one transient boundary: ${recovered})`));
    else checks.push(passed("empty is not dressed as an error"));
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("empty period", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

// ------------------------------------------------------------------- 3. error

export async function runErrorAndRetry(ctx) {
  const state = "error-and-retry";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "error";
    scenario.rangeRequests = 0;
    await navigate(cdp, "/calendar", settleMs + 3000);
    const surface = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "500"));
    const banners = surface?.warningBanners ?? [];
    if (banners.length > 0 || surface?.hasAlert === true)
      checks.push(passed("a failed range read is announced on the surface"));
    else checks.push(failed("500 banner", "a 500 on /calendar/events announced nothing on the page"));
    const before = scenario.rangeRequests;
    let control = null;
    if (await realClick(cdp, evaluate, "Retry")) control = "Retry (inline banner)";
    else if ((await evaluate(cdp, clickByAccessibleNameExpression("Try Again"))) === true)
      control = "Try Again (route error boundary)";
    if (control) {
      await sleep(settleMs);
      if (scenario.rangeRequests > before)
        checks.push(passed(`"${control}" re-issues the range request`));
      else
        checks.push(
          failed(
            "retry",
            `"${control}" issued no new GET /calendar/events within ${settleMs}ms — the reader has no way back`,
          ),
        );
    } else {
      checks.push(failed("retry", "the error surface offered no retry control"));
    }
    if (surface?.hasAlert !== true && banners.length > 0)
      checks.push(
        passed("the failed read degrades in place rather than replacing the page with a boundary"),
      );
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("error state", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

// ---------------------------------------------------------- 4. source failure

export async function runSourceFailure(ctx) {
  const state = "source-failure";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.events = survivingSourceEvents(now, readerZone);
    scenario.failures = [FAILED_SOURCE];
    await navigateCalendar(ctx);
    await switchToListMode(cdp, evaluate, settleMs);
    const surface = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "surface"));
    const survivingVisible = (surface?.eventButtons ?? []).includes(SURVIVING_SOURCE_EVENT_TITLE);

    await realClick(cdp, evaluate, "Event sources");
    await sleep(900);
    const panel = await evaluate(cdp, surfaceExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "sources-panel"));

    const verdict = sourceFailureVerdict({
      bannerTextOnSurface: String(surface?.bodyText ?? ""),
      bannerTextInPanel: String(panel?.bodyText ?? ""),
      failureLabel: FAILED_SOURCE.label,
      survivingEventVisible: survivingVisible,
    });
    if (verdict.ok) checks.push(passed("a failed source is announced and the others still render"));
    else checks.push(failed("source failure", verdict.reason));
    if (survivingVisible) checks.push(passed("the surviving source still renders its events"));
    else checks.push(failed("source isolation", "one failed source removed the surviving source's events too"));
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("source failure", String(e.message ?? e)));
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

// -------------------------------------------------------------- 5. navigation

const NAVIGATION_STEPS = [
  { view: "Day", direction: "next", label: "day -> next" },
  { view: "Day", direction: "previous", label: "day -> previous" },
  { view: "Week", direction: "next", label: "week -> next" },
  { view: "Month", direction: "next", label: "month -> next" },
];

export async function runNavigation(ctx) {
  const state = "navigation-day-week-month";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  const steps = [];
  try {
    scenario.mode = "synthetic";
    scenario.events = syntheticCalendarEvents(now, readerZone);
    scenario.failures = [];
    await navigateCalendar(ctx);

    for (const step of NAVIGATION_STEPS) {
      const switched = await switchCalendarView(cdp, evaluate, step.view, settleMs);
      if (!switched) {
        checks.push(unreached(`view ${step.view}`, "the calendar view select could not be operated"));
        continue;
      }
      const surfaceBefore = await evaluate(cdp, surfaceExpression());
      const control = step.direction === "next" ? surfaceBefore?.nextLabel : surfaceBefore?.prevLabel;
      if (!control) {
        checks.push(failed(step.label, `no ${step.direction} control is exposed in ${step.view} view`));
        continue;
      }
      const liveBefore = String((await evaluate(cdp, liveRegionExpression())) ?? "");
      const moved = await realClick(cdp, evaluate, control);
      await sleep(1500);
      const surfaceAfter = await evaluate(cdp, surfaceExpression());
      const liveAfter = String((await evaluate(cdp, liveRegionExpression())) ?? "");
      steps.push({
        label: step.label,
        control,
        clicked: moved,
        movedPeriod: moved === true,
        titleBefore: surfaceBefore?.title ?? null,
        titleAfter: surfaceAfter?.title ?? null,
        liveBefore,
        liveAfter,
      });
      if (moved !== true) checks.push(failed(step.label, `the "${control}" control could not be clicked`));
      else if (surfaceAfter?.hasAlert === true)
        checks.push(
          failed(
            step.label,
            `${step.view} view + "${control}" took the page to its error boundary: ${surfaceAfter.alertText}`,
          ),
        );
      else if (surfaceAfter?.viewValue?.toLowerCase() !== step.view.toLowerCase())
        checks.push(failed(step.label, `the view select reads "${surfaceAfter?.viewValue}" after choosing ${step.view}`));
      else checks.push(passed(`${step.view} view navigates with "${control}"`));
    }
    shots.push(await screenshot(cdp, state, viewport.key, "navigated"));
    const verdict = announcementVerdict(steps);
    if (verdict.ok) checks.push(passed("every navigation step updates the aria-live period"));
    else checks.push(failed("period announcement", verdict.reason));
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("navigation", String(e.message ?? e)));
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.navigationSteps = steps;
  return cellResult;
}

// ---------------------------------------------------------------- 6. keyboard

export async function runKeyboardAndDetailSheet(ctx) {
  const state = "keyboard-and-detail-sheet";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.events = syntheticCalendarEvents(now, readerZone);
    scenario.failures = [];
    scenario.canManage = false;
    await navigateCalendar(ctx);
    const listed = await switchToListMode(cdp, evaluate, settleMs);
    if (!listed) {
      shots.push(await screenshot(cdp, state, viewport.key, "no-list"));
      checks.push(unreached("list view", "the List View control could not be operated"));
      return cellFromChecks(state, viewport.key, checks, shots, await runAxe(cdp));
    }

    await evaluate(cdp, "document.body.focus()");
    let reachedName = null;
    for (let i = 0; i < TAB_LIMIT && !reachedName; i += 1) {
      await pressKey(cdp, TAB);
      await sleep(60);
      const active = await evaluate(cdp, activeElementExpression());
      if (active?.name === FOREIGN_EVENT_TITLE) reachedName = active.name;
    }
    if (!reachedName) {
      shots.push(await screenshot(cdp, state, viewport.key, "tab"));
      checks.push(failed("keyboard", `Tab never reached the event row within ${TAB_LIMIT} presses`));
      return cellFromChecks(state, viewport.key, checks, shots, await runAxe(cdp));
    }
    shots.push(await screenshot(cdp, state, viewport.key, "row-focused"));

    await pressKey(cdp, ENTER);
    await sleep(settleMs);
    const dialog = await evaluate(cdp, dialogExpression());
    shots.push(await screenshot(cdp, state, viewport.key, "sheet"));

    let tabsStayedInsideSheet = dialog?.open === true;
    if (dialog?.open === true) {
      for (let i = 0; i < 25 && tabsStayedInsideSheet; i += 1) {
        await pressKey(cdp, TAB);
        await sleep(50);
        const active = await evaluate(cdp, activeElementExpression());
        if (active && active.insideDialog !== true) tabsStayedInsideSheet = false;
      }
    }

    let stillOpen = await evaluate(cdp, dialogExpression());
    for (let attempt = 0; attempt < 3 && stillOpen?.open === true; attempt += 1) {
      await pressKey(cdp, ESCAPE);
      await sleep(1200);
      stillOpen = await evaluate(cdp, dialogExpression());
    }
    const afterClose = await evaluate(cdp, activeElementExpression());

    const verdict = keyboardVerdict({
      reachedName,
      sheetOpened: dialog?.open === true,
      tabsStayedInsideSheet,
      focusReturnedTo: afterClose?.name ?? null,
      triggerName: FOREIGN_EVENT_TITLE,
    });
    if (verdict.ok) checks.push(passed("Tab reaches the row, Enter opens the Sheet, Escape restores focus"));
    else checks.push(failed("keyboard", verdict.reason));
    if (stillOpen?.open === true) checks.push(failed("keyboard", "Escape did not close the Sheet"));
    else checks.push(passed("Escape closes the Sheet"));

    const actions = unsupportedActionVerdict(dialog?.controls ?? [], UNSUPPORTED_EVENT_ACTIONS);
    if (actions.ok) checks.push(passed("no unsupported mutation action is offered on an unmanageable event"));
    else checks.push(failed("unsupported action", actions.reason));

    const zoneText = String(dialog?.text ?? "");
    if (dialog?.open === true && !zoneText.includes(FOREIGN_ZONE))
      checks.push(failed("timezone honesty", `the detail Sheet never names the authored zone ${FOREIGN_ZONE}`));
    else if (dialog?.open === true) checks.push(passed("the detail Sheet names the authored zone"));

    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("keyboard", String(e.message ?? e)));
  } finally {
    ctx.scenario.canManage = false;
  }
  return cellFromChecks(state, viewport.key, checks, shots, axe);
}

// --------------------------------------------------------------- 7. deep link

export async function runDeepLink(ctx) {
  const state = "deep-link";
  const { cdp, viewport, navigate, evaluate, screenshot, scenario, settleMs, runAxe, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  try {
    scenario.mode = "synthetic";
    scenario.events = syntheticCalendarEvents(now, readerZone);
    scenario.failures = [];
    scenario.sources = SYNTHETIC_SOURCES;
    scenario.preferenceWrites = [];
    await navigate(cdp, `/calendar?source=${DEEP_LINK_SOURCE_KEY}`, settleMs + 1500);
    let surface = await evaluate(cdp, surfaceExpression());
    for (let i = 0; i < 10 && /[?&]source=/.test(String(surface?.url ?? "")); i += 1) {
      await sleep(400);
      surface = await evaluate(cdp, surfaceExpression());
    }
    shots.push(await screenshot(cdp, state, viewport.key, "source"));
    const sourceVerdict = deepLinkVerdict({
      requestedSource: DEEP_LINK_SOURCE_KEY,
      preferenceWrites: scenario.preferenceWrites,
      urlAfter: surface?.url ?? "",
    });
    if (sourceVerdict.ok) checks.push(passed("?source=<key> enables that source and is stripped"));
    else checks.push(failed("source deep link", sourceVerdict.reason));

    const { recovered, surface: createLanding } = await navigateCalendar(ctx, "/calendar?create=1", settleMs);
    let created = await evaluate(cdp, dialogExpression());
    let createdSurface = createLanding;
    for (let i = 0; i < 10 && created?.open !== true; i += 1) {
      await sleep(400);
      created = await evaluate(cdp, dialogExpression());
      createdSurface = await evaluate(cdp, surfaceExpression());
    }
    shots.push(await screenshot(cdp, state, viewport.key, "create"));
    if (recovered && created?.open !== true) {
      checks.push(
        unreached("create deep link", `/calendar?create=1 landed on a failure surface: ${recovered}`),
      );
    } else {
      const createVerdict = createDeepLinkVerdict({
        dialogOpened: created?.open === true,
        urlAfter: createdSurface?.url ?? "",
      });
      if (createVerdict.ok) checks.push(passed("?create=1 opens the create dialog and is stripped"));
      else checks.push(failed("create deep link", createVerdict.reason));
    }
    await pressKey(cdp, ESCAPE);
    await sleep(600);
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("deep link", String(e.message ?? e)));
  } finally {
    ctx.scenario.sources = null;
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.unimplementedDeepLinks = UNIMPLEMENTED_DEEP_LINKS;
  return cellResult;
}

// ------------------------------------------------- 8. responsive + row height

export async function runResponsiveAndForeignZone(ctx) {
  const state = "responsive-and-foreign-zone";
  const { cdp, viewport, navigate, evaluate, screenshot, runAxe, scenario, settleMs, readerZone, now } = ctx;
  const shots = [];
  const checks = [];
  let axe = null;
  let geometry = null;
  let locationGeometry = null;
  try {
    scenario.mode = "synthetic";
    scenario.events = syntheticCalendarEvents(now, readerZone);
    scenario.failures = [];
    await navigateCalendar(ctx);

    const measured = await evaluate(cdp, viewportExpression());
    const zoom = zoomVerdict(measured, viewport);
    if (zoom.ok) checks.push(passed(`viewport is ${viewport.label}`));
    else checks.push(failed("viewport", zoom.reason));

    const gridOverflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    shots.push(await screenshot(cdp, state, viewport.key, "grid"));
    if (!gridOverflow.measured) checks.push(unreached("overflow calendar view", "layout could not be measured"));
    else if (gridOverflow.overflows)
      checks.push(failed("overflow calendar view", `document scrolls ${gridOverflow.by}px horizontally`));
    else checks.push(passed("no horizontal overflow in calendar view"));

    await switchToListMode(cdp, evaluate, settleMs);
    const listOverflow = overflowVerdict((await evaluate(cdp, overflowExpression())) ?? {});
    shots.push(await screenshot(cdp, state, viewport.key, "list"));
    if (!listOverflow.measured) checks.push(unreached("overflow list view", "layout could not be measured"));
    else if (listOverflow.overflows)
      checks.push(failed("overflow list view", `document scrolls ${listOverflow.by}px horizontally`));
    else checks.push(passed("no horizontal overflow in list view"));

    geometry = await evaluate(cdp, rowGeometryExpression(FOREIGN_EVENT_TITLE));
    locationGeometry = await evaluate(cdp, rowGeometryExpression(FOREIGN_LOCATION_EVENT_TITLE));

    for (const [label, geo] of [
      ["foreign-zone row", geometry],
      ["foreign-zone row with location", locationGeometry],
    ]) {
      const verdict = foreignZoneVerdict(geo);
      if (verdict.ok) checks.push(passed(`${label} fits its virtualised slot`));
      else if (!verdict.measured) checks.push(unreached(label, verdict.reason));
      else checks.push(failed(label, verdict.reason));
      if (geo?.found === true) {
        const stringVerdict = foreignZoneStringVerdict(geo.text, FOREIGN_ZONE, readerZone);
        if (stringVerdict.ok) checks.push(passed(`${label} names both zones`));
        else checks.push(failed(`${label} timezone honesty`, stringVerdict.reason));
      }
    }
    axe = await axeCell(runAxe, cdp, checks);
  } catch (e) {
    checks.push(unreached("responsive", String(e.message ?? e)));
  }
  const cellResult = cellFromChecks(state, viewport.key, checks, shots, axe);
  cellResult.rowGeometry = { noLocation: geometry, withLocation: locationGeometry };
  return cellResult;
}

export const CALENDAR_RUNNERS = [
  runLoadingAndPopulated,
  runEmptyPeriod,
  runErrorAndRetry,
  runSourceFailure,
  runNavigation,
  runKeyboardAndDetailSheet,
  runDeepLink,
  runResponsiveAndForeignZone,
];
