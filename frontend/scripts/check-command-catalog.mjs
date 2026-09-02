#!/usr/bin/env node
/**
 * check-command-catalog — every mutation hook is classified against the backend
 * contract, and no command is unclassified.
 *
 * The classification is derived from `contracts/openapi.json`, not from a hand
 * list: each hook's apiClient call is resolved to an operation and that
 * operation's `x-exposure` / `x-permission` decides what the hook must do.
 *
 *   x-exposure: permissioned  -> the hook MUST call useAuthorizedMutation, and the
 *                               key must be the contract key, or an entry in
 *                               STRICTER_KEYS recording why a stricter key is used
 *   x-exposure: universal     -> SELF; the subject is always @CurrentUser()
 *   x-exposure: public        -> PUBLIC; no session required
 *   x-exposure: in-service    -> must be named in IN_SERVICE_HOOKS with a reason
 *   unresolvable endpoint     -> UNCLASSIFIED, which fails
 *
 * --self-test exercises the classifier against fixtures, including the shapes the
 * previous gate could not see: a path built from a module constant, an imperative
 * GET/download used as a mutation, and a declared key that no longer matches.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

// Zero unclassified commands is the standard. Never raise this.
const BASELINE = { unclassified: 0 };
const SCAN_FLOOR = { minHooks: 900 };

/**
 * Hooks whose endpoint carries no permission because authorization happens
 * inside the service (`x-exposure: in-service`). Each entry states why.
 */
const MODULE_ACCESS_REASON =
  "module-access.controller.ts is @AuthorizedInService(\"assertModuleAccessPolicy\") — the caller's standing in the target module is resolved per request, so there is no single permission key to gate on.";
const CHAT_ENTITY_REASON =
  "chat-entities.controller.ts is @AuthorizedInService — channel membership is asserted first, then EntityReferenceService resolves the actor's own access to the linked record.";

const IN_SERVICE_HOOKS = new Map([
  ["useSubmitEntityAction", CHAT_ENTITY_REASON],
  ["useCreateTaskFromMessage", CHAT_ENTITY_REASON],
  ["useCreateModuleRoleGroup", MODULE_ACCESS_REASON],
  ["useRenameModuleRoleGroup", MODULE_ACCESS_REASON],
  ["useDeleteModuleRoleGroup", MODULE_ACCESS_REASON],
  ["useSetModuleGroupPermissions", MODULE_ACCESS_REASON],
  ["useAddModuleGroupMember", MODULE_ACCESS_REASON],
  ["useRemoveModuleGroupMember", MODULE_ACCESS_REASON],
  ["useAddModuleMember", MODULE_ACCESS_REASON],
  ["useUpdateModuleMember", MODULE_ACCESS_REASON],
  ["useRemoveModuleMember", MODULE_ACCESS_REASON],
  ["useSetModuleMemberGrants", MODULE_ACCESS_REASON],
  ["useTransferModuleOwnership", MODULE_ACCESS_REASON],
  ["useCancelModuleOwnershipTransfer", MODULE_ACCESS_REASON],
  [
    "useCreateOrganization",
    "organization.controller.ts:150 is @AuthorizedInService — any authenticated user may create an organisation; plan limits are enforced in OrgProfileService.createOrganization.",
  ],
  [
    "useRestoreOrg",
    "organization.controller.ts:372 is @AuthorizedInService — OrgLifecycleService.restoreOrg requires an ACTIVE isOwner membership of the target org and returns 404 on a miss.",
  ],
]);

/**
 * Hooks that deliberately declare a STRICTER key than the contract requires.
 * Loosening these to the contract key would widen the UI past the product rule,
 * so the difference is recorded rather than "fixed". The value is the contract
 * key, so the entry goes stale the moment the backend gate changes.
 */
const STRICTER_KEYS = new Map([
  ["useUpsertWorkLog", "hr:attendance:view"],
  ["useCreateContract", "hr:contracts:manage"],
  ["useUpdateContract", "hr:contracts:manage"],
  ["useEndContract", "hr:contracts:manage"],
  ["useConvertToEmployee", "hr:contracts:manage"],
  ["useRevertLeave", "hr:leaves:approve"],
  ["useUpdatePerformanceReview", "hr:performance:view"],
  ["useUpdateGoal", "hr:performance:view"],
  ["usePreviewPolicy", "payroll:policies:view"],
  ["useCreateRun", "payroll:runs:create"],
  ["useUpdateFxRates", "payroll:policies:manage"],
]);

/**
 * Hooks whose request never goes through apiClient, so the scanner cannot read
 * an endpoint from the call. Each entry names the endpoint and its exposure,
 * checked against the contract by hand.
 */
const OFF_CLIENT_HOOKS = new Map([
  ["useAcceptInvitation", "PUBLIC — portalApiClient POST /portal/auth/accept-invitation with authenticated:false"],
  ["useSubmitChangeRequest", "PUBLIC — portalApiClient, unauthenticated portal surface"],
  ["useRequestSignOtp", "PUBLIC — publicPost /public/sign/{token}/request-otp"],
  ["useAuthenticateSignSession", "PUBLIC — publicPost /public/sign/{token}"],
  ["useAcceptSignConsent", "PUBLIC — publicPost /public/sign/{token}"],
  ["useSetSignFieldValue", "PUBLIC — publicPost /public/sign/{token}"],
  ["useAdoptSignSignature", "PUBLIC — publicPost /public/sign/{token}"],
  ["useCompleteSignSession", "PUBLIC — publicPost /public/sign/{token}"],
  ["useDeclineSignSession", "PUBLIC — publicPost /public/sign/{token}"],
  [
    "useExportResponses",
    "PERMISSIONED surveys:responses:export — issues POST /surveys/{surveyId}/export through authedFetch to stream a blob; gated by useCan at the call site in the analytics panel.",
  ],
  [
    "useImportExpenses",
    "PERMISSIONED hr:expenses:manage — the request lives in the module-local importExpensesRequest helper (POST /hr/expenses/import); the hook carries the key.",
  ],
  [
    "useUploadFile",
    "IN-SERVICE — the request lives in the module-local uploadFileRequest helper (POST /storage/upload), which is in-service: the upload is authorized by the feature that consumes the returned key.",
  ],
]);

const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", ".git"]);
const SCAN_DIRS = ["hooks/api", "features"];
const TEST_FILE_RE = /\.test\.|\.spec\.|__tests__/;

// Methods that reach the API. `get`/`download` appear inside mutations for
// imperative reads (exports, signed-URL fetches) and are classified too.
// `useMutation<T, E, V>({...})` is the dominant form in this repo (382 of 463
// call sites). A scanner matching only `useMutation(` sees none of them.
const MUTATION_CALL_RE = /\buse(?:Authorized)?Mutation\s*[<(]/;

const METHOD_OF = {
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
  upload: "POST",
  get: "GET",
  download: "GET",
};

// ─────────────────────────────────────────────────────────────────────────────
// Contract index
// ─────────────────────────────────────────────────────────────────────────────

function loadContract() {
  const spec = JSON.parse(readFileSync(join(ROOT, "contracts/openapi.json"), "utf8"));
  const index = new Map();
  for (const [path, ops] of Object.entries(spec.paths ?? {})) {
    const segments = path.split("/").filter(Boolean).map((s) => (s.startsWith("{") ? "*" : s));
    for (const [method, op] of Object.entries(ops)) {
      if (typeof op !== "object" || op === null) continue;
      const key = method.toUpperCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ path, segments, op });
    }
  }
  return index;
}

function resolveOperation(index, method, literal) {
  const segments = literal.split("?")[0].split("/").filter(Boolean);
  const sameShape = (index.get(method) ?? []).filter((c) => c.segments.length === segments.length);
  const matches = sameShape.filter((c) =>
    c.segments.every((cs, i) => (segments[i] === "*" ? cs === "*" : cs === "*" || cs === segments[i])),
  );
  if (matches.length > 0) {
    matches.sort(
      (a, b) => b.segments.filter((s) => s !== "*").length - a.segments.filter((s) => s !== "*").length,
    );
    return matches[0].op;
  }

  // An interpolated segment can also select one of several fixed sibling routes
  // (`/payroll/reports/${reportType}`). Resolve that only when every candidate
  // agrees, so a hook can never be classified by an arbitrary pick.
  const loose = sameShape.filter((c) =>
    c.segments.every((cs, i) => cs === "*" || segments[i] === "*" || cs === segments[i]),
  );
  if (loose.length === 0) return null;
  const exposures = new Set(loose.map((c) => c.op["x-exposure"] ?? "UNKNOWN"));
  const permissions = new Set(loose.map((c) => c.op["x-permission"] ?? null));
  if (exposures.size !== 1 || permissions.size !== 1) return null;
  return loose[0].op;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blank out comments, keeping every offset, so an apostrophe in prose
 * ("the person's own task list") cannot put the argument parser into string mode.
 */
function stripComments(src) {
  const out = src.split("");
  let inStr = null;
  let esc = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") { out[i] = " "; i++; }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      out[i] = " ";
      out[i + 1] = " ";
      i++;
      continue;
    }
  }
  return out.join("");
}

function splitCallArgs(src, open) {
  let depth = 0;
  let inStr = null;
  let esc = false;
  let cur = open + 1;
  const args = [];
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      depth--;
      if (depth === 0) { args.push(src.slice(cur, i)); return args; }
    } else if (c === "," && depth === 1) { args.push(src.slice(cur, i)); cur = i + 1; }
  }
  return null;
}

function moduleConstants(src) {
  const consts = new Map();
  for (const m of src.matchAll(/^const\s+([A-Z_][A-Z0-9_]*)\s*=\s*"(\/[^"]*)"\s*;/gm))
    consts.set(m[1], m[2]);
  return consts;
}

function normalizePath(arg, consts) {
  let a = arg.trim();
  if (consts.has(a)) a = JSON.stringify(consts.get(a));
  let s = null;
  if (a.startsWith("`")) {
    s = a
      .slice(1, a.lastIndexOf("`"))
      .replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name) =>
        consts.has(name) ? consts.get(name) : whole,
      )
      .replace(/\$\{[^}]*\}/g, "*");
  } else if (/^["']/.test(a)) {
    const q = a[0];
    const endQ = a.indexOf(q, 1);
    s = a.slice(1, endQ);
    if (a.slice(endQ + 1).trim().startsWith("+")) s += "*";
  }
  if (s === null || !s.startsWith("/")) return null;
  return s.replace(/\/+$/, "") || "/";
}

/** The permission key declared by useAuthorizedMutation, past any type arguments. */
function readAuthorizedKey(body) {
  const m = /\buseAuthorizedMutation/.exec(body);
  if (!m) return null;
  let i = m.index + m[0].length;
  while (/\s/.test(body[i] ?? "")) i++;
  if (body[i] === "<") {
    let angle = 0;
    for (; i < body.length; i++) {
      if (body[i] === "<") angle++;
      else if (body[i] === ">") {
        angle--;
        if (angle === 0) { i++; break; }
      }
    }
  }
  while (/\s/.test(body[i] ?? "")) i++;
  if (body[i] !== "(") return null;
  const args = splitCallArgs(body, i);
  if (!args || !args.length) return null;
  const first = args[0].trim();
  const q = /^["'`]([^"'`]+)["'`]$/.exec(first);
  return q ? q[1] : null;
}

function extractMutationBlocks(src, filePath) {
  const results = [];
  const EXPORT_RE = /^[ \t]*export\s+(?:const|(?:async\s+)?function)\s+(use\w+)\s*[=(]/gm;
  let match;
  while ((match = EXPORT_RE.exec(src)) !== null) {
    const name = match[1];
    const openBrace = src.indexOf("{", match.index + match[0].length);
    if (openBrace === -1) continue;
    // An arrow one-liner (`export const useX = () => useY(...)`) has no block of
    // its own; without this guard the next declaration's body would be read as its.
    const nextExport = src.indexOf("\nexport ", match.index + match[0].length);
    if (nextExport !== -1 && openBrace > nextExport) continue;
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const body = src.slice(openBrace, end + 1);
    if (!MUTATION_CALL_RE.test(body)) continue;
    results.push({ name, body, file: filePath, line: src.slice(0, match.index).split("\n").length });
  }
  return results;
}

function classifyBlock(block, index, consts) {
  const { name, body } = block;
  const declaredKey = readAuthorizedKey(body);

  const exposures = new Set();
  const permissions = new Set();
  let sawCall = false;
  const CALL_RE = /apiClient\.(\w+)\s*(?:<[\s\S]*?>)?\s*\(/g;
  let cm;
  while ((cm = CALL_RE.exec(body)) !== null) {
    const method = METHOD_OF[cm[1]];
    if (!method) continue;
    sawCall = true;
    const args = splitCallArgs(body, cm.index + cm[0].length - 1);
    const literal = args && args.length ? normalizePath(args[0], consts) : null;
    if (!literal) { exposures.add("UNRESOLVED"); continue; }
    const op = resolveOperation(index, method, literal);
    if (!op) { exposures.add("UNRESOLVED"); continue; }
    exposures.add(op["x-exposure"] ?? "UNKNOWN");
    if (op["x-permission"]) permissions.add(op["x-permission"]);
  }

  if (!sawCall || exposures.has("UNRESOLVED") || exposures.has("UNKNOWN")) {
    if (OFF_CLIENT_HOOKS.has(name)) return { kind: "OFF-CLIENT", reason: OFF_CLIENT_HOOKS.get(name) };
    return {
      kind: "UNCLASSIFIED",
      reason: sawCall
        ? "endpoint could not be resolved against contracts/openapi.json"
        : "no apiClient call found in the hook body",
    };
  }

  if (exposures.has("permissioned")) {
    if (permissions.size !== 1)
      return {
        kind: "UNCLASSIFIED",
        reason: `resolves to ${permissions.size} different permissions (${[...permissions].join(", ")}); split the hook or gate it explicitly`,
      };
    const contractKey = [...permissions][0];
    if (!declaredKey)
      return { kind: "UNCLASSIFIED", reason: `permissioned endpoint requires useAuthorizedMutation("${contractKey}")` };
    if (declaredKey === contractKey) return { kind: "PERMISSIONED", key: declaredKey };
    if (STRICTER_KEYS.get(name) === contractKey)
      return { kind: "PERMISSIONED", key: declaredKey, stricterThan: contractKey };
    return {
      kind: "WRONG-KEY",
      reason: `declares "${declaredKey}" but the contract requires "${contractKey}"`,
    };
  }

  if (exposures.has("in-service")) {
    if (IN_SERVICE_HOOKS.has(name)) return { kind: "IN-SERVICE", reason: IN_SERVICE_HOOKS.get(name) };
    return { kind: "UNCLASSIFIED", reason: "in-service endpoint must be named in IN_SERVICE_HOOKS with a reason" };
  }

  if (exposures.has("universal")) return { kind: "SELF", reason: "contract exposure: universal" };
  if (exposures.has("public")) return { kind: "PUBLIC", reason: "contract exposure: public" };
  return { kind: "UNCLASSIFIED", reason: `unrecognised exposure ${[...exposures].join(", ")}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Walker
// ─────────────────────────────────────────────────────────────────────────────

function walkDir(dir, cb) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full, cb);
    else if (st.isFile() && (extname(entry) === ".ts" || extname(entry) === ".tsx")) cb(full);
  }
}

function collectBlocks(rootDir, scanDirs) {
  const blocks = [];
  for (const rel of scanDirs) {
    walkDir(join(rootDir, rel), (filePath) => {
      const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
      if (TEST_FILE_RE.test(relPath)) return;
      const src = stripComments(readFileSync(filePath, "utf8"));
      if (!MUTATION_CALL_RE.test(src)) return;
      const consts = moduleConstants(src);
      for (const b of extractMutationBlocks(src, relPath)) blocks.push({ ...b, consts });
    });
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test
// ─────────────────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test for check-command-catalog...\n");
  const index = loadContract();

  function classify(rawSrc, name) {
    const src = stripComments(rawSrc);
    const consts = moduleConstants(src);
    const block = extractMutationBlocks(src, "test.ts").find((b) => b.name === name);
    if (!block) return null;
    return classifyBlock(block, index, consts);
  }

  const cases = [
    {
      label: "(a) permissioned endpoint carrying the contract key",
      src: `export function useCreateTaxCode() {
        return useAuthorizedMutation("accounting:taxes:manage", { mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      }`,
      name: "useCreateTaxCode",
      expect: "PERMISSIONED",
    },
    {
      label: "(b) permissioned endpoint left on a raw useMutation",
      src: `export function useCreateTaxCode() {
        return useMutation({ mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      }`,
      name: "useCreateTaxCode",
      expect: "UNCLASSIFIED",
    },
    {
      label: "(c) a declared key that no longer matches the contract",
      src: `export function useCreateTaxCode() {
        return useAuthorizedMutation("accounting:taxes:view", { mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      }`,
      name: "useCreateTaxCode",
      expect: "WRONG-KEY",
    },
    {
      label: "(d) a path built from a module constant is still resolved",
      src: `const BASE = "/crm/issues";
      export function useCreateIssue() {
        return useAuthorizedMutation("crm:issues:manage", { mutationFn: (d) => apiClient.post(\`\${BASE}\`, d) });
      }`,
      name: "useCreateIssue",
      expect: "PERMISSIONED",
    },
    {
      label: "(e) an imperative download used as a mutation is classified, not skipped",
      src: `export function useExportPayrollReport() {
        return useAuthorizedMutation("payroll:reports:view", { mutationFn: () => apiClient.download("/payroll/reports/journal", { format: "csv" }) });
      }`,
      name: "useExportPayrollReport",
      expect: "PERMISSIONED",
    },
    {
      label: "(f) a universal endpoint needs no permission",
      src: `export function useRevokeSession() {
        return useMutation({ mutationFn: (id) => apiClient.delete(\`/sessions/\${id}\`) });
      }`,
      name: "useRevokeSession",
      expect: "SELF",
    },
    {
      label: "(g) an endpoint absent from the contract fails closed",
      src: `export function useDoSomething() {
        return useMutation({ mutationFn: (d) => apiClient.post("/no/such/route/anywhere", d) });
      }`,
      name: "useDoSomething",
      expect: "UNCLASSIFIED",
    },
    {
      label: "(h) an unresolvable dynamic path fails closed",
      src: `export function useDynamic(path) {
        return useMutation({ mutationFn: (d) => apiClient.post(path, d) });
      }`,
      name: "useDynamic",
      expect: "UNCLASSIFIED",
    },
    {
      label: "(i2) the generic form useMutation<T, E, V>({...}) is seen — 382 call sites the old gate could not",
      src: `export function useCreateTaxCode() {
        return useMutation<TaxCode, Error, CreateTaxCodeInput>({ mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      }`,
      name: "useCreateTaxCode",
      expect: "UNCLASSIFIED",
    },
    {
      label: "(i3) the generic form on useAuthorizedMutation keeps its key",
      src: `export function useCreateTaxCode() {
        return useAuthorizedMutation<TaxCode, Error, CreateTaxCodeInput>("accounting:taxes:manage", { mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      }`,
      name: "useCreateTaxCode",
      expect: "PERMISSIONED",
    },
    {
      label: "(i4) an arrow one-liner does not borrow the next declaration's body",
      src: `export const useBulkSuspend = () => useBulkLifecycle("/users/bulk-suspend");

export const useOther = () => {
  return useAuthorizedMutation("settings:organization:manage", { mutationFn: (d) => apiClient.post("/users/bulk-update", d) });
};`,
      name: "useBulkSuspend",
      expectNull: true,
    },
    {
      label: "(i5) an apostrophe in a comment does not hide the declared key",
      src: `export function useCompleteActivityTask() {
        return useAuthorizedMutation("crm:activities:manage", {
          mutationFn: (id) => apiClient.post(\`/crm/activities/\${id}/complete\`, {}),
          onSuccess: () => {
            // The same row appears on a timeline and in the person's own task list.
            invalidate();
          },
        });
      }`,
      name: "useCompleteActivityTask",
      expect: "PERMISSIONED",
    },
    {
      label: "(i) an `export const` hook is seen, not only `export function`",
      src: `export const useCreateTaxCode = () => {
        return useMutation({ mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) });
      };`,
      name: "useCreateTaxCode",
      expect: "UNCLASSIFIED",
    },
  ];

  for (const c of cases) {
    const result = classify(c.src, c.name);
    if (c.expectNull) {
      assert(result === null, `${c.label}: expected no block, got ${result?.kind}`);
      console.log(`  ${c.label} → not extracted`);
      continue;
    }
    assert(result !== null, `${c.label}: hook was not extracted at all`);
    assert(
      result.kind === c.expect,
      `${c.label}: expected ${c.expect}, got ${result.kind}${result.reason ? ` (${result.reason})` : ""}`,
    );
    console.log(`  ${c.label} → ${result.kind}`);
  }

  const missing = classify(
    `export function useCreateTaxCode() { return useMutation({ mutationFn: (d) => apiClient.post("/accounting/tax-codes", d) }); }`,
    "useNonExistent",
  );
  assert(missing === null, "(j) an unknown hook name must return null so the scan is not vacuous");
  console.log("  (j) unknown hook name returns null (scan is not vacuous)");

  console.log(`\n✔ ${cases.length + 1} command-catalog fixtures passed — check-command-catalog is live.\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scan
// ─────────────────────────────────────────────────────────────────────────────

function runMainScan() {
  console.log("Classifying mutation hooks against contracts/openapi.json...\n");
  const index = loadContract();
  const blocks = collectBlocks(ROOT, SCAN_DIRS);

  if (blocks.length < SCAN_FLOOR.minHooks) {
    console.error(
      `FAIL: scan floor not met — found only ${blocks.length} mutation hooks ` +
        `(expected ≥${SCAN_FLOOR.minHooks}). The scanner is broken or the wrong directory was scanned.`,
    );
    process.exit(1);
  }

  const byKind = new Map();
  const problems = [];
  const seenStricter = new Set();
  const seenInService = new Set();
  const seenOffClient = new Set();

  for (const block of blocks) {
    const result = classifyBlock(block, index, block.consts);
    byKind.set(result.kind, (byKind.get(result.kind) ?? 0) + 1);
    if (result.stricterThan) seenStricter.add(block.name);
    if (result.kind === "IN-SERVICE") seenInService.add(block.name);
    if (result.kind === "OFF-CLIENT") seenOffClient.add(block.name);
    if (result.kind === "UNCLASSIFIED" || result.kind === "WRONG-KEY")
      problems.push(`  [${result.kind}] ${block.file}:${block.line} ${block.name} — ${result.reason}`);
  }

  console.log("=== Mutation hook classification ===");
  console.log(`Total hooks scanned:  ${blocks.length}`);
  for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`${kind.padEnd(21)} ${count}`);
  console.log();

  const stale = [
    ...[...STRICTER_KEYS.keys()].filter((k) => !seenStricter.has(k)).map((k) => `STRICTER_KEYS: ${k}`),
    ...[...IN_SERVICE_HOOKS.keys()].filter((k) => !seenInService.has(k)).map((k) => `IN_SERVICE_HOOKS: ${k}`),
    ...[...OFF_CLIENT_HOOKS.keys()].filter((k) => !seenOffClient.has(k)).map((k) => `OFF_CLIENT_HOOKS: ${k}`),
  ];

  if (problems.length > BASELINE.unclassified) {
    console.error(
      `FAIL: ${problems.length} command(s) unclassified or mis-keyed (baseline ${BASELINE.unclassified}):`,
    );
    for (const p of problems) console.error(p);
    process.exit(1);
  }

  if (stale.length > 0) {
    console.error(
      `FAIL: ${stale.length} stale exception entr(y|ies) — the hook no longer exists or no longer needs the exception:`,
    );
    for (const s of stale) console.error(`  ${s}`);
    process.exit(1);
  }

  console.log("PASS: zero unclassified commands; every permissioned mutation carries its contract key.");
}

if (process.argv.includes("--self-test")) runSelfTest();
else runMainScan();
