#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
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
  PASS,
  NOT_RUN,
  parseWidths,
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

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

export const IDENTITY_STATES = [
  { key: "email-stage", label: "Email stage initial render" },
  { key: "code-stage-advance", label: "Email submit advances to the code stage" },
  { key: "verify-gate", label: "Verify absent below six, present and single-shot at six" },
  { key: "focus-order", label: "Keyboard focus order across the code stage" },
  { key: "wrong-code-error", label: "Wrong six-digit code renders a live-region error" },
  { key: "code-stage-fit", label: "Code stage fits the viewport" },
];

export const STUB_MARKER_HEADER = "x-identity-harness-stub";

export function classifyOtpUrl(url) {
  const path = String(url ?? "").split("?")[0];
  if (/\/auth\/email-otp\/verify$/.test(path)) return "verify";
  if (/\/auth\/email-otp$/.test(path)) return "request";
  return "other";
}

export function stubOtpRequestBody(message) {
  return JSON.stringify({ success: true, data: { message } });
}

export function stubVerifyErrorBody(message) {
  return JSON.stringify({ statusCode: 401, message, error: "Unauthorized" });
}

export function corsHeaders(origin, requestedHeaders) {
  return [
    { name: "Access-Control-Allow-Origin", value: origin },
    { name: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
    {
      name: "Access-Control-Allow-Headers",
      value: requestedHeaders || "content-type,x-correlation-id",
    },
    { name: "Access-Control-Max-Age", value: "600" },
    { name: STUB_MARKER_HEADER, value: "1" },
  ];
}

export function verifyGateVerdict({ zero, three, six }) {
  if (!zero || !three || !six) return { ok: false, reason: "a digit probe is missing" };
  if (zero.verifyPresent) return { ok: false, reason: "Verify is rendered with 0 digits" };
  if (three.verifyPresent) return { ok: false, reason: "Verify is rendered with 3 digits" };
  if (!six.verifyPresent) return { ok: false, reason: "Verify is absent at 6 digits" };
  return { ok: true, reason: null };
}

export function verifyEnabledAtSixVerdict(six) {
  if (!six || !six.verifyPresent) return { ok: false, reason: "Verify is absent at 6 digits" };
  if (six.verifyDisabled !== false)
    return {
      ok: false,
      reason: `Verify is present at 6 digits but disabled (label "${six.verifyLabel}", aria-busy ${six.verifyBusy})`,
    };
  return { ok: true, reason: null };
}

export function singleRequestVerdict(count) {
  if (count === 1) return { ok: true, reason: null };
  return { ok: false, reason: `six digits issued ${count} verify requests, expected exactly 1` };
}

export function isSubsequence(expected, observed) {
  let cursor = 0;
  for (const label of observed) {
    if (label === expected[cursor]) cursor += 1;
    if (cursor === expected.length) return true;
  }
  return cursor === expected.length;
}

export function rotations(list) {
  return list.map((_, i) => [...list.slice(i), ...list.slice(0, i)]);
}

export function focusOrderVerdict(observed, expected) {
  if (expected.length === 0) return { ok: false, reason: "no focusable control was found to traverse" };
  const missing = expected.filter((e) => !observed.includes(e));
  if (missing.length > 0)
    return { ok: false, reason: `Tab never reached: ${missing.join(", ")}` };
  const matched = rotations(expected).some((r) => isSubsequence(r, observed));
  if (!matched)
    return {
      ok: false,
      reason: `Tab order ${observed.join(" -> ")} is not the DOM order ${expected.join(" -> ")} from any starting point`,
    };
  return { ok: true, reason: null };
}

export function liveRegionVerdict(probe) {
  if (!probe) return { ok: false, reason: "no probe was taken" };
  if (!probe.alertText) return { ok: false, reason: "no inline error text was rendered" };
  if (probe.alertRole !== "alert")
    return { ok: false, reason: `inline error carries role="${probe.alertRole}", not role="alert"` };
  if (!probe.alertLive) return { ok: false, reason: "inline error carries no aria-live" };
  if (!probe.otpPresent) return { ok: false, reason: "the code field is gone after the error" };
  if (probe.otpDisabled) return { ok: false, reason: "the code field stayed disabled after the error" };
  return { ok: true, reason: null };
}

export function stubbedOnlyVerdict(responses) {
  const sends = responses.filter((r) => r.kind === "request" && r.status !== 204);
  if (sends.length === 0)
    return { ok: false, reason: "no /auth/email-otp response was observed at all" };
  const leaked = sends.filter((r) => r.stubbed !== true);
  if (leaked.length > 0)
    return {
      ok: false,
      reason: `${leaked.length} of ${sends.length} /auth/email-otp responses did not carry the harness stub marker`,
    };
  return { ok: true, reason: null };
}

export function emailTransportVerdict({ provider, nodeEnv, allowLiveSend }) {
  const live = provider !== "none" && (nodeEnv !== "test" || allowLiveSend === "1");
  return {
    nonProduction: !live,
    reason: live
      ? `EMAIL_PROVIDER=${provider} with NODE_ENV=${nodeEnv} constructs a live sender`
      : "no live sender can be constructed",
  };
}

const PAGE_PROBE = `(() => {
  const named = (el) =>
    (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "")
      .trim()
      .replace(/\\s+/g, " ");
  const otp = document.querySelector("input[data-input-otp], input[autocomplete='one-time-code']");
  const email = document.querySelector("input#email");
  const buttons = Array.from(document.querySelectorAll("button"));
  const verify = buttons.find((b) => /^(Verify code|Verifying)/.test(named(b)));
  const alertEl = document.querySelector("p[role='alert']");
  const h1 = document.querySelector("h1");
  return {
    url: location.pathname + location.search,
    h1: h1 ? named(h1) : null,
    emailPresent: Boolean(email),
    emailDisabled: email ? Boolean(email.disabled) : null,
    otpPresent: Boolean(otp),
    otpDisabled: otp ? Boolean(otp.disabled) : null,
    otpValue: otp ? otp.value : null,
    verifyPresent: Boolean(verify),
    verifyDisabled: verify ? Boolean(verify.disabled) : null,
    verifyBusy: verify ? verify.getAttribute("aria-busy") : null,
    verifyLabel: verify ? named(verify) : null,
    buttons: buttons.map((b) => ({ label: named(b), disabled: Boolean(b.disabled) })),
    alertText: alertEl ? named(alertEl) : null,
    alertRole: alertEl ? alertEl.getAttribute("role") : null,
    alertLive: alertEl ? alertEl.getAttribute("aria-live") : null,
    bodyText: (document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 400),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  };
})()`;

const FOCUS_LABEL = `(el) => {
  if (!el) return "(none)";
  if (el === document.body) return "(body)";
  if (el.matches("input[data-input-otp], input[autocomplete='one-time-code']")) return "otp-input";
  if (el.id) return "#" + el.id;
  const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "")
    .trim()
    .replace(/\\s+/g, " ");
  return name || "<" + el.tagName.toLowerCase() + ">";
}`;

const FOCUSABLES_PROBE = `(() => {
  const label = ${FOCUS_LABEL};
  const selector = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
  const usable = (el) => {
    if (el.disabled) return false;
    if (el.tabIndex < 0) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return true;
  };
  return Array.from(document.querySelectorAll(selector)).filter(usable).map(label);
})()`;

const ACTIVE_LABEL_PROBE = `(() => {
  const label = ${FOCUS_LABEL};
  return label(document.activeElement);
})()`;

function setFieldValue(selector, value) {
  return `(() => {
    const field = document.querySelector(${JSON.stringify(selector)});
    if (!field) return false;
    const value = ${JSON.stringify(value)};
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return field.value === value;
  })()`;
}

function clickByName(name) {
  return `(() => {
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ");
    const button = Array.from(document.querySelectorAll("button")).find(
      (el) => named(el) === ${JSON.stringify(name)},
    );
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

function clickByNamePrefix(prefix) {
  return `(() => {
    const named = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ");
    const button = Array.from(document.querySelectorAll("button")).find(
      (el) => named(el).startsWith(${JSON.stringify(prefix)}),
    );
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

function runSelfTest() {
  const failures = [];
  let count = 0;
  const assert = (label, condition) => {
    if (condition) count += 1;
    else failures.push(label);
  };

  assert("the verify sub-path is classified before the request path", classifyOtpUrl("http://h/auth/email-otp/verify") === "verify");
  assert("the send path is classified", classifyOtpUrl("http://h/auth/email-otp") === "request");
  assert("a query string does not change the classification", classifyOtpUrl("http://h/auth/email-otp?x=1") === "request");
  assert("an unrelated auth route is not intercepted", classifyOtpUrl("http://h/auth/magic-link") === "other");

  assert("the stub body is the success envelope the client unwraps", JSON.parse(stubOtpRequestBody("sent")).data.message === "sent");
  assert("the stub error body carries a message the error parser reads", JSON.parse(stubVerifyErrorBody("Invalid or expired code")).message === "Invalid or expired code");
  assert("cors headers echo the requested header list", corsHeaders("http://o", "content-type,x-correlation-id").some((h) => h.value === "content-type,x-correlation-id"));

  assert("BITE - a Verify rendered at 0 digits fails the gate", verifyGateVerdict({ zero: { verifyPresent: true }, three: {}, six: { verifyPresent: true } }).ok === false);
  assert("BITE - a Verify rendered at 3 digits fails the gate", verifyGateVerdict({ zero: {}, three: { verifyPresent: true }, six: { verifyPresent: true } }).ok === false);
  assert("BITE - a Verify missing at 6 digits fails the gate", verifyGateVerdict({ zero: {}, three: {}, six: { verifyPresent: false } }).ok === false);
  assert("absent below six and present at six passes", verifyGateVerdict({ zero: {}, three: {}, six: { verifyPresent: true } }).ok === true);
  assert("a missing probe is never a pass", verifyGateVerdict({ zero: null, three: {}, six: { verifyPresent: true } }).ok === false);

  assert("an enabled Verify at six passes", verifyEnabledAtSixVerdict({ verifyPresent: true, verifyDisabled: false }).ok === true);
  assert("BITE - a disabled Verify at six is not an enabled Verify", verifyEnabledAtSixVerdict({ verifyPresent: true, verifyDisabled: true, verifyLabel: "Verifying...", verifyBusy: "true" }).ok === false);
  assert("BITE - an unmeasured disabled flag is not a pass", verifyEnabledAtSixVerdict({ verifyPresent: true, verifyDisabled: null }).ok === false);

  assert("exactly one verify request passes", singleRequestVerdict(1).ok === true);
  assert("BITE - two verify requests fail", singleRequestVerdict(2).ok === false);
  assert("BITE - zero verify requests fail", singleRequestVerdict(0).ok === false);

  assert("a Tab sweep that visits DOM order passes", focusOrderVerdict(["otp-input", "Use a different email", "Resend code"], ["otp-input", "Use a different email", "Resend code"]).ok === true);
  assert("extra stops between the expected ones are tolerated", focusOrderVerdict(["otp-input", "x", "Use a different email"], ["otp-input", "Use a different email"]).ok === true);
  assert("BITE - a control Tab never reaches fails", focusOrderVerdict(["otp-input"], ["otp-input", "Resend code"]).ok === false);
  assert("BITE - a reversed Tab order fails", focusOrderVerdict(["Resend code", "otp-input", "Resend code"], ["otp-input", "Resend code", "x"]).ok === false);
  assert("BITE - an empty expectation is never a pass", focusOrderVerdict(["a"], []).ok === false);
  assert("a traversal that starts mid-list and wraps is still DOM order", focusOrderVerdict(["c", "a", "b"], ["a", "b", "c"]).ok === true);
  assert("rotations cover every starting point", rotations(["a", "b", "c"]).length === 3 && rotations(["a", "b", "c"])[2].join("") === "cab");
  assert("a subsequence tolerates interleaved stops", isSubsequence(["a", "b"], ["a", "x", "b"]) === true);
  assert("BITE - an out-of-order pair is not a subsequence", isSubsequence(["a", "b"], ["b", "a"]) === false);
  assert("a 204 preflight is not counted as an unstubbed send", stubbedOnlyVerdict([{ kind: "request", status: 204, stubbed: false }, { kind: "request", status: 201, stubbed: true }]).ok === true);

  assert("an inline error in a live region with a usable field passes", liveRegionVerdict({ alertText: "Invalid or expired code", alertRole: "alert", alertLive: "assertive", otpPresent: true, otpDisabled: false }).ok === true);
  assert("BITE - no error text fails", liveRegionVerdict({ alertText: null, alertRole: "alert", alertLive: "assertive", otpPresent: true }).ok === false);
  assert("BITE - an error outside a live region fails", liveRegionVerdict({ alertText: "x", alertRole: "alert", alertLive: null, otpPresent: true, otpDisabled: false }).ok === false);
  assert("BITE - an error that leaves the form unusable fails", liveRegionVerdict({ alertText: "x", alertRole: "alert", alertLive: "assertive", otpPresent: true, otpDisabled: true }).ok === false);

  assert("every send answered by the stub passes", stubbedOnlyVerdict([{ kind: "request", stubbed: true }]).ok === true);
  assert("BITE - a send that reached the server fails", stubbedOnlyVerdict([{ kind: "request", stubbed: false }]).ok === false);
  assert("BITE - no observed send is not a pass", stubbedOnlyVerdict([{ kind: "verify", stubbed: true }]).ok === false);

  assert("a configured provider in development is a live transport", emailTransportVerdict({ provider: "zeptomail", nodeEnv: "development", allowLiveSend: undefined }).nonProduction === false);
  assert("a test run without the escape hatch builds no sender", emailTransportVerdict({ provider: "zeptomail", nodeEnv: "test", allowLiveSend: undefined }).nonProduction === true);
  assert("BITE - the test escape hatch restores a live sender", emailTransportVerdict({ provider: "zeptomail", nodeEnv: "test", allowLiveSend: "1" }).nonProduction === false);
  assert("no provider is never a live transport", emailTransportVerdict({ provider: "none", nodeEnv: "development" }).nonProduction === true);

  assert("the matrix plans one cell per state per width", plannedCellCount(IDENTITY_STATES, [320, 1280]) === 12);
  assert("a cell with no screenshot is NOT-RUN", cellFromChecks("s", 320, [passed("a")], [], { ran: true }).verdict === NOT_RUN);
  assert("every state key is unique", new Set(IDENTITY_STATES.map((s) => s.key)).size === IDENTITY_STATES.length);
  assert("the table renders one row per identity state", renderMarkdownTable([], [320, 1280], IDENTITY_STATES).split("\n").length === 2 + IDENTITY_STATES.length);
  assert("overflow is measured, not assumed", overflowVerdict({}).measured === false);
  assert("a page exactly as wide as the viewport does not overflow", overflowVerdict({ scrollWidth: 320, innerWidth: 320 }).overflows === false);
  assert("BITE - a page wider than the viewport overflows", overflowVerdict({ scrollWidth: 400, innerWidth: 320 }).overflows === true);

  if (failures.length > 0) {
    for (const f of failures) console.error(`  [FAIL] ${f}`);
    console.error(`\nSELF-TEST FAILED - ${failures.length} of ${failures.length + count}`);
    process.exit(1);
  }
  console.log(`verify-identity-journey self-tests: ${count} passed`);
  process.exit(0);
}

if (SELF_TEST) runSelfTest();

async function main() {
  const baseUrl = flag("base-url", "http://127.0.0.1:1000").replace(/\/$/, "");
  const widths = parseWidths(flag("widths", "320,1280"));
  const settleMs = Number(flag("settle-ms", "2500"));
  const browserPath = findBrowser(flag("browser", ""));
  const shotDir = flag(
    "screenshot-dir",
    process.env.IDENTITY_ACCEPTANCE_DIR || join(tmpdir(), "identity-acceptance"),
  );
  const outPath = flag("out", join(shotDir, "identity-acceptance-results.json"));
  const liveEmail = argv.includes("--live-email");

  if (!browserPath) throw new Error("no Chrome/Chromium found - pass --browser=<path>");
  if (liveEmail)
    throw new Error(
      "--live-email is refused: this harness never sends real mail, it stubs POST /auth/email-otp at the network layer",
    );
  mkdirSync(shotDir, { recursive: true });

  const axeSource = readFileSync(axeSourcePath(), "utf8");
  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);
  const origin = baseUrl;

  const consoleErrors = [];
  const networkFailures = [];
  const otpResponses = [];
  const counters = { request: 0, verify: 0 };
  let holdVerify = false;
  let heldVerify = [];

  const { proc, debugPort } = launchChrome(browserPath);
  const cells = [];
  const planned = plannedCellCount(IDENTITY_STATES, widths);

  try {
    await waitForDevTools(debugPort, 20000);
    const cdp = await cdpSession(await firstPageTarget(debugPort));
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Log.enable").catch(() => undefined);
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: axeSource });

    cdp.on("Runtime.consoleAPICalled", (e) => {
      if (e.type !== "error") return;
      consoleErrors.push({
        kind: "console.error",
        text: (e.args ?? [])
          .map((a) => a.value ?? a.description ?? a.unserializableValue ?? a.type)
          .join(" ")
          .slice(0, 400),
      });
    });
    cdp.on("Runtime.exceptionThrown", (e) => {
      consoleErrors.push({
        kind: "exception",
        text: String(
          e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text ?? "",
        ).slice(0, 400),
      });
    });
    cdp.on("Network.loadingFailed", (e) => {
      if (e.canceled) return;
      networkFailures.push({ kind: "loadingFailed", error: e.errorText, type: e.type });
    });
    cdp.on("Network.responseReceived", (e) => {
      const url = e.response?.url ?? "";
      const kind = classifyOtpUrl(url);
      const headers = e.response?.headers ?? {};
      if (kind !== "other")
        otpResponses.push({
          kind,
          url,
          status: e.response.status,
          stubbed: Object.keys(headers).some(
            (h) => h.toLowerCase() === STUB_MARKER_HEADER && headers[h] === "1",
          ),
        });
      if ((e.response?.status ?? 0) >= 400)
        networkFailures.push({ kind: "http", url, status: e.response.status });
    });

    cdp.on("Fetch.requestPaused", (event) => {
      void (async () => {
        const kind = classifyOtpUrl(event.request.url);
        const requested =
          event.request.headers["Access-Control-Request-Headers"] ??
          event.request.headers["access-control-request-headers"];
        try {
          if (event.request.method === "OPTIONS") {
            await cdp.send("Fetch.fulfillRequest", {
              requestId: event.requestId,
              responseCode: 204,
              responseHeaders: corsHeaders(origin, requested),
            });
            return;
          }
          if (kind === "request") {
            counters.request += 1;
            const body = stubOtpRequestBody("Verification code sent to your email");
            await cdp.send("Fetch.fulfillRequest", {
              requestId: event.requestId,
              responseCode: 201,
              responseHeaders: [
                ...corsHeaders(origin, requested),
                { name: "Content-Type", value: "application/json" },
              ],
              body: Buffer.from(body).toString("base64"),
            });
            return;
          }
          if (kind === "verify") {
            counters.verify += 1;
            if (holdVerify) {
              heldVerify.push({ requestId: event.requestId, requested });
              return;
            }
          }
          await cdp.send("Fetch.continueRequest", { requestId: event.requestId });
        } catch {
          void 0;
        }
      })();
    });

    await cdp.send("Fetch.enable", {
      patterns: [{ urlPattern: "*/auth/email-otp*", requestStage: "Request" }],
    });

    const releaseHeld = async () => {
      const pending = heldVerify;
      heldVerify = [];
      for (const held of pending) {
        try {
          await cdp.send("Fetch.fulfillRequest", {
            requestId: held.requestId,
            responseCode: 401,
            responseHeaders: [
              ...corsHeaders(origin, held.requested),
              { name: "Content-Type", value: "application/json" },
            ],
            body: Buffer.from(stubVerifyErrorBody("Invalid or expired code")).toString("base64"),
          });
        } catch {
          void 0;
        }
      }
    };

    const evaluate = async (expression, awaitPromise = false) => {
      const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
      return r.result?.value;
    };
    const probe = () => evaluate(PAGE_PROBE);
    const runAxe = async () => axeVerdict(await evaluate(axeExpression(), true));
    const setWidth = (width) =>
      cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: width < 768 ? 640 : 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
    const screenshot = async (state, width, variant) => {
      const name = screenshotName(state, width, variant);
      const path = join(shotDir, name);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path, Buffer.from(shot.data, "base64"));
      return path;
    };
    const navigate = async (path, wait = settleMs) => {
      await cdp.send("Page.navigate", { url: `${baseUrl}${path}` });
      await sleep(wait);
    };
    const key = async (character, settle = 110) => {
      await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: character });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "char",
        key: character,
        text: character,
        unmodifiedText: character,
      });
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: character });
      if (settle > 0) await sleep(settle);
    };
    const tab = async () => {
      const common = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 };
      await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...common });
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
      await sleep(120);
    };
    const focusOtp = () =>
      evaluate(
        `(() => { const el = document.querySelector("input[data-input-otp], input[autocomplete='one-time-code']"); if (!el) return false; el.focus(); return document.activeElement === el; })()`,
      );
    const waitForToasts = async (timeoutMs = 9000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const present = await evaluate(`document.querySelectorAll("[data-sonner-toast]").length`);
        if (!present) return true;
        await sleep(400);
      }
      return false;
    };
    const reachCodeStage = async (address, attempts = 3) => {
      let last = "no attempt ran";
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        await navigate("/signin", settleMs + attempt * 700);
        const typed = await evaluate(setFieldValue("input#email", address));
        if (typed !== true) {
          last = "the email field would not take a value";
          continue;
        }
        const clicked = await evaluate(clickByName("Continue"));
        if (clicked !== true) {
          last = "no Continue control was found";
          continue;
        }
        await sleep(settleMs);
        const p = await probe();
        if (p?.otpPresent) return { ok: true, probe: p, attempts: attempt };
        last = `the code stage did not render (${p?.bodyText ?? "no probe"})`;
      }
      return { ok: false, reason: last };
    };
    const address = () => `browser-probe+${Date.now()}@example.com`;

    log(`browser ${browserPath} - base ${baseUrl} - widths ${widths.join("/")}`);
    log("email transport: POST /auth/email-otp is fulfilled in-browser; no send request leaves the machine");

    for (const width of widths) {
      await setWidth(width);
      log(`--- ${width}px ---`);

      {
        const state = "email-stage";
        await navigate("/signin");
        const p = await probe();
        const shots = [await screenshot(state, width)];
        const of = overflowVerdict(p ?? {});
        const checks = [
          p?.emailPresent ? passed("the email field renders") : failed("the email field renders", "input#email is absent"),
          p?.h1 ? passed("the page has a heading") : failed("the page has a heading", "no h1"),
          (p?.buttons ?? []).some((b) => b.label === "Continue")
            ? passed("the Continue control renders")
            : failed("the Continue control renders", "no Continue button"),
          !p?.otpPresent ? passed("the code stage is not rendered yet") : failed("the code stage is not rendered yet", "an OTP field is already present"),
          of.measured && !of.overflows
            ? passed("no horizontal overflow")
            : failed("no horizontal overflow", `scrollWidth ${p?.scrollWidth} vs innerWidth ${p?.innerWidth}`),
        ];
        cells.push({ ...cellFromChecks(state, width, checks, shots, await runAxe()), probe: p });
      }

      {
        const state = "code-stage-advance";
        const subject = address();
        const reached = await reachCodeStage(subject);
        const shots = [await screenshot(state, width)];
        const p = reached.probe ?? (await probe());
        const stubOk = stubbedOnlyVerdict(otpResponses);
        const checks = [
          reached.ok ? passed("submitting an email advances to the code stage") : failed("submitting an email advances to the code stage", reached.reason),
          p?.otpPresent ? passed("the six-slot code field renders") : failed("the six-slot code field renders", "no OTP input"),
          p?.bodyText?.includes(subject) ? passed("the address the code went to is shown") : failed("the address the code went to is shown", `body did not name ${subject}`),
          stubOk.ok ? passed("no send request reached the API") : failed("no send request reached the API", stubOk.reason),
          unreached(
            "a real provider send",
            "BLOCKED: the backend runs NODE_ENV=development with EMAIL_PROVIDER=zeptomail and a live token, so a real request would deliver mail",
          ),
        ];
        cells.push({ ...cellFromChecks(state, width, checks, shots, await runAxe()), probe: p, subject });
      }

      {
        const state = "verify-gate";
        const subject = address();
        const reached = await reachCodeStage(subject);
        const shots = [];
        let zero = null;
        let three = null;
        let six = null;
        let sixSettled = null;
        let verifyCount = 0;
        let clickedWhilePending = null;
        if (reached.ok) {
          holdVerify = true;
          const before = counters.verify;
          zero = await probe();
          shots.push(await screenshot(state, width, "0-digits"));
          await focusOtp();
          for (const d of ["1", "2", "3"]) await key(d);
          three = await probe();
          shots.push(await screenshot(state, width, "3-digits"));
          for (const d of ["4", "5"]) await key(d);
          await key("6", 0);
          six = await probe();
          await sleep(1200);
          sixSettled = await probe();
          shots.push(await screenshot(state, width, "6-digits"));
          clickedWhilePending = await evaluate(clickByNamePrefix("Verify"));
          await sleep(1200);
          verifyCount = counters.verify - before;
          holdVerify = false;
          await releaseHeld();
          await sleep(700);
        }
        const gate = verifyGateVerdict({ zero, three, six: six?.verifyPresent ? six : sixSettled });
        const enabledNow = verifyEnabledAtSixVerdict(six);
        const enabledSettled = verifyEnabledAtSixVerdict(sixSettled);
        const enabled = enabledNow.ok || enabledSettled.ok ? { ok: true, reason: null } : enabledSettled;
        const single = singleRequestVerdict(verifyCount);
        const checks = reached.ok
          ? [
              gate.ok ? passed("Verify is absent below six and present at six") : failed("Verify is absent below six and present at six", gate.reason),
              enabled.ok ? passed("Verify is enabled at exactly six") : failed("Verify is enabled at exactly six", enabled.reason),
              single.ok ? passed("six digits submit exactly once") : failed("six digits submit exactly once", single.reason),
              clickedWhilePending === true || clickedWhilePending === false
                ? passed("an explicit Verify click was attempted while the request was in flight")
                : unreached("an explicit Verify click was attempted while the request was in flight", "the control could not be located"),
            ]
          : [unreached("the code stage was reached", reached.reason)];
        cells.push({
          ...cellFromChecks(state, width, checks, shots, await runAxe()),
          digits: { zero, three, six, sixSettled },
          verifyRequests: verifyCount,
          clickedWhilePending,
        });
      }

      {
        const state = "focus-order";
        const reached = await reachCodeStage(address());
        const shots = [];
        let expected = [];
        let observed = [];
        let disabledControls = [];
        if (reached.ok) {
          await waitForToasts();
          expected = (await evaluate(FOCUSABLES_PROBE)) ?? [];
          disabledControls = (
            (await probe())?.buttons ?? []
          ).filter((b) => b.disabled);
          await evaluate(`(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return true; })()`);
          for (let i = 0; i < expected.length * 2 + 2; i += 1) {
            await tab();
            observed.push(await evaluate(ACTIVE_LABEL_PROBE));
          }
          shots.push(await screenshot(state, width));
        }
        const verdict = focusOrderVerdict(observed, expected);
        const checks = reached.ok
          ? [
              verdict.ok ? passed("Tab visits every enabled control in DOM order") : failed("Tab visits every enabled control in DOM order", verdict.reason),
              observed.includes("otp-input") ? passed("the code field is keyboard reachable") : failed("the code field is keyboard reachable", `Tab visited ${observed.join(" -> ")}`),
              observed.includes("Use a different email") ? passed("the back control is keyboard reachable") : failed("the back control is keyboard reachable", `Tab visited ${observed.join(" -> ")}`),
            ]
          : [unreached("the code stage was reached", reached.reason)];
        cells.push({
          ...cellFromChecks(state, width, checks, shots, await runAxe()),
          expected,
          observed,
          disabledControls,
        });
      }

      {
        const state = "wrong-code-error";
        const reached = await reachCodeStage(address());
        const shots = [];
        let after = null;
        let verifyCount = 0;
        if (reached.ok) {
          const before = counters.verify;
          await focusOtp();
          for (const d of ["9", "1", "1", "8", "2", "7"]) await key(d);
          const deadline = Date.now() + 15000;
          while (Date.now() < deadline) {
            after = await probe();
            if (after?.alertText || after?.otpValue === "") break;
            await sleep(500);
          }
          verifyCount = counters.verify - before;
          after = await probe();
          shots.push(await screenshot(state, width));
        }
        const live = liveRegionVerdict(after);
        const checks = reached.ok
          ? [
              live.ok ? passed("the inline error renders in a live region") : failed("the inline error renders in a live region", live.reason),
              after?.otpValue === "" ? passed("the code field is cleared for another attempt") : failed("the code field is cleared for another attempt", `value is "${after?.otpValue}"`),
              (after?.buttons ?? []).some((b) => b.label === "Use a different email" && !b.disabled)
                ? passed("the form stays usable after the error")
                : failed("the form stays usable after the error", "no enabled recovery control"),
              verifyCount === 1 ? passed("the wrong code was submitted once") : failed("the wrong code was submitted once", `${verifyCount} verify requests`),
            ]
          : [unreached("the code stage was reached", reached.reason)];
        cells.push({ ...cellFromChecks(state, width, checks, shots, await runAxe()), probe: after });
      }

      {
        const state = "code-stage-fit";
        const reached = await reachCodeStage(address());
        const shots = [];
        let p = null;
        if (reached.ok) {
          p = reached.probe;
          shots.push(await screenshot(state, width));
        }
        const of = overflowVerdict(p ?? {});
        const checks = reached.ok
          ? [
              of.measured && !of.overflows
                ? passed("the code stage does not scroll horizontally")
                : failed("the code stage does not scroll horizontally", `scrollWidth ${p?.scrollWidth} exceeds innerWidth ${p?.innerWidth} by ${of.by}`),
              p?.otpPresent ? passed("the six slots render at this width") : failed("the six slots render at this width", "no OTP input"),
            ]
          : [unreached("the code stage was reached", reached.reason)];
        cells.push({ ...cellFromChecks(state, width, checks, shots, await runAxe()), probe: p });
      }
    }

    const table = renderMarkdownTable(cells, widths, IDENTITY_STATES);
    const counts = summarise(cells);
    const results = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      widths,
      screenshotDir: shotDir,
      emailTransport: {
        mode: "intercepted-stub",
        confirmedNonProduction: false,
        evidence:
          "backend/.env sets EMAIL_PROVIDER=zeptomail with a live ZEPTOMAIL_TOKEN and NODE_ENV=development; buildEmailClients only refuses to construct a sender when NODE_ENV=test",
        sendsAttemptedAgainstProvider: 0,
      },
      counters,
      otpResponses,
      consoleErrors,
      networkFailures,
      planned,
      counts,
      cells,
    };
    writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
    writeFileSync(join(shotDir, "identity-acceptance-table.md"), `${table}\n`);
    console.log(`\n${table}\n`);
    console.log(`PASS ${counts.PASS} - FAIL ${counts.FAIL} - NOT-RUN ${counts["NOT-RUN"]} of ${planned}`);
    console.log(`console errors ${consoleErrors.length} - network failures ${networkFailures.length}`);
    console.log(`results ${outPath}`);
    for (const c of cells)
      if (c.verdict !== PASS) console.error(`x  ${c.state} @ ${c.width}px - ${c.verdict}: ${c.reason}`);
    if (matrixIncomplete(cells, planned))
      console.error(`x  only ${cells.length} of ${planned} cells ran - this matrix is incomplete, not clean`);
    cdp.close();
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
