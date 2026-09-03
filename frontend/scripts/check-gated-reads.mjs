#!/usr/bin/env node
/**
 * check-gated-reads — no NEW permissioned read may be left ungated.
 *
 * The defect this exists to stop: a read hook calls `useQuery` directly against
 * a route the backend protects with `@RequirePermission`. The request is sent
 * for every user, the backend 403s, and TanStack reports `isPending: true,
 * isFetching: false` — indistinguishable from a finished empty read. The screen
 * says "none yet" to a user who is actually denied, and nobody sees a gate.
 *
 * `contracts/openapi.json` is the oracle. It is generated from the controllers'
 * own decorators and carries, per operation:
 *   x-exposure: permissioned  + x-permission: <key>   -> MUST be gated
 *   x-exposure: universal                             -> subject is @CurrentUser(); no gate
 *   x-exposure: public                                -> no session; no gate
 *   x-exposure: in-service                            -> the service narrows; no single key
 *
 * WHAT "GATED" MEANS HERE — read this before trusting the number.
 * This gate certifies REQUEST SUPPRESSION only: the enclosing hook consults the
 * permission, so a denied user sends no request. It does NOT certify that any
 * screen renders a denied state. Those are different properties and only the
 * first is decidable from `hooks/api/**`. The NOTE printed at the end of a run
 * measures the second and never fails — see the comment on reportGateConsumption.
 *
 * SCAN DEFINITION — state this whenever you quote a number from this gate.
 * Call sites of `useQuery` / `useInfiniteQuery` / `useSuspenseQuery` under
 * `hooks/api/**` (non-test), whose enclosing exported hook mentions none of
 * `useCan` / `usePermissionGate` / `useAccess` / `useModuleEnabled` / `useScope`.
 * This is the WIDER of the two definitions used during this release: it counts a
 * hook whose only `enabled` is a non-permission guard. An earlier, narrower scan
 * reported 133 total ungated reads. The two definitions measure different sets —
 * NEVER add or subtract the two numbers.
 *
 * Usage:
 *   node scripts/check-gated-reads.mjs
 *   node scripts/check-gated-reads.mjs --list        # print the residue
 *   node scripts/check-gated-reads.mjs --self-test
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

/**
 * The ratchet. MEASURED, never aspirational — every number below was produced
 * by this scanner against the tree it is committed with. Lower it when you
 * convert reads; raising it needs a reason in the ticket.
 */
const BASELINE = {
  /** Permissioned reads still on a raw useQuery. This is the number that bites. */
  permissionedUngated: 0,
};

/**
 * Reads that resolve to `x-exposure: permissioned` and are deliberately NOT
 * gated. Every entry names the route, the key it would take, and why it is
 * held back. A stale entry — one whose hook is gone or now gated — fails the
 * gate, so this list cannot rot into an allowlist nobody re-reads.
 *
 * CRM and Inventory are out of scope for the 10/10 code release. Each of these
 * is a one-line change the day they re-enter scope.
 */
const HELD_BACK = new Map([
  ["hooks/api/leads.ts", "crm:leads:view — CRM is out of release scope"],
  ["hooks/api/inv-ai-explain.ts", "inventory:reports:read — Inventory is out of release scope"],
]);

/**
 * Routes the contract calls `permissioned` that a read may still take ungated,
 * with the reason. Empty by design: prefer HELD_BACK, which is scoped to a file
 * and expires when the file is converted.
 */
const EXEMPT_ROUTES = new Map([]);

const SCAN_DIRS = ["hooks/api"];
const SCAN_FLOOR = { minReadSites: 700 };

const TEST_FILE_RE = /\.test\.|\.spec\.|__tests__/;
const READ_CALL_RE = /\buse(?:Infinite|Suspense)?Query\s*(?:<|\()/g;

/**
 * A hook mentioning any of these consults the permission system, so its reads
 * are gated by definition of this scan. `useGatedQuery` is not in the list:
 * it is not a `useQuery` call site, so it is never counted in the first place,
 * and adding it here would let one gated read launder a raw one beside it.
 */
const GATE_MARKERS = [
  "useCan",
  "usePermissionGate",
  "useAccess",
  "useModuleEnabled",
  "useScope",
];

// ─────────────────────────────────────────────────────────────────────────────
// Contract index
// ─────────────────────────────────────────────────────────────────────────────

function buildIndex(spec) {
  const index = new Map();
  for (const [path, ops] of Object.entries(spec.paths ?? {})) {
    const segments = path
      .split("/")
      .filter(Boolean)
      .map((s) => (s.startsWith("{") ? "*" : s));
    for (const [method, op] of Object.entries(ops)) {
      if (typeof op !== "object" || op === null) continue;
      const key = method.toUpperCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ path, segments, op });
    }
  }
  return index;
}

function loadContract() {
  return buildIndex(JSON.parse(readFileSync(join(ROOT, "contracts/openapi.json"), "utf8")));
}

/**
 * Resolve a literal path to one operation. A `*` in the literal is an
 * interpolated segment and matches a contract `{param}` OR a fixed sibling —
 * but a loose match is only accepted when every candidate agrees on exposure
 * and permission, so a read can never be classified by an arbitrary pick.
 */
function resolveOperation(index, method, literal) {
  const segments = literal.split("?")[0].split("/").filter(Boolean);
  const sameShape = (index.get(method) ?? []).filter((c) => c.segments.length === segments.length);
  const exact = sameShape.filter((c) =>
    c.segments.every((cs, i) => (segments[i] === "*" ? cs === "*" : cs === "*" || cs === segments[i])),
  );
  if (exact.length > 0) {
    exact.sort(
      (a, b) => b.segments.filter((s) => s !== "*").length - a.segments.filter((s) => s !== "*").length,
    );
    return { op: exact[0].op, path: exact[0].path };
  }
  const loose = sameShape.filter((c) =>
    c.segments.every((cs, i) => cs === "*" || segments[i] === "*" || cs === segments[i]),
  );
  if (loose.length === 0) return null;
  const exposures = new Set(loose.map((c) => c.op["x-exposure"] ?? "UNKNOWN"));
  const permissions = new Set(loose.map((c) => c.op["x-permission"] ?? null));
  if (exposures.size !== 1 || permissions.size !== 1) return null;
  return { op: loose[0].op, path: loose[0].path };
}

// ─────────────────────────────────────────────────────────────────────────────
// Source parsing
// ─────────────────────────────────────────────────────────────────────────────

/** Blank out comments, keeping every offset, so prose cannot open a string. */
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

/** Arguments of the call whose opening paren sits at `open`. */
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

/** Index just past the balanced call opened at `open`, or src.length. */
function endOfCall(src, open) {
  let depth = 0;
  let inStr = null;
  let esc = false;
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
      if (depth === 0) return i + 1;
    }
  }
  return src.length;
}

/** Module-level `const NAME = "/path";`, exported or not. */
function moduleConstants(src) {
  const consts = new Map();
  for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*"(\/[^"]*)"\s*;/gm))
    consts.set(m[1], m[2]);
  return consts;
}

/** A literal or template argument reduced to a contract-shaped path, or null. */
function normalizePath(arg, consts) {
  let a = arg.trim();
  if (consts.has(a)) a = JSON.stringify(consts.get(a));
  let s = null;
  if (a.startsWith("`")) {
    const close = a.lastIndexOf("`");
    if (close <= 0) return null;
    s = a
      .slice(1, close)
      .replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name) =>
        consts.has(name) ? consts.get(name) : whole,
      )
      .replace(/\$\{[^}]*\}/g, "*");
  } else if (/^["']/.test(a)) {
    const q = a[0];
    const endQ = a.indexOf(q, 1);
    if (endQ === -1) return null;
    s = a.slice(1, endQ);
    if (a.slice(endQ + 1).trim().startsWith("+")) s += "*";
  }
  if (s === null || !s.startsWith("/")) return null;
  return s.replace(/\/+$/, "") || "/";
}

/**
 * Every path-shaped first argument of a call inside `body`.
 *
 * Deliberately not restricted to `apiClient.get`: `hooks/api/sign/public.ts`
 * reaches the backend through a module-local `publicGet`, and a gate that only
 * knew `apiClient` would score those two reads "unresolved" and skip the very
 * routes it has to recognise as public.
 */
function pathsIn(body, consts) {
  const paths = [];
  const CALL_RE = /(?:\.\s*)?\b([A-Za-z_$][\w$]*)\s*(?:<[^<>()]*>)?\s*\(/g;
  let m;
  while ((m = CALL_RE.exec(body)) !== null) {
    const open = m.index + m[0].length - 1;
    const args = splitCallArgs(body, open);
    if (!args || args.length === 0) continue;
    const p = normalizePath(args[0], consts);
    if (p) paths.push(p);
  }
  return paths;
}

/**
 * Exported hook declarations with the source range attributed to each.
 *
 * A block runs from its `export` keyword to the start of the next top-level
 * `export`, NOT from its opening brace. Brace-matching is wrong here and was
 * measurably wrong: `export function useAllHrAnnouncements(options?: { enabled?:
 * boolean })` opens its first brace inside the PARAMETER TYPE, so a
 * brace-matched block covered `{ enabled?: boolean }` and the hook's reads fell
 * out of every block into module scope — where the gate scope becomes the whole
 * file and one unrelated `useCan` anywhere in it would launder them as gated.
 * Six real call sites landed there. A declaration-to-declaration span cannot be
 * fooled by a brace in a type, a return annotation or an arrow one-liner.
 */
function hookBlocks(src) {
  const decls = [];
  const EXPORT_RE = /^[ \t]*export\s+(?:const|(?:async\s+)?function)\s+(use\w+)\s*[=(]/gm;
  let match;
  while ((match = EXPORT_RE.exec(src)) !== null) decls.push({ name: match[1], start: match.index });
  const BOUNDARY_RE = /^[ \t]*export\b/gm;
  const boundaries = [];
  let b;
  while ((b = BOUNDARY_RE.exec(src)) !== null) boundaries.push(b.index);
  return decls.map((d) => ({
    name: d.name,
    start: d.start,
    end: boundaries.find((x) => x > d.start) ?? src.length,
  }));
}

function lineAt(src, index) {
  return src.slice(0, index).split("\n").length;
}

/**
 * Every raw read call site in one file, classified against the contract.
 *
 * A call site whose enclosing hook cannot be identified is still counted, with
 * the whole file as its gate scope — failing open there would let a read hide
 * inside a non-exported helper.
 */
function scanFile(relPath, rawSrc, index) {
  const src = stripComments(rawSrc);
  const consts = moduleConstants(src);
  const blocks = hookBlocks(src);
  const sites = [];

  READ_CALL_RE.lastIndex = 0;
  let m;
  while ((m = READ_CALL_RE.exec(src)) !== null) {
    const at = m.index;
    // `useQuery` inside an import list or a type position opens no call.
    const openParen = src.indexOf("(", at);
    if (openParen === -1) continue;
    const between = src.slice(at + m[0].length - 1, openParen);
    if (m[0].endsWith("<") && /[;{}]/.test(between)) continue;

    const owner = blocks.find((b) => at >= b.start && at < b.end);
    const gateScope = owner ? src.slice(owner.start, owner.end) : src;
    const gated = GATE_MARKERS.some((k) => gateScope.includes(k));

    const argText = src.slice(openParen, endOfCall(src, openParen));
    const literals = [...new Set(pathsIn(argText, consts))];

    const resolutions = literals.map((p) => ({ literal: p, hit: resolveOperation(index, "GET", p) }));
    const resolved = resolutions.filter((r) => r.hit !== null);

    let exposure;
    let permission = null;
    let route = null;
    if (resolutions.length === 0) exposure = "no-path";
    else if (resolved.length === 0) exposure = "absent";
    else {
      const exposures = new Set(resolved.map((r) => r.hit.op["x-exposure"] ?? "UNKNOWN"));
      exposure = exposures.size === 1 ? [...exposures][0] : "mixed";
      const perms = new Set(resolved.map((r) => r.hit.op["x-permission"]).filter(Boolean));
      permission = perms.size === 1 ? [...perms][0] : null;
      route = resolved[0].hit.path;
    }

    sites.push({
      file: relPath,
      line: lineAt(src, at),
      hook: owner?.name ?? "(module scope)",
      gated,
      exposure,
      permission,
      route,
      literals,
    });
  }
  return sites;
}

// ─────────────────────────────────────────────────────────────────────────────
// Walker
// ─────────────────────────────────────────────────────────────────────────────

function walkDir(dir, cb) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (isExcludedScanDir(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full, cb);
    else if (st.isFile() && (extname(entry) === ".ts" || extname(entry) === ".tsx")) cb(full);
  }
}

function collect(rootDir, index) {
  const all = [];
  for (const rel of SCAN_DIRS) {
    walkDir(join(rootDir, rel), (filePath) => {
      const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
      if (TEST_FILE_RE.test(relPath)) return;
      const src = readFileSync(filePath, "utf8");
      if (!/use(?:Infinite|Suspense)?Query/.test(src)) return;
      all.push(...scanFile(relPath, src, index));
    });
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// The gate the data layer cannot enforce — measured, never failed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `useGatedQuery` puts a `PermissionGate` on every result so a screen can tell
 * denied from empty. This counts the screens that actually read it.
 *
 * It NEVER fails the run. The residue is an `app/**` / `features/**` change
 * owned by ticket 30, and a gate that failed on another territory's number
 * would block work this script has no standing to block. It is printed because
 * the honest reading of "gated" is two properties, and this gate can only
 * enforce one of them: the read is suppressed. Whether anything downstream
 * SHOWS the refusal is what this line measures.
 */
function reportGateConsumption(rootDir) {
  let produced = 0;
  const consumers = new Set();
  for (const rel of ["hooks", "app", "features", "components"]) {
    walkDir(join(rootDir, rel), (filePath) => {
      const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
      if (TEST_FILE_RE.test(relPath)) return;
      const src = stripComments(readFileSync(filePath, "utf8"));
      if (relPath.startsWith("hooks/"))
        produced += (src.match(/\buseGatedQuery\s*(?:<|\()/g) ?? []).length;
      if (/\.access\.(?:denied|pending|allowed)\b/.test(src)) consumers.add(relPath);
    });
  }
  return { produced, consumers: [...consumers].sort() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test
// ─────────────────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test for check-gated-reads...\n");

  const synth = buildIndex({
    paths: {
      "/support/tickets": { get: { "x-exposure": "permissioned", "x-permission": "support:tickets:view" } },
      "/support/tickets/{id}": { get: { "x-exposure": "permissioned", "x-permission": "support:tickets:view" } },
      "/me/login-history": { get: { "x-exposure": "universal" } },
      "/public/sign/{token}/session": { get: { "x-exposure": "public" } },
      "/rbac/discovery/grantable": { get: { "x-exposure": "in-service" } },
    },
  });

  const one = (src, file = "hooks/api/x.ts") => scanFile(file, src, synth);

  const cases = [
    {
      label: "(a) a permissioned route on a raw useQuery is caught",
      src: `export function useTickets() {
        return useQuery({ queryKey: ["t"], queryFn: ({ signal }) => apiClient.get("/support/tickets", undefined, signal) });
      }`,
      expect: (s) => s.length === 1 && !s[0].gated && s[0].exposure === "permissioned" && s[0].permission === "support:tickets:view",
    },
    {
      label: "(b) the same route with a useCan gate is not counted as ungated",
      src: `export function useTickets() {
        const can = useCan("support:tickets:view");
        return useQuery({ queryKey: ["t"], enabled: can, queryFn: () => apiClient.get("/support/tickets") });
      }`,
      expect: (s) => s.length === 1 && s[0].gated,
    },
    {
      label: "(c) useGatedQuery is not a useQuery call site at all",
      src: `export function useTickets() {
        return useGatedQuery("support:tickets:view", { queryKey: ["t"], queryFn: () => apiClient.get("/support/tickets") });
      }`,
      expect: (s) => s.length === 0,
    },
    {
      label: "(d) a universal route needs no gate",
      src: `export function useLoginHistory() {
        return useQuery({ queryKey: ["l"], queryFn: () => apiClient.get("/me/login-history") });
      }`,
      expect: (s) => s.length === 1 && s[0].exposure === "universal",
    },
    {
      label: "(e) a PUBLIC route reached through a module-local helper is public, not permissioned",
      src: `export function useSignPublicSession(token) {
        return useQuery({ queryKey: ["s"], queryFn: () => publicGet(\`/public/sign/\${token}/session\`, "bad") });
      }`,
      expect: (s) => s.length === 1 && s[0].exposure === "public",
    },
    {
      label: "(f) an in-service route needs no gate",
      src: `export function useGrantable() {
        return useQuery({ queryKey: ["g"], queryFn: () => apiClient.get("/rbac/discovery/grantable") });
      }`,
      expect: (s) => s.length === 1 && s[0].exposure === "in-service",
    },
    {
      label: "(g) a path built from a module BASE const still resolves",
      src: `const BASE = "/support/tickets";
export function useTicket(id) {
  return useQuery({ queryKey: ["t", id], queryFn: () => apiClient.get(\`\${BASE}/\${id}\`) });
}`,
      expect: (s) => s.length === 1 && s[0].exposure === "permissioned",
    },
    {
      label: "(h) useInfiniteQuery and useSuspenseQuery are read call sites too",
      src: `export function useA() {
        return useInfiniteQuery({ queryKey: ["a"], queryFn: () => apiClient.get("/support/tickets") });
      }
export function useB() {
        return useSuspenseQuery({ queryKey: ["b"], queryFn: () => apiClient.get("/support/tickets") });
      }`,
      expect: (s) => s.length === 2 && s.every((x) => !x.gated && x.exposure === "permissioned"),
    },
    {
      label: "(i) the generic form useQuery<T, E>({...}) is seen",
      src: `export function useTickets() {
        return useQuery<Ticket[], Error>({ queryKey: ["t"], queryFn: () => apiClient.get("/support/tickets") });
      }`,
      expect: (s) => s.length === 1 && !s[0].gated && s[0].exposure === "permissioned",
    },
    {
      label: "(j) a route absent from the contract is 'absent', never silently permissioned",
      src: `export function useNothing() {
        return useQuery({ queryKey: ["n"], queryFn: () => apiClient.get("/no/such/route") });
      }`,
      expect: (s) => s.length === 1 && s[0].exposure === "absent",
    },
    {
      label: "(k) a raw useQuery beside a gated one in the same hook is NOT laundered",
      src: `export function useMixed() {
        const a = useGatedQuery("support:tickets:view", { queryKey: ["a"], queryFn: () => apiClient.get("/support/tickets") });
        const b = useQuery({ queryKey: ["b"], queryFn: () => apiClient.get("/support/tickets/9") });
        return { a, b };
      }`,
      expect: (s) => s.length === 1 && !s[0].gated,
    },
    {
      label: "(l) an apostrophe in a comment does not swallow the queryFn",
      src: `export function useTickets() {
        // the person's own ticket list
        return useQuery({ queryKey: ["t"], queryFn: () => apiClient.get("/support/tickets") });
      }`,
      expect: (s) => s.length === 1 && s[0].exposure === "permissioned",
    },
    {
      label: "(m) a bare useQuery import line is not a call site",
      src: `import { useQuery } from "@tanstack/react-query";
export function useNoop() { return 1; }`,
      expect: (s) => s.length === 0 || s.every((x) => x.exposure === "no-path"),
    },
  ];

  for (const c of cases) {
    const sites = one(c.src);
    assert(c.expect(sites), `${c.label}: got ${JSON.stringify(sites, null, 1)}`);
    console.log(`  ${c.label} → ok`);
  }

  // Attribution: a brace inside a PARAMETER TYPE must not end the hook's block,
  // and an unrelated useCan elsewhere in the file must not launder the read.
  const attributed = scanFile(
    "hooks/api/x.ts",
    `export function useGatedElsewhere() {
  const can = useCan("support:tickets:view");
  return can;
}

export function useAllThings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["a"],
    queryFn: () => apiClient.get("/support/tickets"),
    enabled: options?.enabled,
  });
}`,
    synth,
  );
  assert(
    attributed.length === 1 && attributed[0].hook === "useAllThings" && !attributed[0].gated,
    `braced parameter type must not drop the hook into module scope: ${JSON.stringify(attributed)}`,
  );
  console.log("  (o) a braced parameter type keeps the read attributed to its own hook → ok");

  // The matcher must not classify by an arbitrary pick when siblings disagree.
  const disagreeing = buildIndex({
    paths: {
      "/reports/alpha": { get: { "x-exposure": "permissioned", "x-permission": "a:view" } },
      "/reports/beta": { get: { "x-exposure": "public" } },
    },
  });
  const amb = scanFile(
    "hooks/api/x.ts",
    `export function useR(kind) { return useQuery({ queryKey: ["r"], queryFn: () => apiClient.get(\`/reports/\${kind}\`) }); }`,
    disagreeing,
  );
  assert(amb.length === 1 && amb[0].exposure === "absent", `disagreeing siblings must not resolve: ${JSON.stringify(amb)}`);
  console.log("  (n) disagreeing sibling routes resolve to nothing rather than a guess → ok");

  console.log(`\n✔ ${cases.length + 2} fixtures passed — check-gated-reads is live.\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function runMainScan() {
  const list = process.argv.includes("--list");
  console.log("Classifying raw reads under hooks/api/** against contracts/openapi.json...\n");

  const index = loadContract();
  const sites = collect(ROOT, index);

  if (sites.length < SCAN_FLOOR.minReadSites) {
    console.error(
      `FAIL: scan floor not met — found only ${sites.length} read call sites ` +
        `(expected ≥${SCAN_FLOOR.minReadSites}). The scanner is broken or the wrong directory was scanned.`,
    );
    process.exit(1);
  }

  const ungated = sites.filter((s) => !s.gated);
  const byExposure = new Map();
  for (const s of ungated) byExposure.set(s.exposure, (byExposure.get(s.exposure) ?? 0) + 1);

  const permissioned = ungated.filter((s) => s.exposure === "permissioned");
  const seenHeldBack = new Set();
  const seenExemptRoutes = new Set();
  const offenders = [];
  for (const s of permissioned) {
    if (HELD_BACK.has(s.file)) { seenHeldBack.add(s.file); continue; }
    if (s.route && EXEMPT_ROUTES.has(s.route)) { seenExemptRoutes.add(s.route); continue; }
    offenders.push(s);
  }

  console.log("=== Read call sites under hooks/api/** ===");
  console.log(`Total read call sites:      ${sites.length}`);
  console.log(`Ungated (no gate marker):   ${ungated.length}`);
  for (const [kind, count] of [...byExposure.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(kind).padEnd(24)} ${count}`);
  console.log();
  console.log(`Permissioned + ungated:     ${permissioned.length}`);
  console.log(`  held back (out of scope): ${permissioned.length - offenders.length}`);
  console.log(`  counted against baseline: ${offenders.length}   (baseline ${BASELINE.permissionedUngated})`);
  console.log();

  if (list || offenders.length > BASELINE.permissionedUngated) {
    const shown = list ? [...offenders, ...permissioned.filter((s) => HELD_BACK.has(s.file))] : offenders;
    for (const s of shown.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line)))
      console.log(
        `  ${s.file}:${s.line} ${s.hook} — ${s.route ?? s.literals.join(",")} needs "${s.permission}"` +
          (HELD_BACK.has(s.file) ? "  [HELD BACK]" : ""),
      );
    console.log();
  }

  const stale = [
    ...[...HELD_BACK.keys()].filter((f) => !seenHeldBack.has(f)).map((f) => `HELD_BACK: ${f}`),
    ...[...EXEMPT_ROUTES.keys()].filter((r) => !seenExemptRoutes.has(r)).map((r) => `EXEMPT_ROUTES: ${r}`),
  ];

  const { produced, consumers } = reportGateConsumption(ROOT);
  console.log(
    `NOTE (measured, never fails): ${produced} useGatedQuery reads each carry a PermissionGate; ` +
      `${consumers.length} non-test file(s) read it.`,
  );
  for (const c of consumers) console.log(`  reads the gate: ${c}`);
  console.log(
    "  This gate certifies request suppression, NOT that a screen renders the refusal.\n" +
      "  The unread gates are an app/** and features/** change — ticket 30, not this scanner.\n",
  );

  if (offenders.length > BASELINE.permissionedUngated) {
    console.error(
      `FAIL: ${offenders.length} permissioned read(s) ungated, above the recorded baseline of ` +
        `${BASELINE.permissionedUngated}. Convert them to useGatedQuery("<x-permission>", { ... }).`,
    );
    process.exit(1);
  }

  if (stale.length > 0) {
    console.error(
      `FAIL: ${stale.length} stale exception entr(y|ies) — the file is gone or is now gated. Delete the entry:`,
    );
    for (const s of stale) console.error(`  ${s}`);
    process.exit(1);
  }

  if (offenders.length < BASELINE.permissionedUngated) {
    console.error(
      `FAIL: ${offenders.length} permissioned ungated read(s) — BELOW the recorded baseline of ` +
        `${BASELINE.permissionedUngated}. Lower BASELINE.permissionedUngated to ${offenders.length} so the ratchet holds.`,
    );
    process.exit(1);
  }

  console.log(`PASS: permissioned ungated reads at the recorded baseline (${offenders.length}).`);
}

if (process.argv.includes("--self-test")) runSelfTest();
else runMainScan();
