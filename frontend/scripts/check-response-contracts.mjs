#!/usr/bin/env node
/**
 * check-response-contracts — no NEW unparsed endpoint, and no contracted route
 * loses its contract.
 *
 * THE DEFECT THIS EXISTS TO STOP. `apiClient.get<T>(...)` is a CAST, not a
 * validation: the body is asserted to be `T` and never checked, so a backend
 * that renames, moves or stops sending a field is accepted silently and shows
 * up later as an undefined the screen renders as "none" or "Unknown". Both
 * repositories typecheck clean throughout, because nothing in the type system
 * ever sees the wire.
 *
 * It has shipped twice in this release. The backend emitted
 * `members[].membership.user` while the client declared `ChannelMember.user`
 * flat — Favourites was permanently empty and the channel-admin controls never
 * appeared. The same lie in huddles left `membership.columns` at `{}`, so
 * `userId` was never selected, every tile read "Unknown", `isInHuddle` was
 * permanently false and the WebRTC mesh had no peer ids. A runtime contract on
 * either route would have failed on the first request.
 *
 * WHY A RATCHET AND NOT A REQUIREMENT. When this gate was written,
 * `contracts/openapi.json` carried **1 response schema across 3,613 operations**
 * — measured, not assumed — so a contract could not be generated, and each one
 * had to be derived by hand from the backend's Drizzle columns and service
 * projection. That premise CHANGED on 2026-09-07: the backend now declares a
 * response schema on all 3,666 operations and the vendored document carries
 * them, so a contract can be checked against the wire shape rather than guessed
 * at. The ratchet stays because the per-route frontend work is still unfinished,
 * not because the contract is still unknowable. Freeze the debt, name it, and
 * make the NEXT unparsed endpoint fail.
 *
 * WHAT THIS GATE DOES NOT CLAIM. It certifies that a call site PASSES a
 * contract, not that the contract is right. A contract copied from a wrong
 * frontend type passes this gate and catches nothing. Only reading the backend
 * column makes a contract true.
 *
 * SCAN DEFINITION — state this whenever you quote a number from this gate.
 * Call sites of `apiClient.get|post|put|patch|delete|upload`, `serverGet`,
 * `publicGet` and `publicGetNoStore` under `hooks/ app/ features/ components/
 * lib/` (non-test). A call is VALIDATED when a contract argument is present in
 * the position that seam function takes one. This is a WIDER tree than
 * `lib/api-contract-coverage.test.ts` scanned before this gate existed — that
 * one read `hooks/` only and was blind to the 161 seam calls elsewhere,
 * including the three SSR prefetch reads of routes on its own risk list.
 *
 * Usage:
 *   node scripts/check-response-contracts.mjs
 *   node scripts/check-response-contracts.mjs --list       # print the residue
 *   node scripts/check-response-contracts.mjs --json       # machine output
 *   node scripts/check-response-contracts.mjs --self-test
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const SCAN_DIRS = ["hooks", "app", "features", "components", "lib"];

/** Where the contract sits in each seam function's argument list. */
const SEAM_METHODS = { get: 3, post: 3, put: 3, patch: 3, delete: 3, upload: 2 };

/**
 * `drainChannelPages` is a seam function, not a caller of one.
 *
 * It wraps `apiClient.get` in a cursor loop and takes the path as a PARAMETER,
 * so until it was listed here the route it reads was invisible to every
 * route-based rule in this gate and in `check:gated-reads` — and the route it
 * reads is `/chat/channels`, the exact call site the `members[].membership.user`
 * defect shipped through. The wrapper's own inner `apiClient.get(path, …)` is
 * still unresolvable and still counted as such; what this entry recovers is the
 * three call sites above it, where the path IS a literal. A wrapper that takes a
 * path and a contract belongs on this list; one that hides the path in a
 * module-local constant belongs in UNRESOLVED_ROUTE_FILES instead.
 */
const SEAM_FUNCTIONS = {
  serverGet: 1,
  publicGet: 2,
  publicGetNoStore: 2,
  drainChannelPages: 2,
};

/** Every seam function that READS. A contracted route must not be read uncontracted. */
const READ_METHODS = new Set([
  "get",
  "serverGet",
  "publicGet",
  "publicGetNoStore",
  "drainChannelPages",
]);

/**
 * The ratchet. MEASURED against the tree this file is committed with — run
 * `--list` and read the printed numbers, never transcribe them from a report.
 *
 * `unvalidatedCalls` is the one that bites on new work: add a seam call without
 * a contract and this gate fails. The fix is to write the contract, having read
 * the backend column first. Raising the number is allowed and visible, but it
 * has to carry a reason in the ticket — a baseline raised silently is how a
 * ratchet becomes a comment.
 */
const BASELINE = {
  // 2596 -> 2594 on 2026-09-03. Two contracts landed: the payroll policy preview and the
  // template preview beside it. Lowered to the measured value rather than banked as headroom.
  // 2594 -> 223 on 2026-09-07. The contract sweep parsed 2,371 of these seams; at 2594 the
  // ratchet could not bite, because every new unparsed call still fit inside the slack.
  // 182 -> 26 on 2026-09-08. The residue is now 25 CRM/Inventory calls, which were out of
  // scope for that pass, plus the upload in `components/import-export/import-export-grid.tsx`,
  // whose endpoint is a caller-supplied parameter that no `ImportEntity` in the repo sets —
  // there is no backend handler to derive a contract from. Everything else in `hooks/`, `lib/`,
  // `components/`, `app/` and `features/` now parses. Lowered to the measured value.
  // 26 -> 25 on 2026-09-08. That upload was not missing a contract, it was unreachable: no
  // consumer anywhere set `importEndpoint`, and all three consuming pages (HR, Payroll, CRM
  // settings) set `supported.import: false`, so the button never rendered and the call never
  // fired. HR imports through its own ImportWizardSheet. The dead path was removed rather than
  // contracted. The whole remaining 25 are CRM and Inventory, both outside release scope, so
  // the in-scope seam is 100% parsed.
  unvalidatedCalls: 0,
  minScannedCalls: 2400,
};

/**
 * Files holding a seam call whose route the scanner cannot resolve, because the
 * path is a parameter or a module-local constant rather than a literal.
 *
 * These are NOT known to be safe. They are invisible to every route-based rule
 * in this gate and in `check:gated-reads` — `hooks/api/chat-core-read.ts` is
 * `drainChannelPages(path)`, which is the exact call site the `members[]`
 * defect above shipped through, and no route rule can see it. A NEW one fails;
 * a file that no longer has one fails as a stale entry, so this cannot rot into
 * an allowlist nobody re-reads.
 */
const UNRESOLVED_ROUTE_FILES = new Map([
  ["hooks/api/chat-core-read.ts", 1],
  ["hooks/common/use-file-url.ts", 1],
]);

/**
 * Every route whose body decides what someone may do, who they are, what they
 * are owed or what they may see. A contract violation on one of these is a
 * lockout, a wrong number or a leak — never a cosmetic gap. A route joins this
 * list when its contract lands and can only leave deliberately.
 */
const CONTRACTED_ROUTES = [
  // money — platform billing
  "/billing",
  "/billing/plans",
  "/billing/profile",
  "/billing/seats",
  "/billing/coupons/validate",
  "/billing/entitlements",
  "/billing/ai-credits",
  "/billing/ai-credits/transactions",
  "/billing/ai-credits/usage",
  // money — customer invoicing
  "/invoices",
  "/invoices/:p",
  "/invoices/stats",
  // money — accounting
  "/accounting/reports/tax-summary",
  // money — payroll
  "/payroll/runs",
  "/payroll/runs/:p",
  "/payroll/reports/summary",
  "/payroll/me/payslips",
  "/payroll/me/bank",
  "/payroll/me/salary-structure",
  "/payroll/me/loans",
  "/payroll/me/reimbursements",
  // the two setup previews. They look alike and answer different things: the TEMPLATE preview
  // takes an annualCtc and simulates a payslip, the POLICY preview takes none and can only
  // describe a component. One client type over both is how every amount on the setup review step
  // rendered as an em dash.
  "/payroll/policies/preview",
  "/payroll/templates/:p/preview",
  // permissions and tenancy
  "/me/access",
  "/me/org-display",
  "/rbac/permissions",
  "/rbac/discovery/grantable",
  "/rbac/discovery/members",
  "/module-access/:p/catalog",
  "/module-access/:p/me/permissions",
  "/organization",
  "/organization/switch",
  "/organization/members",
  "/roles",
  "/roles/:p",
  "/roles/simulate/candidates",
  "/roles/simulate/:p",
  "/access/org-modules",
  "/access/user-module-access/:p",
  // PII
  "/directory/people",
  "/directory/people/:p",
  "/directory/workers",
  "/users/stats",
  // identity on a screen — every route below carries a PERSON whose id the UI
  // compares against the viewer's own (`isOwn`, `isFollowing`, `isWatching`,
  // `isInHuddle`). A comparison that silently collapses to false renders a
  // plausible screen rather than an error, which is why all seven of this
  // release's shape-drift defects survived review. These are the routes those
  // defects shipped through.
  "/chat/channels",
  "/chat/channels/archived",
  "/chat/channels/public",
  "/chat/channels/:p/huddle",
  "/chat/channels/:p/huddle/start",
  "/chat/channels/:p/messages",
  "/chat/channels/:p/messages/poll",
  "/support/:p/watchers",
  "/build/:p/tickets/:p/watchers",
];

const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

function sourceFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (TEST_FILE_RE.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/**
 * A literal path, or a template with every interpolation collapsed to `:p`, so
 * one detail route counts once. A query string is stripped — `/x?a=1` and
 * `/x?a=2` are the same route. Anything else is unresolvable and says so.
 */
export function routeOf(node) {
  if (node === undefined) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text.split("?")[0] ?? null;
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) text += `:p${span.literal.text}`;
    return text.split("?")[0] ?? null;
  }
  return null;
}

export function seamOf(node, src) {
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(src) === "apiClient"
  ) {
    const method = node.expression.name.getText(src);
    const index = SEAM_METHODS[method];
    return index === undefined ? null : { method, index };
  }
  if (ts.isIdentifier(node.expression)) {
    const method = node.expression.getText(src);
    const index = SEAM_FUNCTIONS[method];
    return index === undefined ? null : { method, index };
  }
  return null;
}

/**
 * A LITERAL `undefined` in the contract slot is not a contract.
 *
 * `apiClient.delete(path, undefined, undefined, undefined)` filled the slot, so
 * an arity-only test counted it as validated while `applyContract` took the
 * unchecked branch — six timesheets and payroll deletes read as parsed and
 * validated nothing. `void 0` is the same value written differently.
 */
export function isContractArgument(node) {
  if (node === undefined) return false;
  if (ts.isIdentifier(node) && node.text === "undefined") return false;
  if (ts.isVoidExpression(node)) return false;
  return true;
}

export function scanSource(fileName, text, label = fileName) {
  const src = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.ESNext,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const seam = seamOf(node, src);
      if (seam !== null) {
        const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
        calls.push({
          file: label,
          line: line + 1,
          method: seam.method,
          route: routeOf(node.arguments[0]),
          validated: isContractArgument(node.arguments[seam.index]),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return calls;
}

function scanTree() {
  const calls = [];
  for (const dir of SCAN_DIRS)
    for (const file of sourceFiles(join(ROOT, dir)))
      calls.push(
        ...scanSource(file, readFileSync(file, "utf8"), relative(ROOT, file).replaceAll("\\", "/")),
      );
  return calls;
}

export function evaluate(calls, baseline = BASELINE, unresolved = UNRESOLVED_ROUTE_FILES, contracted = CONTRACTED_ROUTES) {
  const validated = calls.filter((c) => c.validated);
  const unvalidated = calls.filter((c) => !c.validated);
  const validatedRoutes = new Set(
    validated.filter((c) => c.route !== null).map((c) => c.route),
  );

  const missingContract = contracted.filter((r) => !validatedRoutes.has(r));

  const contractedSet = new Set(contracted);
  const leaks = unvalidated
    .filter((c) => c.route !== null && contractedSet.has(c.route) && READ_METHODS.has(c.method))
    .map((c) => `${c.file}:${c.line} ${c.method} ${c.route}`);

  const unresolvedByFile = new Map();
  for (const c of calls.filter((x) => x.route === null))
    unresolvedByFile.set(c.file, (unresolvedByFile.get(c.file) ?? 0) + 1);

  const newUnresolved = [];
  for (const [file, count] of unresolvedByFile) {
    const allowed = unresolved.get(file);
    if (allowed === undefined) newUnresolved.push(`${file} (${count}, not on the list)`);
    else if (count > allowed) newUnresolved.push(`${file} (${count} > ${allowed})`);
  }
  const staleUnresolved = [...unresolved.keys()].filter(
    (file) => (unresolvedByFile.get(file) ?? 0) === 0,
  );

  return {
    scanned: calls.length,
    validated: validated.length,
    unvalidated: unvalidated.length,
    unresolvedSites: [...unresolvedByFile.values()].reduce((a, b) => a + b, 0),
    distinctRoutes: new Set(calls.map((c) => c.route).filter((r) => r !== null)).size,
    validatedRoutes: validatedRoutes.size,
    missingContract,
    leaks,
    newUnresolved,
    staleUnresolved,
    unresolvedByFile,
    baseline,
    failures: [
      calls.length < baseline.minScannedCalls
        ? `scan floor: ${calls.length} seam calls found, below the ${baseline.minScannedCalls} this tree is known to hold — the scanner is broken, not the tree`
        : null,
      unvalidated.length > baseline.unvalidatedCalls
        ? `NEW UNPARSED ENDPOINT: ${unvalidated.length} un-contracted seam calls, baseline ${baseline.unvalidatedCalls} (+${unvalidated.length - baseline.unvalidatedCalls}). Write the contract — read the backend column first — or raise the baseline with a reason in the ticket.`
        : null,
      missingContract.length > 0
        ? `contracted route lost its contract: ${missingContract.join(", ")}`
        : null,
      leaks.length > 0
        ? `contracted route read without its contract:\n    ${leaks.join("\n    ")}`
        : null,
      newUnresolved.length > 0
        ? `new unresolvable route — invisible to every route rule here and in check:gated-reads:\n    ${newUnresolved.join("\n    ")}`
        : null,
      staleUnresolved.length > 0
        ? `stale UNRESOLVED_ROUTE_FILES entry (resolve it or delete the line): ${staleUnresolved.join(", ")}`
        : null,
    ].filter((f) => f !== null),
  };
}

function fixture(name, lines) {
  return scanSource(name, lines.join("\n"), name);
}

function selfTest() {
  const checks = [];
  const assert = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    checks.push({ label, ok, actual, expected });
  };

  // (a) the contract argument is found only where one is really passed.
  assert(
    "contract argument detected per seam arity",
    fixture("a.ts", [
      'apiClient.get("/a", undefined, signal, aContract);',
      'apiClient.get("/b", undefined, signal);',
      'apiClient.post("/c", body, undefined, cContract);',
      'apiClient.post("/d", body);',
      'apiClient.upload("/e", form, eContract);',
      'apiClient.upload("/f", form);',
      'serverGet("/g", gContract);',
      'serverGet("/h");',
      'publicGet("/i", 60, iContract);',
      'publicGet("/j", 60);',
      'drainChannelPages("/k", signal, kContract);',
      'drainChannelPages("/l", signal);',
    ]).map((c) => `${c.route}:${c.validated}`),
    ["/a:true", "/b:false", "/c:true", "/d:false", "/e:true", "/f:false", "/g:true", "/h:false", "/i:true", "/j:false", "/k:true", "/l:false"],
  );

  // (a2) a literal `undefined` fills the slot but is not a contract.
  assert(
    "a literal undefined in the contract slot is not a contract",
    fixture("a2.ts", [
      'apiClient.delete("/a", undefined, undefined, undefined);',
      'apiClient.delete("/b", undefined, undefined, void 0);',
      'apiClient.delete("/c", undefined, undefined, cContract);',
    ]).map((c) => `${c.route}:${c.validated}`),
    ["/a:false", "/b:false", "/c:true"],
  );

  // (b) a nested generic does not hide the call, and a template route normalises.
  assert(
    "generic and template forms resolve",
    fixture("b.ts", [
      "apiClient.get<CursorPage<Thing>>(`/x/${id}/y`, undefined, signal);",
      'apiClient.get<{ enabled: boolean }>(`/z?${qs ? `a=${qs}` : ""}`, undefined, signal);',
    ]).map((c) => c.route),
    ["/x/:p/y", "/z"],
  );

  // (c) a variable path is unresolvable rather than silently skipped.
  assert(
    "a variable path is reported unresolvable",
    fixture("c.ts", ["apiClient.get(path, undefined, signal);"]).map((c) => c.route),
    [null],
  );

  // (d) a non-seam call is not counted.
  assert(
    "non-seam calls are ignored",
    fixture("d.ts", ['other.get("/a");', 'fetch("/b");', 'myGet("/c");']).length,
    0,
  );

  const base = { unvalidatedCalls: 1, minScannedCalls: 2 };
  const none = new Map();

  // (e) at baseline: green.
  assert(
    "at baseline the gate is green",
    evaluate(
      fixture("e.ts", ['apiClient.get("/p", undefined, signal, c);', 'apiClient.get("/q", undefined, signal);']),
      base, none, ["/p"],
    ).failures.length,
    0,
  );

  // (f) one more unparsed endpoint: red.
  const above = evaluate(
    fixture("f.ts", [
      'apiClient.get("/p", undefined, signal, c);',
      'apiClient.get("/q", undefined, signal);',
      'apiClient.get("/r", undefined, signal);',
    ]),
    base, none, ["/p"],
  );
  assert("a new unparsed endpoint fails", above.failures.length, 1);
  assert("and it says so", above.failures[0].startsWith("NEW UNPARSED ENDPOINT"), true);

  // (g) a contracted route losing its contract: red.
  assert(
    "a contracted route that lost its contract fails",
    evaluate(
      fixture("g.ts", ['apiClient.get("/p", undefined, signal);', 'apiClient.get("/q", undefined, signal);']),
      base, none, ["/p"],
    ).failures.some((f) => f.startsWith("contracted route lost its contract")),
    true,
  );

  // (h) a contracted route read uncontracted through serverGet: red.
  // This is the hole the hooks/-only, method==="get"-only guard could not see.
  assert(
    "an uncontracted serverGet on a contracted route fails",
    evaluate(
      fixture("h.ts", ['apiClient.get("/p", undefined, signal, c);', 'serverGet("/p?limit=20");']),
      { unvalidatedCalls: 9, minScannedCalls: 2 }, none, ["/p"],
    ).failures.some((f) => f.startsWith("contracted route read without its contract")),
    true,
  );

  // (i) a new unresolvable route: red.
  assert(
    "a new unresolvable route fails",
    evaluate(
      fixture("i.ts", ["apiClient.get(path, undefined, signal, c);", "apiClient.get(path2, undefined, signal, c);"]),
      { unvalidatedCalls: 9, minScannedCalls: 2 }, none, [],
    ).failures.some((f) => f.startsWith("new unresolvable route")),
    true,
  );

  // (j) a stale unresolved entry: red.
  assert(
    "a stale unresolvable entry fails",
    evaluate(
      fixture("j.ts", ['apiClient.get("/p", undefined, signal, c);', 'apiClient.get("/q", undefined, signal, c);']),
      { unvalidatedCalls: 9, minScannedCalls: 2 },
      new Map([["gone.ts", 1]]), [],
    ).failures.some((f) => f.startsWith("stale UNRESOLVED_ROUTE_FILES entry")),
    true,
  );

  // (k) a broken scan reads as broken, not as green.
  assert(
    "an empty scan fails the floor rather than passing",
    evaluate([], BASELINE, none, []).failures.some((f) => f.startsWith("scan floor")),
    true,
  );

  for (const c of checks)
    console.log(`${c.ok ? "ok  " : "FAIL"}  ${c.label}${c.ok ? "" : `\n        expected ${JSON.stringify(c.expected)}\n        actual   ${JSON.stringify(c.actual)}`}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} self-test assertions passed.`);
  return failed === 0 ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();

  const calls = scanTree();
  const result = evaluate(calls);

  if (args.includes("--json")) {
    process.stdout.write(
      JSON.stringify({
        scanned: result.scanned,
        validated: result.validated,
        unvalidated: result.unvalidated,
        unresolvedSites: result.unresolvedSites,
        distinctRoutes: result.distinctRoutes,
        validatedRoutes: result.validatedRoutes,
        contractedRoutes: CONTRACTED_ROUTES,
        missingContract: result.missingContract,
        leaks: result.leaks,
        baseline: BASELINE,
        calls,
      }),
    );
    return result.failures.length === 0 ? 0 : 1;
  }

  const pct = ((result.validated / result.scanned) * 100).toFixed(1);
  console.log("Runtime response contracts at the fetch seam\n");
  console.log(`  Seam calls scanned:        ${result.scanned}   (${SCAN_DIRS.join(" ")})`);
  console.log(`  Carrying a contract:       ${result.validated}   (${pct}%)`);
  console.log(`  Unparsed:                  ${result.unvalidated}   (baseline ${BASELINE.unvalidatedCalls})`);
  console.log(`  Distinct routes:           ${result.distinctRoutes}, of which ${result.validatedRoutes} are parsed somewhere`);
  console.log(`  Unresolvable route sites:  ${result.unresolvedSites} in ${result.unresolvedByFile.size} file(s)`);
  console.log(`  Risk-list routes held:     ${CONTRACTED_ROUTES.length}\n`);

  if (args.includes("--list")) {
    console.log("Unresolvable route sites (invisible to every route rule):");
    for (const [file, count] of [...result.unresolvedByFile].sort())
      console.log(`  ${file}  x${count}`);
    console.log("");
  }

  if (result.failures.length === 0) {
    console.log(
      `PASS: ${result.validated}/${result.scanned} parsed, unparsed at or below the recorded baseline.`,
    );
    const unparsedPct = result.scanned === 0
      ? "0"
      : (((result.scanned - result.validated) / result.scanned) * 100).toFixed(1);
    console.log(
      `NOTE: ${unparsedPct}% of the seam is still an unchecked cast. This gate freezes that debt; it does not retire it.`,
    );
    return 0;
  }
  for (const failure of result.failures) console.error(`FAIL: ${failure}`);
  return 1;
}

/**
 * `process.exit()` truncates a stdout write that is still pending, which a pipe
 * always makes it — `--json` came back cut at exactly 65536 bytes. Setting the
 * code and letting node drain is the fix.
 */
process.exitCode = main();
