#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findBrowser } from "./lib/chrome-launcher.mjs";
import {
  sleep,
  waitForDevTools,
  cdpSession,
  launchChrome,
  firstPageTarget,

} from "./lib/cdp.mjs";
import { axeSourcePath, axeExpression, axeVerdict } from "./lib/axe.mjs";
import {
  STATES,
  PASS,
  FAIL,
  NOT_RUN,
  parseWidths,
  isSignInUrl,
  screenshotName,
  overflowVerdict,

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

const THIRD_PARTY_EXCLUDED_CONTEXT = '{ exclude: [["#feedbucket-root"]] }';

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

import {
  substituteSubject,
  retryReissued,
  notFoundVerdict,
  keyboardVerdict,
  runLoadingAndEmpty,
  runErrorAndRetry,
  runCrossTab,
  runKeyboard,
  runResponsive,
} from "./lib/build-acceptance-states.mjs";
import { makeScreenshotter } from "./lib/screenshot.mjs";

function runSelfTest() {
  const failures = [];
  let passed_ = 0;
  const assert = (label, condition) => {
    if (condition) passed_++;
    else failures.push(label);
  };

  assert("widths parse", parseWidths("375,768,1280").join("/") === "375/768/1280");
  assert("widths tolerate spacing", parseWidths(" 375 , 768 ").length === 2);
  let threw = false;
  try {
    parseWidths("abc");
  } catch {
    threw = true;
  }
  assert("unparseable widths throw rather than silently measuring nothing", threw);

  assert("signin url is refused", isSignInUrl("http://x/signin?session=expired"));
  assert("sign-in hyphen variant is refused", isSignInUrl("http://x/sign-in"));
  assert("login is refused", isSignInUrl("http://x/login"));
  assert("a build route is not a sign-in", !isSignInUrl("http://x/build/12/backlog"));

  assert("screenshot name carries state and width", screenshotName("empty", 375, "") === "empty-375px.png");
  assert("screenshot variant is appended", screenshotName("err", 768, "404") === "err-768px-404.png");

  assert("overflow detected", overflowVerdict({ scrollWidth: 500, innerWidth: 375 }).overflows === true);
  assert("one pixel is tolerated", overflowVerdict({ scrollWidth: 376, innerWidth: 375 }).overflows === false);
  assert("no overflow", overflowVerdict({ scrollWidth: 375, innerWidth: 375 }).overflows === false);
  assert("unmeasured overflow is not a pass claim", overflowVerdict({}).measured === false);

  assert("retry re-issue detected", retryReissued(1, 2) === true);
  assert("no re-issue is not a pass", retryReissued(2, 2) === false);

  assert(
    "a 404 offering retry fails",
    notFoundVerdict({ hasRetry: true, retryLabel: "Try again", bodyText: "not found" }).ok === false,
  );
  assert(
    "a 404 without not-found text fails",
    notFoundVerdict({ hasRetry: false, bodyText: "some board" }).ok === false,
  );
  assert(
    "a clean 404 passes",
    notFoundVerdict({ hasRetry: false, bodyText: "Ticket not found" }).ok === true,
  );

  assert(
    "keyboard fails when Tab never lands",
    keyboardVerdict({ reachedName: null, pressedNames: [] }).ok === false,
  );
  assert(
    "keyboard fails when the name is not a risk cell",
    keyboardVerdict({ reachedName: "Save", pressedNames: ["x"] }).ok === false,
  );
  assert(
    "keyboard fails when Enter sets no pressed state",
    keyboardVerdict({
      reachedName: "low probability, high impact: 0 open risks",
      pressedNames: [],
    }).ok === false,
  );
  assert(
    "keyboard passes on a named cell with pressed state",
    keyboardVerdict({
      reachedName: "low probability, high impact: 0 open risks",
      pressedNames: ["low probability, high impact: 0 open risks"],
    }).ok === true,
  );

  const shots = ["a.png"];
  const okAxe = { ran: true, reason: null, nodesChecked: 10, violations: [] };
  assert(
    "a cell with no screenshot is NOT-RUN, never PASS",
    cellFromChecks("s", 375, [passed("x")], [], okAxe).verdict === NOT_RUN,
  );
  assert(
    "a cell where axe never ran is NOT-RUN, not clean",
    cellFromChecks("s", 375, [passed("x")], shots, { ran: false, reason: "axe-not-injected" }).verdict ===
      NOT_RUN,
  );
  assert(
    "a failing check fails the cell",
    cellFromChecks("s", 375, [failed("x", "bad")], shots, okAxe).verdict === FAIL,
  );
  assert(
    "an unreached check is NOT-RUN",
    cellFromChecks("s", 375, [unreached("x", "gone")], shots, okAxe).verdict === NOT_RUN,
  );
  assert(
    "a failure outranks an unreached check",
    cellFromChecks("s", 375, [unreached("a", "g"), failed("b", "bad")], shots, okAxe).verdict === FAIL,
  );
  assert(
    "all green passes",
    cellFromChecks("s", 375, [passed("a"), passed("b")], shots, okAxe).verdict === PASS,
  );

  assert("planned count multiplies", plannedCellCount(STATES, [375, 768, 1280]) === 15);
  assert("a short matrix is incomplete", matrixIncomplete([{}, {}], 15) === true);
  assert("a full matrix is complete", matrixIncomplete(new Array(15).fill({}), 15) === false);

  const allPass = new Array(15).fill(null).map(() => ({ verdict: PASS }));
  assert("a complete all-pass matrix exits 0", matrixExitCode(allPass, 15) === 0);
  const oneFail = allPass.slice(0, 14).concat([{ verdict: FAIL }]);
  assert("one failure exits 1", matrixExitCode(oneFail, 15) === 1);
  const oneNotRun = allPass.slice(0, 14).concat([{ verdict: NOT_RUN }]);
  assert("one NOT-RUN exits 1", matrixExitCode(oneNotRun, 15) === 1);
  assert("an incomplete matrix exits 1 even if every cell it has passed", matrixExitCode(allPass.slice(0, 5), 15) === 1);

  const counts = summarise([{ verdict: PASS }, { verdict: FAIL }, { verdict: NOT_RUN }]);
  assert("summary counts each verdict", counts.PASS === 1 && counts.FAIL === 1 && counts["NOT-RUN"] === 1);

  const table = renderMarkdownTable(
    [{ state: "loading-and-empty", width: 375, verdict: PASS, screenshots: ["a.png"] }],
    [375, 768],
  );
  assert("table has a row per state", table.split("\n").length === 2 + STATES.length);
  assert("table cites the screenshot", table.includes("[shot](a.png)"));
  assert("a missing cell renders NOT-RUN", table.includes(NOT_RUN));

  assert("subject substitution replaces every marker", substituteSubject("a{subject}b{subject}", "X") === "aXbX");

  if (failures.length) {
    for (const f of failures) console.error(`  [FAIL] ${f}`);
    console.error(`\nSELF-TEST FAILED — ${failures.length} of ${failures.length + passed_}`);
    process.exit(1);
  }
  console.log(`build-acceptance self-tests: ${passed_} passed`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

async function main() {
  const baseUrl = flag("base-url", "http://127.0.0.1:1000").replace(/\/$/, "");
  const widths = parseWidths(flag("widths", "375,768,1280"));
  const cookieFile = flag("cookie-file", "");
  const cookieName = flag("cookie-name", "authjs.session-token");
  const settleMs = Number(flag("settle-ms", "3500"));
  const browserPath = findBrowser(flag("browser", ""));
  const shotDir = flag(
    "screenshot-dir",
    process.env.BUILD_ACCEPTANCE_DIR || join(tmpdir(), "build-acceptance"),
  );
  const outPath = flag("out", join(shotDir, "build-acceptance-results.json"));
  const channelPrefix = "streamlineos:build-cache:authenticated:";

  if (!browserPath) throw new Error("no Chrome/Chromium found — pass --browser=<path>");
  if (!cookieFile || !existsSync(cookieFile))
    throw new Error("--cookie-file is required: these are authenticated surfaces");
  const cookieValue = readFileSync(cookieFile, "utf8").trim();
  if (!cookieValue) throw new Error("cookie file is empty");
  const axeSource = readFileSync(axeSourcePath(), "utf8");
  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);

  const { proc, debugPort } = launchChrome(browserPath);
  const cells = [];
  const planned = plannedCellCount(STATES, widths);

  try {
    await waitForDevTools(debugPort, 20000);
    const cdp = await cdpSession(await firstPageTarget(debugPort));
    const prepare = async (session) => {
      await session.send("Page.enable");
      await session.send("Runtime.enable");
      await session.send("Network.enable");
      await session.send("Network.setCookie", {
        name: cookieName,
        value: cookieValue,
        url: baseUrl,
        httpOnly: true,
        path: "/",
      });
      await session.send("Page.addScriptToEvaluateOnNewDocument", { source: axeSource });
    };
    await prepare(cdp);

    const evaluate = async (session, expression, awaitPromise = false) => {
      const r = await session.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise,
      });
      return r.result?.value;
    };
    const currentUrl = async (session) => evaluate(session, "location.href");
    const navigate = async (session, path, wait = settleMs) => {
      await session.send("Page.navigate", { url: `${baseUrl}${path}` });
      await sleep(wait);
      const url = await currentUrl(session);
      if (isSignInUrl(url))
        throw new Error(
          `navigating to ${path} landed on ${url} — an unauthenticated run proves nothing`,
        );
      return url;
    };
    const setWidth = async (session, width) =>
      session.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: width < 768 ? 812 : 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
    const screenshot = makeScreenshotter(shotDir);
    const runAxe = async (session) =>
      axeVerdict(
        await evaluate(session, axeExpression(undefined, undefined, THIRD_PARTY_EXCLUDED_CONTEXT), true),
      );

    await setWidth(cdp, 1280);
    log(`browser ${browserPath} · base ${baseUrl} · widths ${widths.join("/")}`);

    let projectId = flag("project-id", "");
    let projectPath = "";
    if (!projectId) {
      for (let attempt = 1; attempt <= 4 && !projectId; attempt += 1) {
        await navigate(cdp, "/build/all");
        const found = await evaluate(
          cdp,
          `(() => {
            const link = Array.from(document.querySelectorAll('a[href^="/build/"]'))
              .map((a) => a.getAttribute("href"))
              .find((h) => /^\\/build\\/(workspaces\\/[^/]+\\/)?\\d+/.test(h));
            return link || "";
          })()`,
        );
        if (found) {
          projectPath = String(found);
        } else {
          await evaluate(cdp, `(() => { const r = document.querySelector('main tbody tr'); if (r) r.click(); return ""; })()`);
          await sleep(settleMs);
          const landed = await evaluate(cdp, "location.pathname");
          if (/^\/build\/(workspaces\/[^/]+\/)?\d+/.test(String(landed))) projectPath = String(landed);
        }
        const match = projectPath.match(/^\/build\/(?:workspaces\/[^/]+\/)?(\d+)/);
        if (match) projectId = match[1];
      }
    }
    if (!projectId)
      throw new Error("could not resolve a project from /build/all — no numeric project link and no navigable row");
    if (!projectPath) projectPath = `/build/${projectId}`;
    const projectFlat = `/build/${projectId}`;
    log(`projectId = ${projectId} · projectPath = ${projectPath}`);

    let ticketKey = "";
    for (let attempt = 1; attempt <= 3 && !ticketKey; attempt += 1) {
      await navigate(cdp, `${projectFlat}/backlog`);
      const found = await evaluate(
        cdp,
        `(() => {
          const link = Array.from(document.querySelectorAll('a[href*="/tickets/"]'))
            .map((a) => a.getAttribute("href"))
            .find((h) => /\\/tickets\\/[A-Za-z0-9-]+$/.test(h));
          return link ? link.split("/tickets/")[1] : "";
        })()`,
      );
      if (found) {
        ticketKey = String(found);
        break;
      }
      await evaluate(cdp, `(() => { const r = document.querySelector('main tbody tr'); if (r) r.click(); return ""; })()`);
      await sleep(settleMs);
      const landed = await evaluate(cdp, "location.pathname");
      const match = String(landed).match(/\/tickets\/([A-Za-z0-9-]+)$/);
      if (match) ticketKey = match[1];
    }
    log(ticketKey ? `ticketKey = ${ticketKey}` : "ticketKey unresolved — error state will be NOT-RUN");

    for (const width of widths) {
      await setWidth(cdp, width);
      log(`--- ${width}px ---`);

      cells.push(
        await runLoadingAndEmpty({ cdp, width, baseUrl, navigate, evaluate, screenshot, runAxe }),
      );
      cells.push(
        await runErrorAndRetry({
          cdp,
          width,
          projectFlat,
          ticketKey,
          navigate,
          evaluate,
          screenshot,
          runAxe,
          settleMs,
        }),
      );
      cells.push(
        await runCrossTab({
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
        }),
      );
      cells.push(
        await runKeyboard({ cdp, width, projectFlat, navigate, evaluate, screenshot, runAxe }),
      );
      cells.push(
        await runResponsive({ cdp, width, projectPath, projectFlat, navigate, evaluate, screenshot, runAxe }),
      );
    }

    const table = renderMarkdownTable(cells, widths);
    const counts = summarise(cells);
    const results = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      widths,
      projectPath,
      projectFlat,
      ticketKey: ticketKey || null,
      planned,
      counts,
      screenshotDir: shotDir,
      cells,
    };
    writeFileSync(outPath, JSON.stringify(results, null, 2));
    writeFileSync(join(shotDir, "acceptance-table.md"), `${table}\n`);
    console.log(`\n${table}\n`);
    console.log(`PASS ${counts.PASS} · FAIL ${counts.FAIL} · NOT-RUN ${counts["NOT-RUN"]} of ${planned}`);
    console.log(`results ${outPath}`);
    for (const c of cells)
      if (c.verdict !== PASS) console.error(`✖  ${c.state} @ ${c.width}px — ${c.verdict}: ${c.reason}`);
    if (matrixIncomplete(cells, planned))
      console.error(`✖  only ${cells.length} of ${planned} cells ran — this matrix is incomplete, not clean`);
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
