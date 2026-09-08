#!/usr/bin/env node
/**
 * check-permission-route-binding — the permission a hook gates on must be the
 * permission the route it calls declares.
 *
 * THE DEFECT THIS EXISTS TO STOP
 * `useGitConnections` gated its read on `settings:manage` while both
 * `GET /settings/integrations/git` and the canonical
 * `GET /integrations/git/connections` declare `integrations:git:view`. The three
 * MUTATIONS in the same file gated correctly on `integrations:git:manage`, so a
 * user holding the git-integration grants but not `settings:manage` could
 * create, edit and delete connections while the list itself stayed empty.
 *
 * WHY check-route-access-contract.mjs CANNOT CATCH THIS
 *   1. TERRITORY — its SOURCE_DIRS are `components/layout/sidebar` and
 *      `lib/rbac/route-access`. It never reads `hooks/api/**`, which is where
 *      essentially every real gate lives.
 *   2. SEMANTICS — it asks "does this key EXIST anywhere in the contract",
 *      which is a ghost-key/spelling check. It never asks "is this the key
 *      bound to the route this hook actually calls". `settings:manage` is a
 *      perfectly real key, so it passed either way.
 * Both gates are kept: they answer different questions.
 *
 * WHY EVERY MISMATCH IS A REAL DIVERGENCE
 * `AccessService.scopeFor` is an EXACT map lookup
 * (backend `src/modules/access/access.service.ts:467` ->
 * `resolvePrincipalScope` -> `resolved.get(key) ?? "none"`). There is no
 * implication hierarchy: holding `x:manage` does NOT grant `x:view`. So when a
 * hook key differs from its route key, two populations are wrong at once:
 *   - a user holding the ROUTE key but not the HOOK key sends no request and
 *     sees an empty screen or a dead control, while the backend would allow it;
 *   - a user holding the HOOK key but not the ROUTE key sees a live control
 *     whose request the backend 403s.
 *
 * THE ORACLE IS THE BACKEND, NOT THE VENDORED CONTRACT
 * `contracts/openapi.json` is regenerated at quiesce and drifts in between —
 * measured on 2026-09-03: 23 routes present in the controllers and absent from
 * the contract, 9 the other way, and 18 operations where the two disagree on
 * the permission key. Four of those 18 are the git-connection routes above, so
 * a contract-only check would have reported the FIXED hook as broken. This gate
 * therefore reads `@RequirePermission` out of the backend controllers with the
 * TypeScript AST and uses the contract only as a second opinion, printing the
 * disagreements as contract staleness rather than as hook defects. With no
 * backend in the checkout it degrades through `reportBackendUnreachable`.
 *
 * SCAN DEFINITION — state this whenever you quote a number from this gate.
 * Non-test `.ts`/`.tsx` under hooks/, features/, components/, app/, lib/.
 * Two classes of binding, both AST-resolved (never regex — a regex over
 * template-literal paths both over- and under-counts, and an unreliable
 * denominator makes the whole check unfalsifiable):
 *   WRAPPER — `useGatedQuery(key, options)` / `useAuthorizedMutation(key, options)`.
 *             The key is argument 0 and the HTTP calls are in argument 1's
 *             subtree, so the binding is structural and sound.
 *   ENABLED — a raw `useQuery` / `useInfiniteQuery` / `useSuspenseQuery` whose
 *             `enabled` REFERENCES a local bound from `useCan(key)` or
 *             `usePermissionGate(key)`. Only that reference makes the key the
 *             gate on that read.
 *
 * WHY "ENABLED" AND NOT "ANY useCan IN THE FUNCTION"
 * A lexical binding — one `useCan` anywhere in the function, applied to every
 * request in it — is not sound, and it was measurably wrong here.
 * `AssetReturnsPage` reads `const isAdmin = useCan("hr:employees:manage")` for
 * rendering only, and its `useQuery` on `/hr/asset-returns` carries no
 * `enabled` at all. A lexical rule reports three mismatches against
 * `hr:assets:*` when the truth is that the read is not gated by anything. Those
 * reads are a real defect of a DIFFERENT kind — an ungated permissioned read in
 * `features/**`, which `check-gated-reads.mjs` does not see because it scans
 * only `hooks/api` — and `--list` prints them so they are not lost.
 * `useMutation` has no `enabled`, so a raw mutation is never bound here either:
 * `useAuthorizedMutation` is the only sound binding for a write.
 *
 * AMBIGUITY — the false positive this gate refuses to report
 * `useExpensePageData` reads `options.selfService ? "/me/expenses" :
 * "/hr/expenses/page-data"` and its `enabled` is
 * `selfService === true || (canExpenses && accountingEnabled)` — the gate is
 * bypassed on exactly the branch that takes the self-service route. A naive
 * binding calls that a mismatch (`hr:expenses:view` vs `self:expenses`) and it
 * is not one. So a call whose path argument is a conditional, or a read whose
 * `enabled` contains a `||`, is counted AMBIGUOUS and never reported as a
 * mismatch.
 *
 * WHAT THIS GATE DOES NOT SEE
 *   - a gate expressed as data (a permission read out of a config object or a
 *     registry) rather than as a literal at the call site;
 *   - a permission passed into a hook as a parameter by its caller;
 *   - a route reached through a helper more than two call hops away, or through
 *     an imported (not module-local) request factory;
 *   - whether any screen RENDERS a denied state — that is check-gated-reads'
 *     `reportGateConsumption`, and it is a different property;
 *   - a route whose real authorization is narrowed IN SERVICE below its
 *     declared key. Those routes look permissioned and are checked against the
 *     declared key only.
 *
 * Usage:
 *   node scripts/check-permission-route-binding.mjs
 *   node scripts/check-permission-route-binding.mjs --list
 *   node scripts/check-permission-route-binding.mjs --self-test
 */

import ts from "typescript";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACKEND_ROOT,
  backendAvailable,
  isExcludedScanDir,
  reportBackendUnreachable,
} from "./check-repo-paths.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const CONTRACT = join(ROOT, "contracts", "openapi.json");

const SCAN_DIRS = ["hooks", "features", "components", "app", "lib"];
const TEST_FILE_RE = /\.test\.|\.spec\.|__tests__|__mocks__/;

/**
 * Gating wrappers, ENUMERATED FROM SOURCE, not assumed. Each binds a
 * `PermissionKey` first argument to the request in its second:
 *   hooks/api/gated-query.ts:37        useGatedQuery(permission, options)
 *   hooks/api/authorized-mutation.ts:34 useAuthorizedMutation(permission, options)
 * `hooks/api/access.ts` exports `usePermissionGate`, `useCan` and `useScope`;
 * the first two are the SCOPE-class markers below. `useScope` is not a gate —
 * it answers WHICH ROWS, not WHETHER — so it never binds a route.
 * `lib/rbac/require-permission.ts` gates a server component, not a data call.
 */
const WRAPPERS = new Map([
  ["useGatedQuery", "read"],
  ["useAuthorizedMutation", "write"],
]);
const SCOPE_MARKERS = new Set(["usePermissionGate", "useCan"]);

/** `apiClient` verbs, from lib/api-client. `download`/`upload` are GET/POST. */
const CLIENT_METHOD = {
  get: "GET",
  download: "GET",
  post: "POST",
  upload: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
};

const BACKEND_METHOD_DECORATOR = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
};

/**
 * Anti-vacuity floors, adopted from check-route-access-contract.mjs, whose own
 * comment says it best: "A walk that resolves nothing would otherwise report a
 * clean tree, which is the failure mode these scans have had every time they
 * were wrong." Every number here was MEASURED against the tree this file is
 * committed with, then set well below it.
 *   backend routes 3,627 · wrapper sites 1,707 · scope sites 660
 *   bindings resolved to a route 1,698 (wrapper) + 649 (scope)
 */
const FLOORS = {
  backendRoutes: 3000,
  wrapperSites: 1200,
  scopeSites: 400,
  resolvedBindings: 1500,
};

/**
 * Out of release scope. Findings under these prefixes are PRINTED IN FULL and
 * do not fail, because CRM and Inventory are excluded from the 10/10 release —
 * an orchestrator decision, not this gate's. Nothing is hidden: the count and
 * every line appear in the OUT-OF-SCOPE block of a normal run.
 */
const OUT_OF_RELEASE_SCOPE = [
  { prefix: "hooks/api/crm", reason: "CRM is out of 10/10 release scope" },
  { prefix: "hooks/api/inventory", reason: "Inventory is out of 10/10 release scope" },
  { prefix: "hooks/api/inv-", reason: "Inventory is out of 10/10 release scope" },
  { prefix: "hooks/api/leads", reason: "CRM is out of 10/10 release scope" },
  { prefix: "features/crm", reason: "CRM is out of 10/10 release scope" },
  { prefix: "features/inventory", reason: "Inventory is out of 10/10 release scope" },
];

/**
 * Deliberate divergences. A mismatch is only tolerated with an entry here, and
 * the entry is a CLAIM ABOUT BOTH SIDES: it records the hook key AND the route
 * key it was reasoned about, so changing either end invalidates it rather than
 * silently widening. A stale entry — one matching no current finding — FAILS
 * the gate, so this list cannot rot into an allowlist nobody re-reads. A
 * `reason` under MIN_REASON_LENGTH characters FAILS, so "deliberate" or "TODO"
 * is not an entry. An exception list anyone can grow without justification is
 * the same vacuity in a new place.
 *
 * Key: "<file>::<hook>::<METHOD> <path>"
 */
const MIN_REASON_LENGTH = 60;

/**
 * Reads that call a PERMISSIONED route from a `useQuery` whose `enabled`
 * consults no permission at all. That is a different defect from a key
 * mismatch — the request is sent for every user, the backend 403s, and
 * TanStack reports the failure as `isPending: true, isFetching: false`,
 * which renders as a finished empty read. The screen says "none yet" to a
 * user who was actually refused.
 *
 * This list is a RATCHET, not an allowlist: each entry records the exact
 * number of such reads the file is permitted to carry. A new one in a listed
 * file fails the gate just as loudly as one in an unlisted file, and a file
 * that drops below its recorded count fails too so the number cannot rot
 * upward unnoticed.
 *
 * `check-gated-reads.mjs` asks a related question but cannot answer this one:
 * it walks `hooks/api` only, so every `features/**` read is invisible to it,
 * and it scores a hook "gated" if the enclosing block mentions
 * `useModuleEnabled` — a module toggle, which is org configuration and not a
 * permission. Both gaps are why it reported 0 while 48 of these existed.
 */
const UNGATED_HELD_BACK = new Map();

const DELIBERATE = new Map([
  [
    "hooks/api/accounting/expenses.ts::useTeamExpenses::GET /hr/expenses/page-data",
    {
      hookKey: "accounting:reimbursements:read",
      routeKey: "hr:expenses:view",
      reason:
        "The accounting reimbursement surface reads an HR-owned route. Loosening the hook to hr:expenses:view would put the accounting screen in front of Sales Representatives and Recruiters, who hold that key; tightening the route would take the HR expenses page away from them. Neither is a client fix — accounting needs its own endpoint, which is the accounting rewrite's territory (feat/accounting-module). Today only the org owner holds accounting:reimbursements:read and the owner also passes hr:expenses:view, so nothing is broken until a custom role is granted one and not the other.",
    },
  ],
  [
    "hooks/api/accounting/expenses.ts::usePendingForBatch::GET /hr/expenses/page-data",
    {
      hookKey: "accounting:reimbursements:manage",
      routeKey: "hr:expenses:view",
      reason:
        "Same cross-module read as useTeamExpenses: the reimbursement batch builder pulls pending rows from the HR expenses page-data route. The fix is an accounting-owned endpoint, not a client key change — see the useTeamExpenses entry above for the full reasoning and the population it affects.",
    },
  ],
  [
    "hooks/api/payroll/reports.ts::useExportPayrollReport::GET /payroll/reports/*",
    {
      hookKey: "payroll:reports:export",
      routeKey: "payroll:reports:view",
      reason:
        "The hook gates the CSV download on payroll:reports:export while the route DECLARES payroll:reports:view, and that gap is real but not a hole. Every /payroll/reports/* handler serves the on-screen report and its CSV from one route, so the class-level decorator can only declare the weaker key; each handler then calls assertExport() -> authorize(access, u, \"payroll:reports:export\") inside the format === \"csv\" branch (src/modules/payroll/insights/reports.controller.ts:47 and journal.controller.ts:49). A :view-only holder passing ?format=csv gets a 403 from the backend, proved in both directions on all 11 CSV routes by payroll-insights.controller.e2e-spec.ts. This check reads decorators, so it cannot see a conditional raise; the hook is correct and matches what the backend actually enforces.",
    },
  ],
  [
    "hooks/api/payroll/reports.ts::useExportJournal::GET /payroll/reports/journal",
    {
      hookKey: "payroll:reports:export",
      routeKey: "payroll:reports:view",
      reason:
        "Same conditional raise as useExportPayrollReport: GET /payroll/reports/journal declares payroll:reports:view for the on-screen journal and enforces payroll:reports:export in-handler for the CSV (src/modules/payroll/insights/journal.controller.ts:49). The hook naming payroll:reports:export therefore agrees with the backend, not with the decorator this check can read.",
    },
  ],
]);

// ─────────────────────────────────────────────────────────────────────────────
// Filesystem walk
// ─────────────────────────────────────────────────────────────────────────────

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (isExcludedScanDir(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, filter, out);
    else if (st.isFile() && filter(full)) out.push(full);
  }
  return out;
}

const isFrontendSource = (p) =>
  (extname(p) === ".ts" || extname(p) === ".tsx") && !TEST_FILE_RE.test(p);
const isBackendController = (p) => /\.controller\.ts$/.test(p) && !TEST_FILE_RE.test(p);

// ─────────────────────────────────────────────────────────────────────────────
// Shared AST helpers
// ─────────────────────────────────────────────────────────────────────────────

const sourceCache = new Map();
function parseFile(file, kind = ts.ScriptKind.TS) {
  if (sourceCache.has(file)) return sourceCache.get(file);
  const sf = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  sourceCache.set(file, sf);
  return sf;
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart()) .line + 1;
}

/** Module-level `const NAME = "literal";`, including `as const`. */
export function stringConstants(sf) {
  const consts = new Map();
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = ts.isAsExpression(n.initializer) ? n.initializer.expression : n.initializer;
      if (ts.isStringLiteralLike(init)) consts.set(n.name.text, init.text);
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  return consts;
}

function decoratorsOf(node) {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
  return decorators.map((d) => {
    const e = d.expression;
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression))
      return { name: e.expression.text, args: e.arguments };
    if (ts.isIdentifier(e)) return { name: e.text, args: [] };
    return { name: null, args: [] };
  });
}

/**
 * A path or key expressed as segments, with every unresolvable interpolation
 * collapsed to `*`. Balanced by construction: a nested template such as
 * `` `/talent-pools/${id}/members${qs ? `?${qs}` : ""}` `` is walked as a tree,
 * which is precisely what a regex gets wrong.
 *
 * Returns an ARRAY because a conditional yields more than one candidate, and a
 * caller that gets more than one must treat the binding as ambiguous.
 */
export function pathCandidates(node, consts) {
  if (node === undefined) return ["*"];
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isIdentifier(node)) return consts.has(node.text) ? [consts.get(node.text)] : ["*"];
  if (ts.isTemplateExpression(node)) {
    let outs = [node.head.text];
    for (const span of node.templateSpans) {
      const sub = pathCandidates(span.expression, consts);
      const next = [];
      for (const head of outs) for (const s of sub) next.push(head + s + span.literal.text);
      outs = next.slice(0, 4);
    }
    return outs;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = pathCandidates(node.left, consts);
    const right = pathCandidates(node.right, consts);
    const out = [];
    for (const a of left) for (const b of right) out.push(a + b);
    return out.slice(0, 4);
  }
  if (ts.isConditionalExpression(node))
    return [
      ...pathCandidates(node.whenTrue, consts),
      ...pathCandidates(node.whenFalse, consts),
    ].slice(0, 4);
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isNonNullExpression(node)
  )
    return pathCandidates(node.expression, consts);
  return ["*"];
}

/**
 * A raw path reduced to the shape the route index is keyed on.
 *
 * A `*` NOT preceded by `/` is a query tail or a string suffix, never a path
 * segment: a real interpolated segment always follows a slash. Leaving it in
 * makes the path match nothing, which scores as "unresolved" and hides the
 * binding — the same trap check-gated-reads records.
 */
export function normalizePath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  let s = raw.split("?")[0];
  s = s.replace(/([^/])\*+/g, "$1");
  s = s.replace(/\/+$/, "");
  return s === "" ? "/" : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Oracle 1 — the backend controllers
// ─────────────────────────────────────────────────────────────────────────────

function resolveRelativeImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = join(fromFile, "..", spec);
  for (const candidate of [`${base}.ts`, join(base, "index.ts")])
    if (existsSync(candidate)) return candidate;
  return null;
}

/**
 * A string constant by name, following relative imports and re-exports.
 * 231 of the backend's `@RequirePermission` decorators name a constant rather
 * than a literal (`@RequirePermission(REVIEW_PERMISSION)`), and a scan that
 * gave up on those would silently drop the routes they guard.
 */
function backendConstant(file, name, depth = 0) {
  if (depth > 4 || !existsSync(file)) return null;
  const sf = parseFile(file);
  const local = stringConstants(sf);
  if (local.has(name)) return local.get(name);
  for (const st of sf.statements) {
    if (
      ts.isImportDeclaration(st) &&
      st.importClause?.namedBindings &&
      ts.isNamedImports(st.importClause.namedBindings)
    ) {
      for (const el of st.importClause.namedBindings.elements) {
        if (el.name.text !== name) continue;
        const target = resolveRelativeImport(file, st.moduleSpecifier.text);
        if (target) return backendConstant(target, (el.propertyName ?? el.name).text, depth + 1);
      }
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
      const target = resolveRelativeImport(file, st.moduleSpecifier.text);
      if (!target) continue;
      if (!st.exportClause) {
        const found = backendConstant(target, name, depth + 1);
        if (found !== null) return found;
        continue;
      }
      if (ts.isNamedExports(st.exportClause))
        for (const el of st.exportClause.elements)
          if (el.name.text === name)
            return backendConstant(target, (el.propertyName ?? el.name).text, depth + 1);
    }
  }
  return null;
}

function decoratorString(node, file) {
  if (node === undefined) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node)) return backendConstant(file, node.text);
  if (ts.isAsExpression(node)) return decoratorString(node.expression, file);
  if (ts.isTemplateExpression(node)) {
    let out = node.head.text;
    for (const span of node.templateSpans) {
      const value = decoratorString(span.expression, file);
      out += (value ?? "*") + span.literal.text;
    }
    return out;
  }
  if (ts.isObjectLiteralExpression(node))
    for (const p of node.properties)
      if (ts.isPropertyAssignment(p) && p.name.getText().replace(/"/g, "") === "path")
        return decoratorString(p.initializer, file);
  return null;
}

/** `/hr/leaves/:leaveId` and `/hr/leaves/{leaveId}` both key as `/hr/leaves/*`. */
export function canonicalRoute(prefix, sub) {
  const joined = `/${[prefix, sub].filter((s) => s !== "" && s !== undefined && s !== null).join("/")}`;
  const collapsed = joined.replace(/\/+/g, "/");
  const wild = collapsed
    .split("/")
    .map((s) => (s.startsWith(":") || (s.startsWith("{") && s.endsWith("}")) ? "*" : s))
    .join("/");
  const trimmed = wild.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function buildBackendIndex(rootDir) {
  const routes = new Map();
  const stats = { controllers: 0, handlers: 0, unresolved: 0 };
  for (const file of walk(join(rootDir, "src"), isBackendController)) {
    const sf = parseFile(file);
    for (const st of sf.statements) {
      if (!ts.isClassDeclaration(st)) continue;
      const classDecorators = decoratorsOf(st);
      const controller = classDecorators.find((d) => d.name === "Controller");
      if (!controller) continue;
      stats.controllers++;
      const prefix = controller.args.length === 0 ? "" : decoratorString(controller.args[0], file);
      const classPermission = classDecorators.find((d) => d.name === "RequirePermission");
      const classKey = classPermission ? decoratorString(classPermission.args[0], file) : null;
      for (const member of st.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const memberDecorators = decoratorsOf(member);
        const verb = memberDecorators.find((d) => BACKEND_METHOD_DECORATOR[d.name]);
        if (!verb) continue;
        stats.handlers++;
        const sub = verb.args.length === 0 ? "" : decoratorString(verb.args[0], file);
        if (prefix === null || sub === null) {
          stats.unresolved++;
          continue;
        }
        const declared = memberDecorators.find((d) => d.name === "RequirePermission");
        const permission = declared ? decoratorString(declared.args[0], file) : classKey;
        if (declared && permission === null) {
          stats.unresolved++;
          continue;
        }
        const path = canonicalRoute(prefix, sub);
        routes.set(`${BACKEND_METHOD_DECORATOR[verb.name]} ${path}`, {
          permission,
          isPublic: memberDecorators.some((d) => d.name === "Public"),
          deprecated: memberDecorators.some((d) => d.name === "Deprecated"),
          file: relative(rootDir, file).replace(/\\/g, "/"),
          line: lineOf(sf, member),
        });
      }
    }
  }
  return { routes, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// Oracle 2 — the vendored contract (second opinion only)
// ─────────────────────────────────────────────────────────────────────────────

export function buildContractIndex(spec) {
  const routes = new Map();
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!op || typeof op !== "object") continue;
      const verb = method.toUpperCase();
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(verb)) continue;
      routes.set(`${verb} ${canonicalRoute("", path.replace(/^\//, ""))}`, {
        permission: typeof op["x-permission"] === "string" ? op["x-permission"] : null,
        exposure: typeof op["x-exposure"] === "string" ? op["x-exposure"] : null,
      });
    }
  }
  return routes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route resolution
// ─────────────────────────────────────────────────────────────────────────────

export function indexBySegments(routes) {
  const bySegments = new Map();
  for (const [key, value] of routes) {
    const [method, path] = key.split(" ");
    const segments = path.split("/").filter(Boolean);
    if (!bySegments.has(method)) bySegments.set(method, []);
    bySegments.get(method).push({ path, segments, value });
  }
  return bySegments;
}

/**
 * Resolve a literal path to one route. A `*` is an interpolated segment and
 * matches a route parameter OR a fixed sibling — but a LOOSE match is only
 * accepted when every candidate agrees on the declared permission, so a hook
 * can never be judged against an arbitrarily picked route.
 */
export function resolveRoute(bySegments, method, literal) {
  const segments = literal.split("/").filter(Boolean);
  const sameShape = (bySegments.get(method) ?? []).filter(
    (c) => c.segments.length === segments.length,
  );
  const exact = sameShape.filter((c) =>
    c.segments.every((cs, i) => (segments[i] === "*" ? cs === "*" : cs === "*" || cs === segments[i])),
  );
  if (exact.length > 0) {
    exact.sort(
      (a, b) => b.segments.filter((s) => s !== "*").length - a.segments.filter((s) => s !== "*").length,
    );
    return { route: exact[0], loose: false };
  }
  const loose = sameShape.filter((c) =>
    c.segments.every((cs, i) => cs === "*" || segments[i] === "*" || cs === segments[i]),
  );
  if (loose.length === 0) return null;
  const permissions = new Set(loose.map((c) => c.value.permission ?? null));
  if (permissions.size !== 1) return null;
  return { route: loose[0], loose: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontend scan
// ─────────────────────────────────────────────────────────────────────────────

/** Module-local functions and factories, so a one-hop helper stays resolvable. */
function localFunctions(sf) {
  const fns = new Map();
  const visit = (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.body) fns.set(n.name.text, n.body);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      if (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
        fns.set(n.name.text, n.initializer.body);
      else if (ts.isCallExpression(n.initializer)) fns.set(n.name.text, n.initializer);
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  return fns;
}

/**
 * Every HTTP call reachable from `scope`, with the method it uses.
 *
 * `ambiguous` is set when a single call site produced more than one candidate
 * path — a conditional URL. The caller must not report such a site as a
 * mismatch: see AMBIGUITY in the header.
 */
export function callsIn(scope, consts, fns, depth = 0, seen = new Set()) {
  const found = [];
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const method =
        ts.isPropertyAccessExpression(callee) && CLIENT_METHOD[callee.name.text]
          ? CLIENT_METHOD[callee.name.text]
          : null;
      if (method !== null && n.arguments.length > 0) {
        const candidates = pathCandidates(n.arguments[0], consts)
          .map(normalizePath)
          .filter((p) => p !== null);
        for (const path of candidates)
          found.push({ method, path, ambiguous: candidates.length > 1 });
      } else if (depth < 2 && ts.isIdentifier(callee) && fns.has(callee.text) && !seen.has(callee.text)) {
        found.push(...callsIn(fns.get(callee.text), consts, fns, depth + 1, new Set([...seen, callee.text])));
      }
    }
    if (depth < 2 && ts.isSpreadAssignment(n)) {
      const e = n.expression;
      const name = ts.isCallExpression(e) && ts.isIdentifier(e.expression)
        ? e.expression.text
        : ts.isIdentifier(e)
          ? e.text
          : null;
      if (name !== null && fns.has(name) && !seen.has(name))
        found.push(...callsIn(fns.get(name), consts, fns, depth + 1, new Set([...seen, name])));
    }
    ts.forEachChild(n, visit);
  };
  visit(scope);
  const unique = new Map();
  for (const c of found) {
    const key = `${c.method} ${c.path}`;
    if (!unique.has(key)) unique.set(key, c);
    else if (c.ambiguous) unique.get(key).ambiguous = true;
  }
  return [...unique.values()];
}

function permissionLiteral(node, consts) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node) && consts.has(node.text)) return consts.get(node.text);
  return null;
}

function enclosingName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      current.parent &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    )
      return current.parent.name.text;
    current = current.parent;
  }
  return "(module scope)";
}

/** Raw read hooks. `useMutation` is absent on purpose: it has no `enabled`. */
const READ_HOOKS = new Set(["useQuery", "useInfiniteQuery", "useSuspenseQuery"]);

/**
 * Locals bound to a permission gate: `const can = useCan("k")`,
 * `const gate = usePermissionGate("k")`, and destructured forms.
 *
 * Collected PER ENCLOSING FUNCTION, never per file. A file-wide map was
 * measurably wrong: `hooks/api/accounting/expenses.ts` declares `const can =
 * useCan(...)` in five different hooks with five different keys, and a
 * last-writer-wins map attributed all of them to whichever hook parsed last —
 * which reported `useTeamExpenses` as gating on `accounting:banking:read` when
 * it gates on `accounting:reimbursements:read`. A wrong key in the finding is
 * worse than no finding.
 */
function gateLocalsIn(fnNode, consts) {
  const locals = new Map();
  const visit = (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      n.initializer &&
      ts.isCallExpression(n.initializer) &&
      ts.isIdentifier(n.initializer.expression) &&
      SCOPE_MARKERS.has(n.initializer.expression.text) &&
      n.initializer.arguments.length >= 1
    ) {
      const key = permissionLiteral(n.initializer.arguments[0], consts);
      if (key !== null) {
        if (ts.isIdentifier(n.name)) locals.set(n.name.text, key);
        else if (ts.isObjectBindingPattern(n.name))
          for (const el of n.name.elements)
            if (ts.isIdentifier(el.name)) locals.set(el.name.text, key);
      }
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(fnNode, visit);
  return locals;
}

/** The nearest enclosing function of a node, or the source file. */
function enclosingFunction(node) {
  let current = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current) ||
      ts.isMethodDeclaration(current)
    )
      return current;
    current = current.parent;
  }
  return node.getSourceFile();
}

/**
 * The `enabled` property of an options object literal, or undefined.
 *
 * The SHORTHAND form counts. `useProjectRoster` computes
 * `const enabled = canView && !!projectId && …` and passes `{ enabled }`, which
 * is a ShorthandPropertyAssignment, not a PropertyAssignment — reading only the
 * latter scored that read ungated when it is correctly gated on `build:view`.
 */
function enabledExpression(node) {
  if (!ts.isObjectLiteralExpression(node)) return undefined;
  for (const p of node.properties) {
    if (ts.isPropertyAssignment(p) && p.name.getText().replace(/"/g, "") === "enabled")
      return p.initializer;
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === "enabled") return p.name;
  }
  return undefined;
}

/**
 * Plain `const NAME = <expr>` initialisers in one function, so an `enabled`
 * that names an intermediate can still be traced to its gate.
 *
 * `useProjectRoster` writes `const enabled = canView && !!projectId && …` and
 * passes `enabled`. Stopping at the identifier scored that read UNGATED when
 * it is correctly gated on `build:view` — a false negative that would have put
 * a compliant hook on the ungated list.
 */
function plainLocalsIn(fnNode) {
  const aliases = new Map();
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer)
      aliases.set(n.name.text, n.initializer);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(fnNode, visit);
  return aliases;
}

/**
 * Keys an `enabled` expression consults, and whether any `||` sits on the path.
 * Local aliases are followed to a bounded depth; a cycle cannot loop because
 * every name is visited at most once.
 */
function keysGating(expr, locals, aliases, consts) {
  const keys = new Set();
  let disjunctive = false;
  const seen = new Set();
  const visit = (n, depth) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.BarBarToken
    )
      disjunctive = true;
    if (ts.isIdentifier(n)) {
      if (locals.has(n.text)) keys.add(locals.get(n.text));
      else if (depth < 3 && aliases.has(n.text) && !seen.has(n.text)) {
        seen.add(n.text);
        visit(aliases.get(n.text), depth + 1);
      }
    }
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      SCOPE_MARKERS.has(n.expression.text) &&
      n.arguments.length >= 1
    ) {
      const key = permissionLiteral(n.arguments[0], consts);
      if (key !== null) keys.add(key);
    }
    ts.forEachChild(n, (c) => visit(c, depth));
  };
  visit(expr, 0);
  return { keys, disjunctive };
}

export function scanFrontendFile(relPath, sf) {
  const consts = stringConstants(sf);
  const fns = localFunctions(sf);
  const wrapper = [];
  const scope = [];
  const ungated = [];

  const visitWrappers = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      WRAPPERS.has(n.expression.text) &&
      n.arguments.length >= 2
    ) {
      wrapper.push({
        file: relPath,
        line: lineOf(sf, n),
        hook: enclosingName(n),
        via: n.expression.text,
        kind: WRAPPERS.get(n.expression.text),
        permission: permissionLiteral(n.arguments[0], consts),
        calls: callsIn(n.arguments[1], consts, fns),
      });
    }
    ts.forEachChild(n, visitWrappers);
  };
  ts.forEachChild(sf, visitWrappers);

  const visitReads = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      READ_HOOKS.has(n.expression.text) &&
      n.arguments.length >= 1
    ) {
      const options = n.arguments[0];
      const calls = callsIn(options, consts, fns);
      if (calls.length > 0) {
        const enabled = enabledExpression(options);
        const fn = enclosingFunction(n);
        const gate =
          enabled === undefined
            ? { keys: new Set(), disjunctive: false }
            : keysGating(enabled, gateLocalsIn(fn, consts), plainLocalsIn(fn), consts);
        const keys = gate.keys;
        if (keys.size === 1) {
          const disjunctive = gate.disjunctive;
          scope.push({
            file: relPath,
            line: lineOf(sf, n),
            hook: enclosingName(n),
            via: `${n.expression.text} enabled:`,
            kind: "read",
            permission: [...keys][0],
            calls: calls.map((c) => ({ ...c, ambiguous: c.ambiguous || disjunctive })),
          });
        } else if (keys.size === 0) {
          ungated.push({
            file: relPath,
            line: lineOf(sf, n),
            hook: enclosingName(n),
            via: n.expression.text,
            calls,
          });
        }
      }
    }
    ts.forEachChild(n, visitReads);
  };
  ts.forEachChild(sf, visitReads);

  return { wrapper, scope, ungated };
}

function collectSites(rootDir) {
  const wrapper = [];
  const scope = [];
  const ungated = [];
  let scanned = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(rootDir, dir), isFrontendSource)) {
      const src = readFileSync(file, "utf8");
      if (!/useGatedQuery|useAuthorizedMutation|use(?:Infinite|Suspense)?Query\s*[<(]/.test(src)) continue;
      scanned++;
      const sf = parseFile(file, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const rel = relative(rootDir, file).replace(/\\/g, "/");
      const result = scanFrontendFile(rel, sf);
      wrapper.push(...result.wrapper);
      scope.push(...result.scope);
      ungated.push(...result.ungated);
    }
  }
  return { wrapper, scope, ungated, scanned };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

export function classify(sites, bySegments) {
  const tally = {
    matched: 0,
    ambiguous: 0,
    noPermission: 0,
    noPath: 0,
    unresolvedRoute: 0,
    unpermissionedRoute: 0,
  };
  const mismatches = [];
  const unresolved = [];
  for (const site of sites) {
    if (site.permission === null) {
      tally.noPermission++;
      continue;
    }
    if (site.calls.length === 0) {
      tally.noPath++;
      continue;
    }
    for (const call of site.calls) {
      const resolved = resolveRoute(bySegments, call.method, call.path);
      if (resolved === null) {
        tally.unresolvedRoute++;
        unresolved.push({ ...site, call: `${call.method} ${call.path}` });
        continue;
      }
      const declared = resolved.route.value.permission;
      if (declared === null) {
        tally.unpermissionedRoute++;
        continue;
      }
      if (declared === site.permission) {
        tally.matched++;
        continue;
      }
      if (call.ambiguous) {
        tally.ambiguous++;
        continue;
      }
      mismatches.push({
        ...site,
        call: `${call.method} ${call.path}`,
        routePath: resolved.route.path,
        loose: resolved.loose,
        declared,
        deprecatedAlias: resolved.route.value.deprecated === true,
        backend: `${resolved.route.value.file}:${resolved.route.value.line}`,
      });
    }
  }
  return { tally, mismatches, unresolved };
}

export function findingKey(m) {
  return `${m.file}::${m.hook}::${m.call}`;
}

export function outOfScopeReason(file) {
  const hit = OUT_OF_RELEASE_SCOPE.find((e) => file.startsWith(e.prefix));
  return hit ? hit.reason : null;
}

export function applyExceptions(mismatches, deliberate) {
  const failing = [];
  const excepted = [];
  const outOfScope = [];
  const malformed = [];
  const used = new Set();
  for (const m of mismatches) {
    const key = findingKey(m);
    const entry = deliberate.get(key);
    if (entry !== undefined) {
      used.add(key);
      if (
        typeof entry.reason !== "string" ||
        entry.reason.length < MIN_REASON_LENGTH ||
        entry.hookKey !== m.permission ||
        entry.routeKey !== m.declared
      )
        malformed.push({ key, entry, mismatch: m });
      else excepted.push({ ...m, reason: entry.reason });
      continue;
    }
    const scopeReason = outOfScopeReason(m.file);
    if (scopeReason !== null) {
      outOfScope.push({ ...m, reason: scopeReason });
      continue;
    }
    failing.push(m);
  }
  const stale = [...deliberate.keys()].filter((k) => !used.has(k));
  return { failing, excepted, outOfScope, malformed, stale };
}

export function floorFailures(counts) {
  const failures = [];
  if (counts.backendRoutes < FLOORS.backendRoutes)
    failures.push(
      `only ${counts.backendRoutes} backend routes indexed (floor ${FLOORS.backendRoutes})`,
    );
  if (counts.wrapperSites < FLOORS.wrapperSites)
    failures.push(`only ${counts.wrapperSites} wrapper gate sites found (floor ${FLOORS.wrapperSites})`);
  if (counts.scopeSites < FLOORS.scopeSites)
    failures.push(`only ${counts.scopeSites} scope gate sites found (floor ${FLOORS.scopeSites})`);
  if (counts.resolvedBindings < FLOORS.resolvedBindings)
    failures.push(
      `only ${counts.resolvedBindings} bindings resolved to a route (floor ${FLOORS.resolvedBindings})`,
    );
  return failures;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test
// ─────────────────────────────────────────────────────────────────────────────

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const routes = new Map([
    ["GET /support/tickets", { permission: "support:tickets:view", file: "a.ts", line: 1 }],
    ["GET /support/tickets/*", { permission: "support:tickets:view", file: "a.ts", line: 2 }],
    ["POST /support/tickets", { permission: "support:tickets:create", file: "a.ts", line: 3 }],
    ["GET /integrations/git/connections", { permission: "integrations:git:view", file: "g.ts", line: 1 }],
    ["GET /settings/integrations/git", { permission: "integrations:git:view", file: "g.ts", line: 2, deprecated: true }],
    ["GET /me/expenses", { permission: "self:expenses", file: "e.ts", line: 1 }],
    ["GET /hr/expenses/page-data", { permission: "hr:expenses:view", file: "e.ts", line: 2 }],
    ["POST /public/ping", { permission: null, file: "p.ts", line: 1 }],
  ]);
  const bySegments = indexBySegments(routes);

  const scan = (src, file = "hooks/api/x.ts") =>
    scanFrontendFile(file, ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));

  // (a) the real defect: a read gated on a key the route does not declare
  {
    const { wrapper } = scan(`export function useGitConnections() {
      return useGatedQuery("settings:manage", {
        queryKey: ["g"],
        queryFn: ({ signal }) => apiClient.get("/settings/integrations/git", undefined, signal),
      });
    }`);
    const { mismatches } = classify(wrapper, bySegments);
    assert(
      "(a) a read gated on settings:manage against an integrations:git:view route is a mismatch",
      mismatches.length === 1 &&
        mismatches[0].permission === "settings:manage" &&
        mismatches[0].declared === "integrations:git:view",
    );
    assert("(a) the deprecated alias is flagged as such", mismatches[0]?.deprecatedAlias === true);
  }

  // (b) the same hook gated correctly is silent — the gate must not fire on the fix
  {
    const { wrapper } = scan(`export function useGitConnections() {
      return useGatedQuery("integrations:git:view", {
        queryKey: ["g"],
        queryFn: ({ signal }) => apiClient.get("/settings/integrations/git", undefined, signal),
      });
    }`);
    const { tally, mismatches } = classify(wrapper, bySegments);
    assert("(b) the corrected hook produces no mismatch", mismatches.length === 0 && tally.matched === 1);
  }

  // (c) a template-literal path normalises to the route's parameter shape
  {
    const { wrapper } = scan(`export function useTicket(id: string) {
      return useGatedQuery("support:tickets:create", {
        queryKey: ["t", id],
        queryFn: ({ signal }) => apiClient.get(\`/support/tickets/\${id}\`, undefined, signal),
      });
    }`);
    const { mismatches } = classify(wrapper, bySegments);
    assert(
      "(c) a template-literal path resolves to the parameterised route",
      mismatches.length === 1 && mismatches[0].routePath === "/support/tickets/*",
    );
  }

  // (d) a mutation is bound to its own verb, not to the GET on the same path
  {
    const { wrapper } = scan(`export function useCreateTicket() {
      return useAuthorizedMutation("support:tickets:view", {
        mutationFn: (b) => apiClient.post("/support/tickets", b),
      });
    }`);
    const { mismatches } = classify(wrapper, bySegments);
    assert(
      "(d) POST resolves against the POST route, not the GET on the same path",
      mismatches.length === 1 && mismatches[0].declared === "support:tickets:create",
    );
  }

  // (e) a hook calling several endpoints yields one finding per endpoint
  {
    const { wrapper } = scan(`export function useBoth() {
      return useAuthorizedMutation("support:tickets:view", {
        mutationFn: async (b) => { await apiClient.post("/support/tickets", b); return apiClient.get("/support/tickets"); },
      });
    }`);
    const { tally, mismatches } = classify(wrapper, bySegments);
    assert("(e) a multi-endpoint hook reports each endpoint separately", mismatches.length === 1 && tally.matched === 1);
  }

  // (f) the AMBIGUITY rule — the useExpensePageData false positive
  {
    const { scope } = scan(`export function useExpensePageData(options) {
      const canExpenses = useCan("hr:expenses:view");
      return useQuery({
        enabled: options.selfService === true || canExpenses,
        queryKey: ["e"],
        queryFn: () => apiClient.get(options.selfService ? "/me/expenses" : "/hr/expenses/page-data"),
      });
    }`);
    const { tally, mismatches } = classify(scope, bySegments);
    assert(
      "(f) a conditional URL under a disjunctive enabled is ambiguous, never a mismatch",
      mismatches.length === 0 && tally.ambiguous >= 1,
    );
  }

  // (g) a read whose `enabled` consults the gate binds and is checked
  {
    const { scope } = scan(`export function useTeamExpenses() {
      const can = useCan("support:tickets:view");
      return useQuery({ enabled: can, queryKey: ["e"], queryFn: () => apiClient.get("/hr/expenses/page-data") });
    }`);
    const { mismatches } = classify(scope, bySegments);
    assert(
      "(g) a useCan local referenced by enabled binds that read",
      mismatches.length === 1 && mismatches[0].declared === "hr:expenses:view",
    );
  }

  // (h) two gate keys in one `enabled` is not a single binding
  {
    const { scope } = scan(`export function useTwo() {
      const a = useCan("support:tickets:view");
      const b = useCan("support:tickets:create");
      return useQuery({ enabled: a && b, queryKey: ["x"], queryFn: () => apiClient.get("/hr/expenses/page-data") });
    }`);
    assert("(h) a read gated on two keys is not bound to either", scope.length === 0);
  }

  // (h2) THE FALSE BINDING THIS RULE EXISTS TO REFUSE — AssetReturnsPage.
  // A page-level `useCan` used only for rendering does not gate the read
  // beside it, and a lexical rule reported three mismatches here.
  {
    const { scope, ungated } = scan(
      `export function AssetReturnsPage() {
        const isAdmin = useCan("hr:employees:manage");
        const { data } = useQuery({ queryKey: ["ar"], queryFn: () => apiClient.get("/hr/expenses/page-data") });
        return isAdmin ? data : null;
      }`,
      "features/hr/x.tsx",
    );
    assert("(h2) a useCan that never reaches `enabled` binds nothing", scope.length === 0);
    assert("(h2) that read is reported as ungated instead", ungated.length === 1);
  }

  // (h3) a raw useMutation is never bound by a useCan in the same function
  {
    const { scope } = scan(`export function usePage() {
      const can = useCan("support:tickets:view");
      const m = useMutation({ mutationFn: (b) => apiClient.post("/support/tickets", b) });
      return { can, m };
    }`);
    assert("(h3) useMutation has no `enabled`, so it is never scope-bound", scope.length === 0);
  }

  // (h3b) PER-FUNCTION SCOPING. Two hooks in one file each name their gate
  // `can`; a file-wide map attributed both reads to the last key parsed.
  {
    const { scope } = scan(`export function useA() {
      const can = useCan("support:tickets:view");
      return useQuery({ enabled: can, queryKey: ["a"], queryFn: () => apiClient.get("/support/tickets") });
    }
    export function useB() {
      const can = useCan("support:tickets:create");
      return useQuery({ enabled: can, queryKey: ["b"], queryFn: () => apiClient.get("/support/tickets") });
    }`);
    const byHook = new Map(scope.map((s) => [s.hook, s.permission]));
    assert(
      "(h3b) two same-named gate locals in one file keep their own keys",
      byHook.get("useA") === "support:tickets:view" && byHook.get("useB") === "support:tickets:create",
    );
  }

  // (h3c) SHORTHAND + ALIAS. `const enabled = canView && …; useQuery({ enabled })`
  // is the dominant shape in hooks/api; reading only PropertyAssignment and
  // stopping at the identifier scored 5 correctly-gated reads as ungated.
  {
    const { scope, ungated } = scan(`export function useRoster(projectId) {
      const canView = useCan("support:tickets:view");
      const enabled = canView && !!projectId;
      return useQuery({ enabled, queryKey: ["r"], queryFn: () => apiClient.get("/support/tickets") });
    }`);
    assert(
      "(h3c) a shorthand `enabled` aliasing a gate local still binds",
      scope.length === 1 && scope[0].permission === "support:tickets:view" && ungated.length === 0,
    );
  }

  // (h3d) a `||` reached THROUGH an alias still marks the read ambiguous
  {
    const { scope } = scan(`export function useEither(selfService) {
      const can = useCan("hr:expenses:view");
      const enabled = selfService || can;
      return useQuery({ enabled, queryKey: ["x"], queryFn: () => apiClient.get("/me/expenses") });
    }`);
    const { tally, mismatches } = classify(scope, bySegments);
    assert(
      "(h3d) a disjunction behind an alias is still ambiguous",
      mismatches.length === 0 && tally.ambiguous === 1,
    );
  }

  // (h4) usePermissionGate destructured into `enabled` still binds
  {
    const { scope } = scan(`export function useGated() {
      const gate = usePermissionGate("support:tickets:view");
      return useQuery({ enabled: gate.allowed, queryKey: ["x"], queryFn: () => apiClient.get("/hr/expenses/page-data") });
    }`);
    const { mismatches } = classify(scope, bySegments);
    assert("(h4) a usePermissionGate local referenced by enabled binds", mismatches.length === 1);
  }

  // (i) a route with no declared permission is not a mismatch
  {
    const { wrapper } = scan(`export function usePing() {
      return useAuthorizedMutation("support:tickets:view", { mutationFn: () => apiClient.post("/public/ping", {}) });
    }`);
    const { tally, mismatches } = classify(wrapper, bySegments);
    assert("(i) an unpermissioned route is counted, not reported", mismatches.length === 0 && tally.unpermissionedRoute === 1);
  }

  // (j) exception bookkeeping
  {
    const m = {
      file: "hooks/api/x.ts",
      hook: "useX",
      call: "GET /support/tickets",
      permission: "settings:manage",
      declared: "support:tickets:view",
    };
    const good = new Map([
      [
        findingKey(m),
        {
          hookKey: "settings:manage",
          routeKey: "support:tickets:view",
          reason: "x".repeat(MIN_REASON_LENGTH),
        },
      ],
    ]);
    assert("(j1) a well-formed exception suppresses the finding", applyExceptions([m], good).failing.length === 0);

    const short = new Map([
      [findingKey(m), { hookKey: "settings:manage", routeKey: "support:tickets:view", reason: "because" }],
    ]);
    assert("(j2) an exception with no real justification is malformed, not honoured", applyExceptions([m], short).malformed.length === 1);

    const wrongEnd = new Map([
      [findingKey(m), { hookKey: "settings:manage", routeKey: "something:else", reason: "x".repeat(MIN_REASON_LENGTH) }],
    ]);
    assert(
      "(j3) an exception whose recorded route key no longer matches is malformed",
      applyExceptions([m], wrongEnd).malformed.length === 1,
    );

    const stale = new Map([
      ["hooks/api/gone.ts::useGone::GET /gone", { hookKey: "a:b", routeKey: "c:d", reason: "x".repeat(MIN_REASON_LENGTH) }],
    ]);
    assert("(j4) a stale exception fails the gate", applyExceptions([], stale).stale.length === 1);
  }

  // (k) out-of-release-scope routing
  {
    const m = { file: "hooks/api/inventory/quality.ts", hook: "useQ", call: "GET /x", permission: "a:b", declared: "c:d" };
    const result = applyExceptions([m], new Map());
    assert("(k) an Inventory finding is listed out-of-scope, not failed", result.failing.length === 0 && result.outOfScope.length === 1);
  }

  // (l) anti-vacuity floors
  {
    assert("(l1) a broken backend walk refuses to pass", floorFailures({ backendRoutes: 0, wrapperSites: 9e9, scopeSites: 9e9, resolvedBindings: 9e9 }).length === 1);
    assert("(l2) a broken frontend walk refuses to pass", floorFailures({ backendRoutes: 9e9, wrapperSites: 0, scopeSites: 9e9, resolvedBindings: 9e9 }).length === 1);
    assert("(l3) zero resolved bindings refuses to pass", floorFailures({ backendRoutes: 9e9, wrapperSites: 9e9, scopeSites: 9e9, resolvedBindings: 0 }).length === 1);
    assert("(l4) healthy counts clear the floors", floorFailures({ backendRoutes: 9e9, wrapperSites: 9e9, scopeSites: 9e9, resolvedBindings: 9e9 }).length === 0);
  }

  // (m) route canonicalisation across the two path dialects
  {
    assert("(m1) a Nest :param canonicalises to *", canonicalRoute("hr/leaves", ":leaveId") === "/hr/leaves/*");
    assert("(m2) an OpenAPI {param} canonicalises to the same shape", canonicalRoute("", "hr/leaves/{leaveId}") === "/hr/leaves/*");
    assert("(m3) an empty sub path keeps the controller prefix", canonicalRoute("integrations/git/connections", "") === "/integrations/git/connections");
    assert("(m4) a query tail is stripped, not turned into a segment", normalizePath("/talent-pools/1/members*") === "/talent-pools/1/members");
  }

  // (n) a loose match is refused when the candidates disagree
  {
    const conflicting = indexBySegments(new Map([
      ["GET /payroll/reports/journal", { permission: "payroll:reports:view", file: "j.ts", line: 1 }],
      ["GET /payroll/reports/secret", { permission: "payroll:reports:secret", file: "j.ts", line: 2 }],
    ]));
    assert("(n) a wildcard matching routes with different keys resolves to nothing", resolveRoute(conflicting, "GET", "/payroll/reports/*") === null);
  }

  for (const f of failures) console.error(`  FAIL: ${f}`);
  if (failures.length > 0) {
    console.error(`\ncheck-permission-route-binding self-test: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`✔  check-permission-route-binding self-test: ${passed} cases passed — the gate bites in both directions.`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────

if (!backendAvailable)
  reportBackendUnreachable(
    "check-permission-route-binding",
    "the hook-permission / route-permission binding comparison",
  );

const { routes: backendRoutes, stats: backendStats } = buildBackendIndex(BACKEND_ROOT);
const bySegments = indexBySegments(backendRoutes);
const { wrapper, scope, ungated, scanned } = collectSites(ROOT);

const wrapperResult = classify(wrapper, bySegments);
const scopeResult = classify(scope, bySegments);

const resolvedBindings =
  wrapperResult.tally.matched +
  wrapperResult.mismatches.length +
  scopeResult.tally.matched +
  scopeResult.mismatches.length;

const floors = floorFailures({
  backendRoutes: backendRoutes.size,
  wrapperSites: wrapper.length,
  scopeSites: scope.length,
  resolvedBindings,
});

console.log(`Backend controllers indexed   ${backendStats.controllers} (${backendRoutes.size} routes, ${backendStats.unresolved} handler(s) unresolved)`);
console.log(`Frontend files scanned        ${scanned}`);
console.log(`WRAPPER gate sites            ${wrapper.length}  matched ${wrapperResult.tally.matched}  mismatch ${wrapperResult.mismatches.length}  ambiguous ${wrapperResult.tally.ambiguous}  unresolved-route ${wrapperResult.tally.unresolvedRoute}  no-path ${wrapperResult.tally.noPath}  route-unpermissioned ${wrapperResult.tally.unpermissionedRoute}`);
console.log(`ENABLED gate sites            ${scope.length}  matched ${scopeResult.tally.matched}  mismatch ${scopeResult.mismatches.length}  ambiguous ${scopeResult.tally.ambiguous}  unresolved-route ${scopeResult.tally.unresolvedRoute}  route-unpermissioned ${scopeResult.tally.unpermissionedRoute}`);
console.log(`Reads with no permission in \`enabled\`  ${ungated.length}  (the permissioned subset IS enforced below)`);

if (floors.length > 0) {
  console.error("");
  for (const f of floors) console.error(`✖  ${f}.`);
  console.error("   A scan that resolves nothing must not report a clean tree — refusing to pass.");
  process.exit(1);
}

// Second opinion: where the vendored contract disagrees with the controllers,
// the CONTRACT is stale. Printed so a finding is never blamed on the wrong side.
let contractDrift = [];
if (existsSync(CONTRACT)) {
  const contract = buildContractIndex(JSON.parse(readFileSync(CONTRACT, "utf8")));
  for (const [key, value] of backendRoutes) {
    const c = contract.get(key);
    if (c && (c.permission ?? null) !== (value.permission ?? null))
      contractDrift.push(`${key}  controllers=${value.permission}  contract=${c.permission}  ${value.file}:${value.line}`);
  }
}

const all = [...wrapperResult.mismatches, ...scopeResult.mismatches].sort((a, b) =>
  `${a.file}:${String(a.line).padStart(5, "0")}`.localeCompare(`${b.file}:${String(b.line).padStart(5, "0")}`),
);
const { failing, excepted, outOfScope, malformed, stale } = applyExceptions(all, DELIBERATE);

const render = (m) =>
  `   ${m.file}:${m.line}  ${m.hook}  [${m.via}]\n` +
  `      hook gates  ${m.permission}\n` +
  `      route wants ${m.declared}   ${m.call} -> ${m.routePath}${m.loose ? "  (wildcard match)" : ""}${m.deprecatedAlias ? "  [DEPRECATED ALIAS]" : ""}\n` +
  `      backend     ${m.backend}`;

if (contractDrift.length > 0) {
  console.log(`\n⚠  ${contractDrift.length} operation(s) where contracts/openapi.json disagrees with the controllers.`);
  console.log("   The controllers are authoritative here; the contract is regenerated at quiesce.");
  if (process.argv.includes("--list")) for (const d of contractDrift) console.log(`   ${d}`);
}

if (outOfScope.length > 0) {
  console.log(`\n⚠  ${outOfScope.length} mismatch(es) under a module excluded from the 10/10 release — listed, not failing:`);
  for (const m of outOfScope) console.log(`${render(m)}\n      excluded    ${m.reason}`);
}

if (excepted.length > 0) {
  console.log(`\n⚠  ${excepted.length} documented deliberate divergence(s):`);
  for (const m of excepted) console.log(`${render(m)}\n      deliberate  ${m.reason}`);
}

// Reads whose `enabled` consults no permission at all. A DIFFERENT defect from
// a key mismatch, and this gate owns it: `check-gated-reads.mjs` walks only
// `hooks/api` and counts a module toggle as a gate, so it cannot see the
// `features/**` half of the set and scores part of the rest as already gated.
const permissionedUngated = [];
for (const u of ungated)
  for (const c of u.calls) {
    const hit = resolveRoute(bySegments, c.method, c.path);
    if (hit && hit.route.value.permission !== null)
      permissionedUngated.push({
        file: u.file,
        line: u.line,
        hook: u.hook,
        call: `${c.method} ${c.path}`,
        declared: hit.route.value.permission,
      });
  }

const ungatedByFile = new Map();
for (const r of permissionedUngated)
  ungatedByFile.set(r.file, [...(ungatedByFile.get(r.file) ?? []), r]);

const ungatedNew = [];
const ungatedOverCount = [];
const ungatedUnderCount = [];
const ungatedStale = [];
const ungatedMalformed = [];
for (const [file, rows] of ungatedByFile) {
  const held = UNGATED_HELD_BACK.get(file);
  if (!held) { ungatedNew.push(...rows); continue; }
  if (typeof held.reason !== "string" || held.reason.length < MIN_REASON_LENGTH)
    ungatedMalformed.push(file);
  if (rows.length > held.count) ungatedOverCount.push({ file, found: rows.length, held: held.count, rows });
  if (rows.length < held.count) ungatedUnderCount.push({ file, found: rows.length, held: held.count });
}
for (const file of UNGATED_HELD_BACK.keys())
  if (!ungatedByFile.has(file)) ungatedStale.push(file);

const renderUngated = (r) =>
  `   ${r.file}:${r.line}  ${r.hook}  ${r.call}  route requires ${r.declared}`;

console.log(
  `\n${permissionedUngated.length} read(s) on a permissioned route whose \`enabled\` consults no permission ` +
    `(${permissionedUngated.length - ungatedNew.length} held back and counted, ${ungatedNew.length} unaccounted).`,
);
if (process.argv.includes("--list")) {
  const unresolved = [...wrapperResult.unresolved, ...scopeResult.unresolved];
  console.log(`\n${unresolved.length} binding(s) whose route did not resolve against the controllers:`);
  for (const u of unresolved) console.log(`   ${u.file}:${u.line}  ${u.hook}  ${u.call}  (gates ${u.permission})`);
  console.log("");
  for (const r of permissionedUngated) console.log(renderUngated(r));
  for (const [file, held] of UNGATED_HELD_BACK)
    console.log(`   held back  ${file} (${held.count})  ${held.reason}`);
}

let failed = false;

if (ungatedNew.length > 0) {
  failed = true;
  console.error(
    `\n✖  ${ungatedNew.length} read(s) call a permissioned route with no permission in \`enabled\`:\n`,
  );
  for (const r of ungatedNew) console.error(renderUngated(r));
  console.error("");
  console.error("   The request is sent for a user the backend will refuse. TanStack surfaces");
  console.error("   that 403 as isPending with nothing fetching, which renders identically to a");
  console.error("   finished empty read — the screen says \"none yet\" to someone who was denied,");
  console.error("   and no gate is visible anywhere. AND the route's own key into `enabled`, or");
  console.error("   move the read onto useGatedQuery(<key>, { ... }).");
}

if (ungatedOverCount.length > 0) {
  failed = true;
  console.error(`\n✖  ${ungatedOverCount.length} held-back file(s) grew a new ungated permissioned read:`);
  for (const o of ungatedOverCount) {
    console.error(`   ${o.file}: ${o.found} found, ${o.held} recorded`);
    for (const r of o.rows) console.error(renderUngated(r));
  }
}

if (ungatedUnderCount.length > 0) {
  failed = true;
  console.error(`\n✖  ${ungatedUnderCount.length} held-back file(s) are now BELOW their recorded count — lower it so the ratchet holds:`);
  for (const o of ungatedUnderCount) console.error(`   ${o.file}: ${o.found} found, ${o.held} recorded`);
}

if (ungatedStale.length > 0) {
  failed = true;
  console.error(`\n✖  ${ungatedStale.length} stale UNGATED_HELD_BACK entry(entries) — the file carries none any more; delete them:`);
  for (const f of ungatedStale) console.error(`   ${f}`);
}

if (ungatedMalformed.length > 0) {
  failed = true;
  console.error(`\n✖  ${ungatedMalformed.length} UNGATED_HELD_BACK entry(entries) whose reason does not justify itself (min ${MIN_REASON_LENGTH} chars):`);
  for (const f of ungatedMalformed) console.error(`   ${f}`);
}

if (malformed.length > 0) {
  failed = true;
  console.error(`\n✖  ${malformed.length} malformed DELIBERATE entry(entries) — an exception must justify itself and name both keys:`);
  for (const m of malformed) console.error(`   ${m.key}`);
}

if (stale.length > 0) {
  failed = true;
  console.error(`\n✖  ${stale.length} stale DELIBERATE entry(entries) — they match no current finding; delete them:`);
  for (const k of stale) console.error(`   ${k}`);
}

if (failing.length > 0) {
  failed = true;
  console.error(`\n✖  ${failing.length} hook(s) gate on a permission the route they call does not declare:\n`);
  for (const m of failing) console.error(render(m));
  console.error("");
  console.error("   Permission matching is EXACT — holding x:manage does not grant x:view.");
  console.error("   So each of these strands two populations at once: a user holding the route");
  console.error("   key but not the hook key gets an empty screen or a dead control, and a user");
  console.error("   holding the hook key but not the route key gets a live control the backend");
  console.error("   403s. Decide per finding whether the HOOK or the ROUTE is wrong — a route");
  console.error("   whose declared key is weaker than the action it performs is the more serious");
  console.error("   of the two and must not be papered over from the client.");
}

if (failed) process.exit(1);

console.log(`\n✔  every resolved gate names the permission its route declares (${resolvedBindings} bindings checked).`);
process.exit(0);
