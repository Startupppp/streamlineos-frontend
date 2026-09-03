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
 *   - axe-core runs against the tree the product actually PAINTS, which is the
 *     one blind spot the static ARIA census names in its own header: it cannot
 *     see through a PascalCase component, cannot prove a runtime-computed name
 *     is non-empty, and honours an id threaded through a prop by name rather
 *     than by proof. Here `<Dialog>` is expanded and every id either resolves
 *     in the document or does not.
 *   - a real mutation, driven through the UI, SURVIVES A RELOAD — see
 *     WRITE_JOURNEYS. Reads rendering is not the product working, and one
 *     module's create dialog is not "the main module flows".
 *
 *   node scripts/browser-journeys.mjs --self-test
 *   node scripts/browser-journeys.mjs \
 *     --base-url=http://localhost:3000 \
 *     --cookie-file=<path holding the authjs.session-token value> \
 *     --widths=375,768,1280
 *
 * Budgets govern authenticated surfaces, so an unauthenticated run is refused
 * rather than reported as a pass — and so is a run that reached fewer steps
 * than it planned, one where most steps rendered the error page, one whose
 * write never landed, or one where axe failed to run on a step it probed. A
 * step axe never judged is not a step with no violations.
 *
 * `--allow-cross-origin-api` turns the BROWSER's CORS check off, for the case
 * where the API's allowlist does not name the port the harness is serving the
 * app on. It is recorded in the results and printed loudly: a run that used it
 * has not shown CORS is configured.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
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
 * The three page expressions every write journey is built from. Builders, not
 * copied literals: the same three shapes recur across modules, and a copy per
 * journey is how one of them quietly stops going through React's value setter
 * and starts writing a string the framework never sees — which submits an empty
 * form and reports it as a product defect.
 */
function clickByName(name, scope) {
  const root = scope ? `document.querySelector(${JSON.stringify(scope)})` : "document";
  return `(() => {
    const root = ${root};
    if (!root) return false;
    const named = (el) =>
      (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ");
    const button = Array.from(root.querySelectorAll("button, [role='button']")).find(
      (el) => named(el) === ${JSON.stringify(name)} && el.offsetParent !== null && !el.disabled,
    );
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

/**
 * React owns a controlled input's value, so assigning `.value` is discarded on
 * the next render and the form submits blank. The native prototype setter plus
 * a bubbling `input` event is the only way a script reaches one — and the
 * expression returns whether the value actually STUCK, not whether it was
 * attempted, so a field that silently rejected it fails the step.
 */
function setFieldValue(selector, valueExpression) {
  return `(() => {
    const field = document.querySelector(${JSON.stringify(selector)});
    if (!field) return false;
    const value = ${valueExpression};
    const proto =
      field.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return field.value === value;
  })()`;
}

function submitDialogForm() {
  return `(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return false;
    const submit = Array.from(dialog.querySelectorAll('button[type="submit"]')).find(
      (el) => el.offsetParent !== null && !el.disabled,
    );
    if (!submit) return false;
    submit.click();
    return true;
  })()`;
}

/**
 * WRITE journeys. Every step above is a route plus an inert interaction, and a
 * sweep made only of those cannot tell a working product from a read-only one:
 * a page that renders is not a page that saves. These drive a real mutation
 * through the UI and then assert the result SURVIVED A RELOAD, which is the
 * only way a browser can tell a server write from optimistic client state.
 *
 * A create, not an edit — a create is the only write whose effect a later page
 * load can name without knowing what the value was before. The subject is
 * unique per run, so a row left by an earlier run can never be mistaken for
 * this one's, and the run asserts the subject is ABSENT before it writes.
 *
 * ONE MODULE'S WRITE IS NOT COVERAGE. A single create journey proves the
 * harness can drive a mutation; it says nothing about whether the other seven
 * areas the read sweep visits can save anything at all. Each write below is a
 * different module, a different backend service and a different table, and the
 * self-test refuses a set that collapses back onto one module. They are
 * deliberately different SHAPES too — an inline column composer, a modal form
 * with two required fields, a modal form that navigates away on success, and a
 * form whose submit opens a confirmation the run must also drive — because a
 * harness that can only work one shape of dialog will report the next one as a
 * product defect.
 */
const WRITE_JOURNEYS = [
  {
    name: "build-create-ticket",
    route: "/build/{projectId}",
    reloadVia: "/dashboard",
    absent: `!document.body.innerText.includes("{subject}")`,
    present: `document.body.innerText.includes("{subject}")`,
    actions: [
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
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          ).set;
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
    ],
  },
  {
    name: "accounting-create-account",
    route: "/accounting/coa",
    reloadVia: "/dashboard",
    absent: `!document.body.innerText.includes("{subject}")`,
    present: `document.body.innerText.includes("{subject}")`,
    actions: [
      { label: "open the new-account dialog", expression: clickByName("New account") },
      /**
       * The code is derived from the subject rather than drawn separately, so
       * one unique value per run governs both fields and a half-completed run
       * cannot leave a code that collides with the next one.
       */
      {
        label: "type the account code",
        expression: setFieldValue(
          'div[role="dialog"] input[name="code"]',
          `"{subject}".replace(/\\D/g, "").slice(-6)`,
        ),
      },
      {
        label: "type the account name",
        expression: setFieldValue('div[role="dialog"] input[name="name"]', `"{subject}"`),
      },
      { label: "submit the account form", expression: submitDialogForm() },
    ],
  },
  {
    name: "workflows-create-workflow",
    route: "/workflows",
    reloadVia: "/dashboard",
    absent: `!document.body.innerText.includes("{subject}")`,
    present: `document.body.innerText.includes("{subject}")`,
    actions: [
      { label: "open the new-workflow dialog", expression: clickByName("New Workflow") },
      {
        label: "type the workflow name",
        expression: setFieldValue('div[role="dialog"] input[name="name"]', `"{subject}"`),
      },
      /**
       * This submit navigates to the builder, so the assertion cannot be made
       * on the page that did the writing at all — which is the point. The run
       * leaves via `reloadVia` and comes back to the listing regardless.
       */
      { label: "submit and open the builder", expression: submitDialogForm() },
    ],
  },
  {
    name: "hr-create-holiday",
    route: "/hr/attendance",
    reloadVia: "/dashboard",
    absent: `!document.body.innerText.includes("{subject}")`,
    present: `document.body.innerText.includes("{subject}")`,
    actions: [
      { label: "type the holiday name", expression: setFieldValue("#holiday-name", `"{subject}"`) },
      { label: "submit the holiday form", expression: clickByName("Add Holiday") },
      /**
       * Submitting only opens a confirmation. A run that stopped at the first
       * click would report a write it never made, so the confirm is a step of
       * the journey rather than something the harness waves through.
       */
      {
        label: "confirm in the alert dialog",
        expression: clickByName("Add", 'div[role="alertdialog"]'),
      },
    ],
  },
];

/** `{subject}` is the only substitution a write expression may carry. */
export function substituteSubject(expression, subject) {
  return expression.split("{subject}").join(subject);
}

/**
 * RUNTIME accessibility, and specifically the half no static walk can reach.
 *
 * `components/__tests__/aria-semantics.contract.test.ts` censuses names, roles
 * and ARIA references over 3,652 source files, and its own header lists what
 * that cannot see: anything inside a PascalCase component (`<Dialog>`'s
 * semantics are behind an import), a name computed at runtime (`aria-label=
 * {label}` counts as named without proving `label` is non-empty), and an id
 * threaded through a prop, which it honours BY NAME rather than by proof.
 * Every one of those blind spots exists because the tree it judges is source.
 *
 * Here the tree is the render. axe-core runs in the engine that painted the
 * page, on the same steps at the same three widths, so `<Dialog>` is expanded,
 * `aria-label={label}` has resolved to a string or to nothing, and an
 * `aria-labelledby` either finds its id in the document or does not.
 *
 * IT IS STILL NOT COVERAGE. axe judges only what a page happened to render —
 * a dialog nobody opened is invisible to it — and neither instrument can tell
 * whether a name is the RIGHT name: `aria-label="Button"` on a delete control
 * passes both. The two together are a floor.
 *
 * `color-contrast` is off because this harness already measures contrast
 * against the colour actually behind each text node and reports it as its own
 * finding kind; running both would count the same pixels twice under two
 * different methods and make each look like corroboration of the other.
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const AXE_RULES_OFF = ["color-contrast"];
const AXE_TIMEOUT_MS = 25000;

export function axeExpression(tags, rulesOff, timeoutMs) {
  return `(() => {
    if (typeof window.axe === "undefined")
      return Promise.resolve({ ran: false, reason: "axe-not-injected" });
    const rules = {};
    for (const id of ${JSON.stringify(rulesOff)}) rules[id] = { enabled: false };
    const run = window.axe
      .run(document, { runOnly: { type: "tag", values: ${JSON.stringify(tags)} }, rules })
      .then((r) => ({
        ran: true,
        rulesEvaluated:
          r.passes.length + r.violations.length + r.incomplete.length + r.inapplicable.length,
        nodesChecked:
          r.passes.reduce((n, x) => n + x.nodes.length, 0) +
          r.violations.reduce((n, x) => n + x.nodes.length, 0) +
          r.incomplete.reduce((n, x) => n + x.nodes.length, 0),
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 2).map((n) => String(n.target)),
        })),
      }))
      .catch((e) => ({ ran: false, reason: String((e && e.message) || e) }));
    return Promise.race([
      run,
      new Promise((res) => setTimeout(() => res({ ran: false, reason: "axe-timeout" }), ${timeoutMs})),
    ]);
  })()`;
}

const AXE_EXPRESSION = axeExpression(AXE_TAGS, AXE_RULES_OFF, AXE_TIMEOUT_MS);

/**
 * A step where axe never ran is NOT a step with no violations, and the whole
 * value of this instrument dies the moment those two are conflated — a broken
 * injection would otherwise turn every page green at once. The verdict keeps
 * them as different shapes so no caller can read one as the other.
 */
export function axeVerdict(result) {
  if (!result || result.ran !== true)
    return {
      ran: false,
      reason: (result && result.reason) || "no-result",
      nodesChecked: 0,
      rulesEvaluated: 0,
      violations: [],
    };
  return {
    ran: true,
    reason: null,
    nodesChecked: result.nodesChecked ?? 0,
    rulesEvaluated: result.rulesEvaluated ?? 0,
    violations: result.violations ?? [],
  };
}

/** The mirror of `stepsIncomplete` and `writesIncomplete`, for the a11y pass. */
export function axeIncomplete(ran, probed) {
  return ran < probed;
}

/**
 * axe-core reaches this repo through jest-axe, its only declared dependency on
 * it. Resolving by name from jest-axe's own root keeps the pnpm store path out
 * of this file — a hardcoded `.pnpm/axe-core@x.y.z` would rot on the next
 * install and the run would silently lose its a11y pass.
 */
export function axeSourcePath() {
  const here = createRequire(import.meta.url);
  const fromJestAxe = createRequire(here.resolve("jest-axe/package.json"));
  return fromJestAxe.resolve("axe-core/axe.min.js");
}

/**
 * The mirror of `stepsIncomplete`, for writes. A run whose write never landed
 * has not proved the product saves anything, and must not exit clean just
 * because every read rendered.
 */
export function writesIncomplete(asserted, planned) {
  return asserted < planned;
}

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
 * The probe reads a colour only when it can parse it. Tailwind 4 serialises its
 * palette as `oklch()` and some tokens as `color(srgb …)`, neither of which this
 * parser reads — and treating an unreadable ground as "keep looking" is what
 * produced a white-on-near-white 1.05:1 "failure" on a red button.
 */
export function parseCssRgb(value) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value || "");
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
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
      /**
       * An unparseable background colour is unmeasurable, not absent. Tailwind 4
       * emits its palette as oklch(), which this parser does not read, so
       * walking past it reported the page ground behind a red button and scored
       * its white label as 1.05:1 — invisible text that no shipped page has.
       */
      const raw = style.backgroundColor;
      if (raw && raw !== "transparent") {
        const c = rgb(raw);
        if (!c) return null;
        if (c.a >= 0.95) return hex(c);
      }
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
  assert("an rgb() ground parses", parseCssRgb("rgb(248, 250, 252)")?.r === 248);
  assert("a translucent ground keeps its alpha", parseCssRgb("rgba(0, 0, 0, 0)")?.a === 0);
  assert(
    "an oklch() ground does not parse, so it must be treated as unmeasurable",
    parseCssRgb("oklch(0.637 0.237 25.331)") === null,
  );
  assert(
    "a color(srgb ...) ground does not parse either",
    parseCssRgb("color(srgb 0.2 0.3 0.4)") === null,
  );
  assert(
    "BITE — the probe returns null on an unparseable ground instead of walking past it",
    /if \(!c\) return null;/.test(PAGE_PROBE),
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

  assert("there is at least one write journey", WRITE_JOURNEYS.length >= 1);
  assert(
    "every write journey declares an absent check, actions and a present check",
    WRITE_JOURNEYS.every(
      (w) =>
        typeof w.absent === "string" &&
        typeof w.present === "string" &&
        Array.isArray(w.actions) &&
        w.actions.length > 0 &&
        w.actions.every((a) => typeof a.label === "string" && typeof a.expression === "string"),
    ),
  );
  assert(
    "BITE — both checks must name the subject, so neither can be a constant true",
    WRITE_JOURNEYS.every((w) => w.absent.includes("{subject}") && w.present.includes("{subject}")),
  );
  assert(
    "a write asserts persistence by reloading through a different route, not from client state",
    WRITE_JOURNEYS.every((w) => typeof w.reloadVia === "string" && w.reloadVia !== w.route),
  );
  assert(
    "every write route is one the read sweep also reaches, so a write is never measured on an unvisited page",
    WRITE_JOURNEYS.every((w) => allSteps.includes(w.route)),
  );
  assert(
    "the subject substitution replaces every occurrence",
    substituteSubject("a{subject}b{subject}", "X") === "aXbX",
  );
  assert(
    "BITE — substitution leaves no literal {subject} behind for the page to match on",
    !substituteSubject('document.body.innerText.includes("{subject}")', "X").includes("{subject}"),
  );
  assert("a run that asserted every planned write is complete", writesIncomplete(1, 1) === false);
  assert(
    "BITE — a run whose write never landed is incomplete, not a clean read-only run",
    writesIncomplete(0, 1),
  );
  assert(
    "the writes span four distinct modules, so a green run is not one create dialog four times",
    new Set(WRITE_JOURNEYS.map((w) => w.route.split("/")[1])).size >= 4,
  );
  assert(
    "no two write journeys write on the same route",
    new Set(WRITE_JOURNEYS.map((w) => w.route)).size === WRITE_JOURNEYS.length,
  );
  assert(
    "every write subject is unique to its journey, so one row cannot satisfy two of them",
    new Set(WRITE_JOURNEYS.map((w) => w.name)).size === WRITE_JOURNEYS.length,
  );
  assert(
    "a controlled field is set through React's own value setter, never by assignment",
    /HTMLInputElement\.prototype/.test(setFieldValue("#x", '"y"')) &&
      /new Event\("input", \{ bubbles: true \}\)/.test(setFieldValue("#x", '"y"')),
  );
  assert(
    "BITE — setting a field reports whether the value STUCK, not whether it was attempted",
    /return field\.value === value;/.test(setFieldValue("#x", '"y"')),
  );
  assert(
    "clicking by name matches the whole accessible name, never a substring",
    /named\(el\) === "Save"/.test(clickByName("Save")),
  );
  assert(
    "a scoped click looks only inside its own overlay",
    clickByName("Add", 'div[role="alertdialog"]').includes(
      'document.querySelector("div[role=\\"alertdialog\\"]")',
    ),
  );

  const axeSample = {
    ran: true,
    rulesEvaluated: 90,
    nodesChecked: 640,
    violations: [{ id: "aria-valid-attr-value", impact: "critical", nodes: 2, targets: ["#a"] }],
  };
  assert("an axe result that ran reports its violations", axeVerdict(axeSample).violations.length === 1);
  assert(
    "an axe result that ran carries a denominator, so a clean page is a measured page",
    axeVerdict(axeSample).nodesChecked === 640 && axeVerdict(axeSample).rulesEvaluated === 90,
  );
  assert(
    "BITE — a step where axe never ran is not a step with zero violations",
    axeVerdict({ ran: false, reason: "axe-not-injected" }).ran === false &&
      axeVerdict(undefined).ran === false,
  );
  assert(
    "BITE — an axe pass that ran on fewer steps than were probed makes the run incomplete",
    axeIncomplete(62, 63) && axeIncomplete(63, 63) === false,
  );
  assert(
    "the axe expression cannot resolve to a violation-free result when axe is absent",
    AXE_EXPRESSION.includes('reason: "axe-not-injected"') &&
      AXE_EXPRESSION.includes('reason: "axe-timeout"'),
  );
  assert(
    "axe judges the WCAG A and AA rule sets, not a hand-picked subset",
    AXE_TAGS.includes("wcag2a") && AXE_TAGS.includes("wcag2aa") && AXE_TAGS.includes("wcag21aa"),
  );
  assert(
    "contrast is measured once, by this harness, not twice under two methods",
    AXE_RULES_OFF.includes("color-contrast") &&
      AXE_EXPRESSION.includes('rules[id] = { enabled: false }'),
  );
  /**
   * Without this the a11y pass degrades to nothing the day the dependency
   * moves: every step records `axe-not-injected`, and a reader skimming the
   * finding counts sees an unfamiliar kind rather than a missing instrument.
   */
  let axePath = null;
  try {
    axePath = axeSourcePath();
  } catch {
    axePath = null;
  }
  assert(
    "axe-core resolves on disk, so the run can never quietly ship without its a11y pass",
    typeof axePath === "string" && existsSync(axePath) && readFileSync(axePath, "utf8").length > 100000,
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
  /**
   * The app calls the API from the browser, so the API's CORS allowlist has to
   * name the port the app is served on. A harness told to run on a port the
   * deployment's allowlist does not carry would otherwise measure the app's
   * error boundary and call it a UX finding. This turns the check off in the
   * BROWSER only, and it is recorded in the results and printed loudly, because
   * a run that took it is not evidence that CORS is configured.
   */
  const allowCrossOriginApi = argv.includes("--allow-cross-origin-api");

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
      ...(allowCrossOriginApi ? ["--disable-web-security"] : []),
    ],
    { stdio: "pipe" },
  );

  const started = Date.now();
  const log = (m) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${m}`);
  const findings = [];
  const steps = [];
  const writes = [];
  const tokens = {};
  let axeStepsRun = 0;
  let axeNodesChecked = 0;

  /**
   * Read before the browser is driven anywhere. A missing axe-core must stop
   * the run, not turn every page green — the whole point of the pass is that
   * its absence is louder than its silence.
   */
  const axeSource = readFileSync(axeSourcePath(), "utf8");

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
    /**
     * On EVERY new document, not once: the run navigates ~70 times and an
     * injection made only into the first page would leave every later step
     * reporting `axe-not-injected`.
     */
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: axeSource });
    log(`browser ${browserPath} · base ${baseUrl} · widths ${widths.join("/")}`);
    if (allowCrossOriginApi)
      log("⚠  --allow-cross-origin-api: the browser's CORS check is OFF — this run is not evidence that CORS is configured");

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

          const axeRaw = await cdp.send("Runtime.evaluate", {
            expression: AXE_EXPRESSION,
            returnByValue: true,
            awaitPromise: true,
          });
          const axe = axeVerdict(axeRaw.result?.value);
          if (axe.ran) {
            axeStepsRun += 1;
            axeNodesChecked += axe.nodesChecked;
          }

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
            axeRan: axe.ran,
            axeNodesChecked: axe.nodesChecked,
            axeRulesEvaluated: axe.rulesEvaluated,
            axeViolations: axe.violations.length,
          });

          if (!axe.ran)
            findings.push({ width, journey: journey.name, route, kind: "axe-not-run", reason: axe.reason });
          for (const v of axe.violations)
            findings.push({
              width,
              journey: journey.name,
              route,
              kind: `axe:${v.id}`,
              impact: v.impact,
              nodes: v.nodes,
              targets: v.targets,
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

    /**
     * Writes run once, at the last width the run used — a mutation is not a
     * layout question, and writing the same row three times would pollute the
     * environment for no extra evidence.
     */
    const evaluate = async (expression) => {
      const r = await cdp.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: false,
      });
      return r.result?.value;
    };
    for (const write of WRITE_JOURNEYS) {
      const expanded = expandStep(write.route, tokens);
      if (expanded.path === null) {
        findings.push({ journey: write.name, route: write.route, kind: "write-not-reached", unresolved: expanded.missing });
        continue;
      }
      const subject = `journey-write-${Date.now()}-${randomBytes(3).toString("hex")}`;
      const sub = (expression) => substituteSubject(expression, subject);
      const record = { name: write.name, route: expanded.path, subject, asserted: false };

      await cdp.send("Page.navigate", { url: `${baseUrl}${expanded.path}` });
      await sleep(settleMs);
      if ((await evaluate(sub(write.absent))) !== true) {
        findings.push({ journey: write.name, route: expanded.path, kind: "write-subject-already-present", subject });
        writes.push(record);
        continue;
      }

      let failedAt = null;
      for (const action of write.actions) {
        if ((await evaluate(sub(action.expression))) !== true) {
          failedAt = action.label;
          break;
        }
        await sleep(1200);
      }
      if (failedAt !== null) {
        findings.push({ journey: write.name, route: expanded.path, kind: "write-step-failed", step: failedAt, subject });
        writes.push(record);
        continue;
      }
      await sleep(settleMs);

      /**
       * Away and back, not a re-render. An assertion made without leaving the
       * page passes on the optimistic cache entry the mutation wrote locally,
       * which is exactly the vacuity a "write journey" exists to rule out.
       */
      await cdp.send("Page.navigate", { url: `${baseUrl}${write.reloadVia}` });
      await sleep(settleMs);
      await cdp.send("Page.navigate", { url: `${baseUrl}${expanded.path}` });
      await sleep(settleMs);
      const persisted = (await evaluate(sub(write.present))) === true;
      record.asserted = persisted;
      writes.push(record);
      if (!persisted)
        findings.push({ journey: write.name, route: expanded.path, kind: "write-not-persisted", subject });
      log(`write ${write.name} · ${persisted ? "PERSISTED" : "NOT PERSISTED"} · ${subject}`);
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
    crossOriginApiAllowed: allowCrossOriginApi,
    writesPlanned: WRITE_JOURNEYS.length,
    writesAsserted: writes.filter((w) => w.asserted).length,
    writes,
    axeTags: AXE_TAGS,
    axeRulesDisabled: AXE_RULES_OFF,
    axeStepsProbed: steps.length,
    axeStepsRun,
    axeNodesChecked,
    axeViolations: findings.filter((f) => String(f.kind).startsWith("axe:")).length,
    findings,
    steps,
  };
  writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);

  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  const writesAsserted = writes.filter((w) => w.asserted).length;
  log(
    `${steps.length} of ${planned} planned steps run · ` +
      `${writesAsserted} of ${WRITE_JOURNEYS.length} writes asserted · ` +
      `axe ran on ${axeStepsRun} of ${steps.length} steps over ${axeNodesChecked} nodes · ` +
      `${findings.length} findings`,
  );
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
  /**
   * And the same refusal for writes. A sweep that rendered every page but saved
   * nothing has not shown the product works; it has shown the product loads.
   */
  if (writesIncomplete(writesAsserted, WRITE_JOURNEYS.length)) {
    console.error(
      `✖  only ${writesAsserted} of ${WRITE_JOURNEYS.length} write journeys were asserted — ` +
        "this run proved reads render, not that a write survives a reload",
    );
    process.exit(1);
  }
  /**
   * And the same refusal for the a11y pass. A step axe never judged reports no
   * violations, which is indistinguishable from a clean page unless the run
   * says so out loud.
   */
  if (axeIncomplete(axeStepsRun, steps.length)) {
    console.error(
      `✖  axe ran on only ${axeStepsRun} of ${steps.length} probed steps — ` +
        "the steps it missed are unmeasured, not clean",
    );
    process.exit(1);
  }
  process.exit(findings.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
