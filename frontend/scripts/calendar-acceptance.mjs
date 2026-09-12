#!/usr/bin/env node
/**
 * Browser acceptance matrix for `/calendar` (recovery-calendar CA6, gate 8).
 *
 * Runs the eight calendar acceptance states at 360 / 768 / 1280 px and at
 * 1280 px with 200% browser zoom, capturing a screenshot and an axe pass per
 * cell. It reuses `lib/cdp.mjs`, `lib/axe.mjs` and `lib/acceptance-matrix.mjs`
 * unchanged, so the honesty rules are the same ones `build-acceptance.mjs`
 * obeys: a cell with no screenshot is NOT-RUN, a cell axe never judged is
 * NOT-RUN, and a matrix that did not run every planned cell exits non-zero
 * even when every cell it produced passed.
 *
 * The application is shared. Nothing here writes to it: every state that needs
 * data it cannot otherwise reach is produced by pausing the real calendar read
 * with `Fetch.requestPaused` and fulfilling it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findBrowser } from "./lib/chrome-launcher.mjs";
import { sleep, waitForDevTools, cdpSession, launchChrome, firstPageTarget } from "./lib/cdp.mjs";
import { axeSourcePath, axeExpression, axeVerdict } from "./lib/axe.mjs";
import {
  PASS,
  FAIL,
  NOT_RUN,
  isSignInUrl,
  screenshotName,
  cellFromChecks,
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
  corsHeaders,
  envelope,
  proxyBakedApiRequest,
  zoomVerdict,
} from "./lib/acceptance-browser.mjs";
import {
  CALENDAR_STATES,
  DEEP_LINK_SOURCE_KEY,
  FOREIGN_EVENT_NUMERIC_ID,
  FOREIGN_ZONE,
  SYNTHETIC_SOURCES,
  UNIMPLEMENTED_DEEP_LINKS,
  announcementVerdict,
  calendarAxeContextExpression,
  classifyCalendarRequest,
  createDeepLinkVerdict,
  deepLinkVerdict,
  foreignEventDetail,
  foreignZoneStringVerdict,
  foreignZoneVerdict,
  keyboardVerdict,
  readerZoneExpression,
  sourceFailureVerdict,
  surfaceExpression,
  syntheticCalendarEvents,
  unsupportedActionVerdict,
} from "./lib/calendar-acceptance-probes.mjs";
import { CALENDAR_RUNNERS, FAILED_SOURCE, UNSUPPORTED_EVENT_ACTIONS } from "./lib/calendar-acceptance-states.mjs";

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

function runSelfTest() {
  const failures = [];
  let passedCount = 0;
  const assert = (label, condition) => {
    if (condition) passedCount++;
    else failures.push(label);
  };

  assert("the matrix plans 8 states", CALENDAR_STATES.length === 8);
  assert("the matrix plans 4 viewports", ACCEPTANCE_VIEWPORTS.length === 4);
  assert("planned count multiplies", plannedCellCount(CALENDAR_STATES, ACCEPTANCE_VIEWPORTS) === 32);
  assert(
    "the zoom column halves the CSS width and doubles the pixel ratio",
    ACCEPTANCE_VIEWPORTS[3].cssWidth === 640 && ACCEPTANCE_VIEWPORTS[3].deviceScaleFactor === 2,
  );

  assert("a range read is classified", classifyCalendarRequest("http://h/calendar/events?start=a") === "events-range");
  assert("a detail read is classified", classifyCalendarRequest("http://h/calendar/events/12") === "event-detail");
  assert("an attendee read is classified", classifyCalendarRequest("http://h/calendar/events/12/rsvp") === "attendees");
  assert("a sync read is classified", classifyCalendarRequest("http://h/calendar/events/12/sync-status") === "sync-status");
  assert("external events are classified", classifyCalendarRequest("http://h/calendar/external-events?x=1") === "external-events");
  assert("the source list is classified", classifyCalendarRequest("http://h/calendar/sources") === "sources");
  assert("a source write is classified", classifyCalendarRequest("http://h/calendar/sources/leaves") === "source-preference");
  assert("an unrelated read is not claimed", classifyCalendarRequest("http://h/build/all") === null);

  assert("the envelope is what api-client unwraps", JSON.parse(envelope({ a: 1 })).data.a === 1);
  assert("fulfilled responses carry the caller's origin", corsHeaders("http://o").some((h) => h.value === "http://o"));

  const events = syntheticCalendarEvents(new Date("2026-09-12T00:00:00Z"), "Asia/Calcutta");
  assert("the fixture seeds three rows", events.length === 3);
  assert("ids parse as calendar event ids", events.every((e) => /^event-\d+$/.test(e.id)));
  assert("one row is authored in a foreign zone with a location", events.some((e) => e.timezone === FOREIGN_ZONE && e.location));
  assert("the detail fixture matches the foreign row", foreignEventDetail(new Date(), false).id === FOREIGN_EVENT_NUMERIC_ID);

  assert(
    "a viewport that did not reflow fails the zoom check",
    zoomVerdict({ innerWidth: 1280, devicePixelRatio: 2 }, ACCEPTANCE_VIEWPORTS[3]).ok === false,
  );
  assert(
    "a reflowed 200% viewport passes",
    zoomVerdict({ innerWidth: 640, devicePixelRatio: 2 }, ACCEPTANCE_VIEWPORTS[3]).ok === true,
  );
  assert("an unmeasured viewport is not a pass", zoomVerdict(null, ACCEPTANCE_VIEWPORTS[0]).ok === false);

  const fits = { found: true, slotHeight: 92, slotPaddingBottom: 8, buttonHeight: 78, textClientHeight: 32, textScrollHeight: 32 };
  assert("a card inside its slot passes", foreignZoneVerdict(fits).ok === true);
  assert(
    "a card taller than its slot fails with the overrun",
    foreignZoneVerdict({ ...fits, buttonHeight: 96 }).reason.includes("overruns the next row by 12px"),
  );
  assert(
    "a clipped two-line clamp fails even when the card fits",
    foreignZoneVerdict({ ...fits, textScrollHeight: 48 }).ok === false,
  );
  assert("an absent row is unmeasured, not clean", foreignZoneVerdict({ found: false }).measured === false);

  assert(
    "a string naming only the authored zone fails",
    foreignZoneStringVerdict("9:00 am · America/New_York", "America/New_York", "Asia/Calcutta").ok === false,
  );
  assert(
    "a string naming both zones passes",
    foreignZoneStringVerdict(
      "12 Sep 2026, 9:00 am – 10:00 am · America/New_York (6:30 pm Asia/Calcutta)",
      "America/New_York",
      "Asia/Calcutta",
    ).ok === true,
  );

  assert(
    "a failure nobody announced fails",
    sourceFailureVerdict({ bannerTextOnSurface: "", bannerTextInPanel: "", failureLabel: "Leave", survivingEventVisible: true }).ok === false,
  );
  assert(
    "a failure that took the other sources with it fails",
    sourceFailureVerdict({ bannerTextOnSurface: "… Leave", bannerTextInPanel: "… Leave", failureLabel: "Leave", survivingEventVisible: false }).ok === false,
  );
  assert(
    "a failure only visible inside the sources popover is not discoverable",
    sourceFailureVerdict({ bannerTextOnSurface: "", bannerTextInPanel: "Some events could not be loaded: Leave", failureLabel: "Leave", survivingEventVisible: true })
      .discoverable === false,
  );
  assert(
    "a failure announced on the surface passes",
    sourceFailureVerdict({ bannerTextOnSurface: "Some events could not be loaded: Leave", bannerTextInPanel: "Leave", failureLabel: "Leave", survivingEventVisible: true }).ok === true,
  );

  assert(
    "a move that did not change the live region fails",
    announcementVerdict([{ label: "week → next", movedPeriod: true, liveBefore: "Showing September 2026", liveAfter: "Showing September 2026" }]).ok === false,
  );
  assert(
    "a move that changed the live region passes",
    announcementVerdict([{ label: "month → next", movedPeriod: true, liveBefore: "Showing September 2026", liveAfter: "Showing October 2026" }]).ok === true,
  );
  assert("no navigation at all is not a pass", announcementVerdict([]).ok === false);

  assert("keyboard fails when Tab never lands", keyboardVerdict({ reachedName: null }).ok === false);
  assert(
    "keyboard fails when Enter opened nothing",
    keyboardVerdict({ reachedName: "x", sheetOpened: false }).ok === false,
  );
  assert(
    "keyboard fails when Tab escapes the Sheet",
    keyboardVerdict({ reachedName: "x", sheetOpened: true, tabsStayedInsideSheet: false }).ok === false,
  );
  assert(
    "keyboard fails when focus does not return to the row",
    keyboardVerdict({ reachedName: "x", sheetOpened: true, tabsStayedInsideSheet: true, focusReturnedTo: "Today", triggerName: "x" }).ok === false,
  );
  assert(
    "keyboard passes on reach, open, trap and restore",
    keyboardVerdict({ reachedName: "x", sheetOpened: true, tabsStayedInsideSheet: true, focusReturnedTo: "x", triggerName: "x" }).ok === true,
  );

  assert(
    "an unmanageable event still offering Delete fails",
    unsupportedActionVerdict(["Close", "Delete"], UNSUPPORTED_EVENT_ACTIONS).ok === false,
  );
  assert(
    "an unmanageable event offering only reads passes",
    unsupportedActionVerdict(["Close", "Download .ics"], UNSUPPORTED_EVENT_ACTIONS).ok === true,
  );

  assert(
    "a source deep link that wrote nothing fails",
    deepLinkVerdict({ requestedSource: "leaves", preferenceWrites: [], urlAfter: "http://h/calendar" }).ok === false,
  );
  assert(
    "a source param left in the URL fails",
    deepLinkVerdict({ requestedSource: "leaves", preferenceWrites: [{ sourceKey: "leaves", enabled: true }], urlAfter: "http://h/calendar?source=leaves" }).ok === false,
  );
  assert(
    "a consumed and stripped source deep link passes",
    deepLinkVerdict({ requestedSource: "leaves", preferenceWrites: [{ sourceKey: "leaves", enabled: true }], urlAfter: "http://h/calendar" }).ok === true,
  );
  assert(
    "a create deep link that opened nothing fails",
    createDeepLinkVerdict({ dialogOpened: false, urlAfter: "http://h/calendar" }).ok === false,
  );
  assert(
    "a create param left in the URL fails",
    createDeepLinkVerdict({ dialogOpened: true, urlAfter: "http://h/calendar?create=1" }).ok === false,
  );
  assert(
    "a consumed and stripped create deep link passes",
    createDeepLinkVerdict({ dialogOpened: true, urlAfter: "http://h/calendar" }).ok === true,
  );
  assert(
    "view and date are recorded as unimplemented rather than asserted",
    UNIMPLEMENTED_DEEP_LINKS.join(",") === "view,date",
  );

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

  const allPass = new Array(32).fill(null).map(() => ({ verdict: PASS }));
  assert("a complete all-pass matrix exits 0", matrixExitCode(allPass, 32) === 0);
  assert("one NOT-RUN exits 1", matrixExitCode(allPass.slice(0, 31).concat([{ verdict: NOT_RUN }]), 32) === 1);
  assert("a partial matrix exits 1 even if every cell it has passed", matrixExitCode(allPass.slice(0, 9), 32) === 1);
  assert("a short matrix is incomplete", matrixIncomplete(allPass.slice(0, 9), 32) === true);

  const table = renderMarkdownTable(
    [{ state: "empty-period", width: "360", verdict: PASS, screenshots: ["a.png"] }],
    ACCEPTANCE_VIEWPORTS.map((v) => v.key),
    CALENDAR_STATES,
    viewportLabel,
  );
  assert("the table has a row per state", table.split("\n").length === 2 + CALENDAR_STATES.length);
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
  console.log(`calendar-acceptance self-tests: ${passedCount} passed`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

function buildScenario() {
  return {
    mode: "passthrough",
    delayMs: 0,
    events: [],
    failures: [],
    truncated: false,
    canManage: false,
    sources: null,
    rangeRequests: 0,
    preferenceWrites: [],
    fulfilled: 0,
    continued: 0,
    proxied: 0,
    proxyFailures: [],
  };
}

async function handlePausedRequest(cdp, params, scenario, origin, now, apiOrigin, bakedOrigin) {
  const { requestId } = params;
  const url = String(params.request?.url ?? "");
  const method = String(params.request?.method ?? "GET").toUpperCase();
  const kind = classifyCalendarRequest(url);
  const isBaked = bakedOrigin !== "" && url.startsWith(bakedOrigin);

  if (isBaked && method === "OPTIONS") {
    scenario.fulfilled += 1;
    return cdp
      .send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 204,
        responseHeaders: [
          { name: "access-control-allow-origin", value: origin },
          { name: "access-control-allow-credentials", value: "true" },
          { name: "access-control-allow-methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          {
            name: "access-control-allow-headers",
            value: "authorization,content-type,x-org-id,idempotency-key,x-correlation-id",
          },
          { name: "access-control-max-age", value: "600" },
        ],
      })
      .catch(() => {});
  }
  const fulfil = async (body, responseCode = 200) => {
    scenario.fulfilled += 1;
    await cdp
      .send("Fetch.fulfillRequest", {
        requestId,
        responseCode,
        responseHeaders: corsHeaders(origin),
        body: Buffer.from(body).toString("base64"),
      })
      .catch(() => {});
  };
  const passThrough = async () => {
    if (isBaked) return proxyBakedApiRequest(cdp, params, origin, apiOrigin, scenario);
    scenario.continued += 1;
    await cdp.send("Fetch.continueRequest", { requestId }).catch(() => {});
  };

  if (method === "OPTIONS" || kind === null) return passThrough();

  if (kind === "source-preference" && method === "PUT") {
    const sourceKey = url.split("?")[0].split("/").pop();
    let enabled = null;
    try {
      const body = JSON.parse(String(params.request?.postData ?? "{}"));
      enabled = body.enabled;
    } catch {
      enabled = null;
    }
    scenario.preferenceWrites.push({ sourceKey, enabled });
    return fulfil(envelope({ sourceKey, enabled: enabled === true }));
  }

  if (kind === "sources") {
    if (scenario.sources) return fulfil(envelope(scenario.sources));
    if (scenario.mode === "synthetic" || scenario.mode === "error")
      return fulfil(envelope(SYNTHETIC_SOURCES));
    return passThrough();
  }

  if (kind === "connections") {
    if (scenario.mode === "synthetic" || scenario.mode === "error") return fulfil(envelope([]));
    return passThrough();
  }

  if (kind === "events-range") {
    scenario.rangeRequests += 1;
    if (scenario.mode === "passthrough") return passThrough();
    if (scenario.mode === "delay") {
      await sleep(scenario.delayMs);
      return passThrough();
    }
    if (scenario.mode === "error")
      return fulfil(JSON.stringify({ message: "Internal Server Error" }), 500);
    return fulfil(
      envelope({ events: scenario.events, failures: scenario.failures, truncated: scenario.truncated }),
    );
  }

  if (scenario.mode === "passthrough" || scenario.mode === "delay") return passThrough();

  if (kind === "external-events") return fulfil(envelope({ events: [], errors: [] }));
  if (kind === "event-detail") return fulfil(envelope(foreignEventDetail(now, scenario.canManage)));
  if (kind === "attendees") return fulfil(envelope([]));
  if (kind === "sync-status")
    return fulfil(
      envelope({
        status: "not_synced",
        attemptCount: 0,
        lastError: null,
        operation: null,
        queuedAt: null,
        processedAt: null,
        retryable: false,
      }),
    );
  return passThrough();
}

async function main() {
  const baseUrl = flag("base-url", "http://127.0.0.1:1000").replace(/\/$/, "");
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const settleMs = Number(flag("settle-ms", "3500"));
  const browserPath = findBrowser(flag("browser", ""));
  const shotDir = flag(
    "screenshot-dir",
    process.env.CALENDAR_ACCEPTANCE_DIR || join(tmpdir(), "calendar-acceptance"),
  );
  const outPath = flag("out", join(shotDir, "calendar-acceptance-results.json"));
  const apiOrigin = flag("api-origin", "http://127.0.0.1:1500").replace(/\/$/, "");
  const bakedOrigin = flag("baked-api-origin", "https://api.streamlineos.in").replace(/\/$/, "");
  const onlyViewports = flag("viewports", "");
  const viewports = selectViewports(onlyViewports);

  if (!browserPath) throw new Error("no Chrome/Chromium found — pass --browser=<path>");
  if (viewports.length === 0) throw new Error(`--viewports matched none of ${ACCEPTANCE_VIEWPORTS.map((v) => v.key).join(",")}`);
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file is required: /calendar is an authenticated surface");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  if (!cookieValue) throw new Error("cookie file is empty");
  mkdirSync(shotDir, { recursive: true });

  const axeSource = readFileSync(axeSourcePath(), "utf8");
  const origin = new URL(baseUrl).origin;
  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);

  const { proc, debugPort } = launchChrome(browserPath);
  const cells = [];
  const planned = plannedCellCount(CALENDAR_STATES, viewports);
  const scenario = buildScenario();
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
      void handlePausedRequest(cdp, params, scenario, origin, now, apiOrigin, bakedOrigin);
    });
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*/calendar/*" },
        { urlPattern: "*/integrations/connections*" },
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
      axeVerdict(
        await evaluate(session, axeExpression(undefined, undefined, calendarAxeContextExpression()), true),
      );
    const runShellAxe = async (session) => axeVerdict(await evaluate(session, axeExpression(), true));

    await setViewport(cdp, ACCEPTANCE_VIEWPORTS[2]);
    await navigate(cdp, "/calendar");
    // A dead server, a stale build with a missing webpack runtime and a signed-out
    // session all render *something*. Refusing to start unless the calendar's own
    // chrome is on screen keeps the matrix from filling up with FAIL cells that
    // describe the environment rather than the product.
    // Two preflights, because they answer different questions. The first asks
    // whether the LIVE calendar renders for this session at all; if it does not,
    // that is a finding about the product and is recorded, not swallowed. The
    // second asks whether the surface renders at all under interception — if
    // even that fails the environment is broken and a matrix would describe the
    // environment rather than the calendar, so the run refuses to start.
    const pollSurface = async (attempts) => {
      let seen = await evaluate(cdp, surfaceExpression());
      for (let i = 0; i < attempts && !seen?.viewValue; i += 1) {
        await sleep(1000);
        seen = await evaluate(cdp, surfaceExpression());
      }
      return seen;
    };
    const live = await pollSurface(25);
    const livePreflight = {
      rendered: Boolean(live?.viewValue),
      screenshot: await screenshot(cdp, "preflight", "live", null),
      bodyExcerpt: String(live?.bodyText ?? "").slice(0, 400),
      mainExcerpt: String(
        (await evaluate(
          cdp,
          `(() => { const m = document.querySelector("main"); return m ? m.innerText.replace(/\\s+/g," ").slice(0,400) : "no <main>"; })()`,
        )) ?? "",
      ),
    };
    if (!livePreflight.rendered)
      console.error(
        `!  the LIVE calendar did not render for this session — main says: ${livePreflight.mainExcerpt}`,
      );

    scenario.mode = "synthetic";
    scenario.events = [];
    scenario.failures = [];
    await navigate(cdp, "/calendar");
    const intercepted = await pollSurface(20);
    scenario.mode = "passthrough";
    if (!intercepted?.viewValue) {
      await screenshot(cdp, "preflight", "intercepted", "failed");
      throw new Error(
        `preflight: ${baseUrl}/calendar did not render the calendar toolbar even with every calendar read intercepted — refusing to capture a matrix against a surface that is not the calendar (main: ${livePreflight.mainExcerpt})`,
      );
    }
    const readerZone = String((await evaluate(cdp, readerZoneExpression())) ?? "");
    log(`browser ${browserPath} · base ${baseUrl} · reader zone ${readerZone}`);
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
        readerZone,
        now,
      };
      for (const runner of CALENDAR_RUNNERS) {
        const cell = await runner(ctx);
        log(`${cell.state} → ${cell.verdict}${cell.reason ? ` (${cell.reason})` : ""}`);
        cells.push(cell);
        scenario.mode = "passthrough";
        scenario.sources = null;
      }
      shellAxe.push({ viewport: viewport.key, result: await runShellAxe(cdp) });
    }

    const table = renderMarkdownTable(cells, viewports.map((v) => v.key), CALENDAR_STATES, viewportLabel);
    const counts = summarise(cells);
    const results = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      readerZone,
      foreignZone: FOREIGN_ZONE,
      deepLinkSourceKey: DEEP_LINK_SOURCE_KEY,
      failedSource: FAILED_SOURCE,
      syntheticSources: SYNTHETIC_SOURCES,
      viewports,
      planned,
      counts,
      screenshotDir: shotDir,
      apiOrigin,
      bakedOrigin,
      livePreflight,
      pageErrors: pageErrors.slice(0, 30),
      interception: {
        fulfilled: scenario.fulfilled,
        continued: scenario.continued,
        proxiedToLocalBackend: scenario.proxied,
        proxyFailures: scenario.proxyFailures.slice(0, 20),
      },
      shellAxe,
      cells,
    };
    writeFileSync(outPath, JSON.stringify(results, null, 2));
    writeFileSync(join(shotDir, "calendar-acceptance-table.md"), `${table}\n`);
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
