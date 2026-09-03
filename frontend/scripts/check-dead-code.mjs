#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, resolve as pathResolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";
import { reportCorpus } from "./gate-corpus.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const NEXT_CONVENTION_STEMS = new Set([
  "page", "layout", "loading", "error", "not-found", "route", "template",
  "default", "global-error", "sitemap", "robots", "manifest", "icon",
  "apple-icon", "opengraph-image", "twitter-image",
]);

const CONTRACT_BARRELS = new Set([
  "components/shared/index.ts",
  "components/ai/index.ts",
  "components/illustrations/index.ts",
  "components/wizard-shell/index.ts",
  "components/labels/index.ts",
]);

const FEATURE_BARREL_RE = /^features\/[^/]+\/(?:[^/]+\/)?index\.ts$/;

const CRM_INVENTORY_RE =
  /^(?:hooks\/api\/crm\/|features\/crm\/|types\/crm\/|features\/inventory\/|hooks\/api\/inventory\/|hooks\/api\/leads\.)/;

const SCRIPTS_RE = /^scripts\//;

/**
 * The data-layer boundary surface. A TYPE exported from a live module here is
 * the shape of a validated API response — the `z.infer` of a contract, or a
 * fragment nested inside one. Consumers reach it through a hook's inferred
 * return type and never import it by name, so a module-graph tool reports every
 * one of them unused. That is a property of type erasure, not evidence of dead
 * code, and it was previously answered with one hand-written KEEP per type.
 *
 * The rule is deliberately limited to types. A VALUE exported here and imported
 * by nobody is a contract nothing parses with — an unvalidated boundary — and
 * must still fail the gate.
 */
const DATA_LAYER_CONTRACT_RE = /^hooks\/api\//;

const TEST_INFRA_RE = /^test-utils\//;

const PRE_IMPLEMENTATION_CONTRACTS = new Set([
  "lib/backend-token-contract.ts",
]);



const BASELINE = { deadFiles: 0, deadExports: 0 };

const SCAN_FLOOR = { knipTotal: 5, graphFiles: 100, graphEdges: 300 };

/**
 * Hand-written verdicts are now the exception. Every data-layer type that used
 * to need one is answered structurally by DATA_LAYER_CONTRACT_RE above; what is
 * left is the handful outside `hooks/api/`.
 *
 * TWO KEY SPACES:
 *   `<relative path>:<symbol>`  a file-scoped export or type
 *   `dep:<package name>`        a package.json finding — an unused, unlisted, unresolved
 *                               dependency or binary. Added 2026-09-03: this gate read only
 *                               knip's `files`, `exports` and `types` groups, so the frontend's
 *                               114 declared dependencies were classified by NO wired gate at
 *                               all, and knip's `binaries` finding on this very package.json
 *                               went unread. The backend twin has iterated all nine groups since
 *                               its own version of this defect was found.
 *
 * A `dep:` verdict is subject to the same staleness check as every other: when the package stops
 * being reported (someone imports it, or it is removed), the verdict goes stale and the gate bites,
 * so a suppression cannot outlive its reason. That is what makes this a ledger rather than an
 * ignore list — knip.json's `ignoreDependencies` held these three with no recorded reason and no
 * expiry, which is the unexplained-suppression shape PRD-C036 forbids.
 */
const EXPORT_VERDICTS = new Map([

  ["dep:sharp", { verdict: "KEEP", reason: "Next.js's image optimiser loads sharp itself at runtime, by name, from the server bundle — there is no import of it in this repo and there must not be one. Removing it makes next/image fall back to the slow unoptimised path in production. Stale the day next/image is no longer used or Next bundles its own encoder" }],
  ["dep:tailwindcss", { verdict: "KEEP", reason: "loaded by CSS, not by the module graph: globals.css line 1 is `@import \"tailwindcss\"`, resolved by @tailwindcss/postcss at build time. knip reads TypeScript imports and cannot see a CSS @import. Stale the day the project stops importing tailwind from CSS" }],
  ["dep:@tailwindcss/typography", { verdict: "KEEP", reason: "same shape one line further down: globals.css line 3 is `@plugin \"@tailwindcss/typography\"`, a Tailwind 4 CSS-first plugin registration with no JS import anywhere. Stale the day that @plugin line is removed" }],
  ["dep:feedbucket-widget", { verdict: "KEEP", reason: "not a binary. knip parses package.json script strings as shell, and `check:cycles` passes madge `--exclude \"node_modules|\\.next|feedbucket-widget\"`; the `|` characters read as pipeline separators, so the last alternative of the regex is reported as a command being run. It is a directory name inside a regex. Stale the day that --exclude pattern changes shape" }],

  ["lib/command-catalog.ts:NotificationCommandName", { verdict: "KEEP", reason: "keyof typeof NOTIFICATION_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:ChatCommandName", { verdict: "KEEP", reason: "keyof typeof CHAT_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:CommandDomain", { verdict: "KEEP", reason: "keyof typeof ALL_COMMANDS — available for consumers that iterate over command domains" }],
  ["features/hr/expenses/expense-constants.ts:ReceiptFileKind", { verdict: "KEEP", reason: "re-exported type from lib/expense-receipts; provides stable import path for consumers that need the kind union without importing the full receipts module" }],
  ["hooks/api/meetings-ai.ts:useMeetingFollowUp", { verdict: "KEEP", reason: "the buffered POST /ai/meetings/follow-up client, deliberately kept beside streamMeetingFollowUp now that meeting-follow-up-panel streams; the buffered route returns a Zod-validated record this release does not stream, and a previous pass deleted a buffered hook before its surface had moved and broke the live panel" }],
  ["hooks/api/kb/page-ai.ts:useKbPageImprove", { verdict: "KEEP", reason: "the buffered POST /kb/pages/:id/ai/improve client, kept beside streamKbDocAi now that the KB page AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/page-ai.ts:useKbPageSuggestRelated", { verdict: "KEEP", reason: "the buffered POST /kb/pages/:id/ai/suggest-related client, kept beside streamKbDocAi now that the KB page AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleAsk", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/ask client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleImprove", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/improve client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleSuggestRelated", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/suggest-related client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
]);

function checkStaleVerdicts(verdicts, processedKeys) {
  const stale = [];
  for (const key of verdicts.keys()) {
    if (!processedKeys.has(key)) stale.push(key);
  }
  return stale;
}

function toFwd(p) {
  return p.replace(/\\/g, "/");
}

function tryFile(p) {
  try {
    const s = statSync(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

function findFile(spec, fromDir, root) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = pathResolve(fromDir, spec);
  else return null;

  if (tryFile(base)) return base;
  for (const ext of [".ts", ".tsx"]) {
    const r = tryFile(base + ext);
    if (r) return r;
  }
  const idxTs = join(base, "index.ts");
  if (tryFile(idxTs)) return idxTs;
  const idxTsx = join(base, "index.tsx");
  if (tryFile(idxTsx)) return idxTsx;
  return null;
}

function* walkTs(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (isExcludedScanDir(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkTs(full);
    else if (/\.(ts|tsx)$/.test(e.name)) yield full;
  }
}

/**
 * `stats` is filled in place rather than returned, so the corpus line can report how much of the
 * tree the graph actually read without changing this function's return type (the self-test drives
 * it directly). `walked` counts every TS/TSX file offered; `read` counts the ones whose source was
 * parsed for imports — a file that fails to read contributes no edges and is silently absent from
 * the graph, which is precisely the kind of gap a gate must name rather than absorb.
 */
function buildImporterMap(root, stats = { walked: 0, read: 0 }) {
  const map = new Map();

  function record(target, importer, kind) {
    if (!target) return;
    if (!map.has(target)) {
      map.set(target, { sideEffect: new Set(), named: new Set(), reexport: new Set(), dynamic: new Set() });
    }
    map.get(target)[kind].add(importer);
  }

  for (const file of walkTs(root)) {
    stats.walked++;
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    stats.read++;
    const fromDir = dirname(file);

    for (const line of src.split("\n")) {
      const m = line.match(/^\s*import\s+["']([^"']+)["']\s*;?\s*$/);
      if (m) record(findFile(m[1], fromDir, root), file, "sideEffect");
    }

    let m;
    const namedRe = /^import\s+(?:type\s+)?(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/gm;
    while ((m = namedRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "named");
    }

    const reRe = /^export\s+(?:type\s+)?(?:\{[^}]+\}|\*[^"'\n]*)\s+from\s+["']([^"']+)["']/gm;
    while ((m = reRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "reexport");
    }

    const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = dynRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "dynamic");
    }
  }

  return map;
}

function classifyFile(relPath, knipDeadSet, importerMap, root) {
  const stem = basename(relPath).replace(/\.[^.]+$/, "");
  // Path-classified, anchored: a file under a generated/scratch/vendor directory
  // is not authored product source, so knip's verdict on it says nothing about
  // this codebase. Segment-wise so an authored `next-intl/` is never swallowed.
  if (relPath.split("/").some((seg) => isExcludedScanDir(seg))) {
    return { cls: "OUT-OF-SCOPE", reason: "generated, vendored or scratch path — not authored product source" };
  }
  if (NEXT_CONVENTION_STEMS.has(stem)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "Next.js filesystem entry convention" };
  }
  if (SCRIPTS_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "standalone executable script, not a module" };
  }
  if (TEST_INFRA_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; no current consumer — the path exists for future tests" };
  }
  if (PRE_IMPLEMENTATION_CONTRACTS.has(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "AR-01 pre-implementation contract — consumers are being written in the token-authority lane; no importers yet is the expected state" };
  }

  const absPath = join(root, ...relPath.split("/"));
  const entry = importerMap.get(absPath);

  if (entry) {
    for (const [kind, importers] of Object.entries(entry)) {
      for (const imp of importers) {
        const impRel = toFwd(relative(root, imp));
        if (!knipDeadSet.has(impRel)) {
          const reason =
            kind === "sideEffect" ? `side-effect import from live file (${impRel})`
            : kind === "reexport" ? `re-exported from live barrel (${impRel})`
            : kind === "dynamic" ? `dynamic import from live file (${impRel})`
            : `named import from live file (${impRel})`;
          return { cls: "RETAINED-BY-CONTRACT", reason };
        }
      }
    }
  }

  return { cls: "DEAD", reason: "no live importers found in module graph" };
}

/**
 * The knip issue groups this gate reads, and the key space each one lands in.
 *
 * It used to read three of them. `dependencies`, `devDependencies`, `optionalPeerDependencies`,
 * `unlisted`, `unresolved` and `binaries` were never looked at, so no wired gate classified a
 * single one of the 114 declared dependencies — an unused dependency landing tomorrow would ship,
 * inflate the install and the lockfile, and nothing would object. `enumMembers`, `namespaceMembers`
 * and `duplicates` were unread for the same reason; they are empty today, which is a fact this
 * gate should be able to assert rather than a fact it cannot see.
 */
const DEPENDENCY_GROUPS = ["unlisted", "dependencies", "devDependencies", "optionalPeerDependencies", "unresolved", "binaries"];
const SYMBOL_GROUPS = ["exports", "types", "enumMembers", "namespaceMembers", "duplicates"];

/** The ledger key for a finding: dependencies are package-scoped, everything else file-scoped. */
function verdictKey(item) {
  return item.depKey ? `dep:${item.name}` : `${item.file}:${item.name}`;
}

/** How many packages the dependency half of this gate is answerable for. Narrative, never a gate. */
function declaredDependencyCount(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
  } catch {
    return 0;
  }
}

function classifyExport(filePath, name, verdicts = EXPORT_VERDICTS, kind = "export", knipDeadSet = new Set(), depKey = false) {
  if (depKey) {
    // A package finding has no source path to classify by — package.json matches none of the
    // path rules below, and letting it fall through them would be classification by accident.
    // The ledger is the only thing that can answer it.
    const entry = verdicts.get(`dep:${name}`);
    if (entry) return { cls: entry.verdict, reason: entry.reason };
    return {
      cls: "UNCLASSIFIED",
      reason: `no verdict recorded for dep:${name}; add a WIRE/KEEP entry to EXPORT_VERDICTS with a written reason, or remove the dependency`,
    };
  }
  if (CONTRACT_BARRELS.has(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "named intentional barrel" };
  }
  if (FEATURE_BARREL_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "feature barrel extension point" };
  }
  if (TEST_INFRA_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; exports are available for all test suites" };
  }
  if (CRM_INVENTORY_RE.test(filePath)) {
    return { cls: "EXCLUDED", reason: "CRM/Inventory excluded from PRD scope; not counted in dead-code baseline" };
  }
  if (
    kind === "type" &&
    DATA_LAYER_CONTRACT_RE.test(filePath) &&
    !knipDeadSet.has(filePath)
  ) {
    return {
      cls: "RETAINED-BY-CONTRACT",
      reason: "type erased at the boundary: the inferred shape of a live data-layer contract, reached through the hook's return type rather than by name",
    };
  }
  const key = `${filePath}:${name}`;
  if (verdicts.has(key)) {
    const { verdict, reason } = verdicts.get(key);
    return { cls: verdict, reason };
  }
  return { cls: "UNCLASSIFIED", reason: "no verdict recorded in EXPORT_VERDICTS; add a WIRE/KEEP entry to resolve" };
}

/**
 * Counted, not narrated. The PASS line used to print a hard-coded "(18 assertions)" while the
 * body ran 21 — the exact shape v2 ticket 30 was asked to sweep for (a backend self-test once
 * printed 27 while its own list named 30). A number that cannot move is not a measurement.
 */
let assertionsRun = 0;
function assert(cond, msg) {
  assertionsRun++;
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthRoot = join(sep === "\\" ? "C:\\synthetic" : "/synthetic");
  const knipDeadSet = new Set(["dead.ts", "side-effect-dep.ts", "reexport-source.ts"]);

  const sideEffectDepAbs = join(synthRoot, "side-effect-dep.ts");
  const reexportSourceAbs = join(synthRoot, "reexport-source.ts");
  const liveEntryAbs = join(synthRoot, "live-entry.ts");
  const liveBarrelAbs = join(synthRoot, "live-barrel.ts");

  const synthMap = new Map([
    [
      sideEffectDepAbs,
      { sideEffect: new Set([liveEntryAbs]), named: new Set(), reexport: new Set(), dynamic: new Set() },
    ],
    [
      reexportSourceAbs,
      { sideEffect: new Set(), named: new Set(), reexport: new Set([liveBarrelAbs]), dynamic: new Set() },
    ],
  ]);

  const r1 = classifyFile("dead.ts", knipDeadSet, synthMap, synthRoot);
  const r2 = classifyFile("side-effect-dep.ts", knipDeadSet, synthMap, synthRoot);
  const r3 = classifyFile("reexport-source.ts", knipDeadSet, synthMap, synthRoot);

  assert(r1.cls === "DEAD",
    `(a) dead.ts → expected DEAD, got ${r1.cls}`);
  assert(r2.cls === "RETAINED-BY-CONTRACT",
    `(b) side-effect-dep.ts → expected RETAINED-BY-CONTRACT, got ${r2.cls}`);
  assert(r3.cls === "RETAINED-BY-CONTRACT",
    `(c) reexport-source.ts → expected RETAINED-BY-CONTRACT, got ${r3.cls}`);

  const r4 = classifyExport("features/some-feature/index.ts", "SomeThing");
  assert(r4.cls === "RETAINED-BY-CONTRACT",
    `(d) feature barrel export → expected RETAINED-BY-CONTRACT, got ${r4.cls}`);

  const r5 = classifyExport("hooks/api/crm/metadata.ts", "SomeExport");
  assert(r5.cls === "EXCLUDED",
    `(e) CRM export → expected EXCLUDED, got ${r5.cls}`);

  const r6 = classifyExport("hooks/api/some-new-hook.ts", "useNewHook");
  assert(r6.cls === "UNCLASSIFIED",
    `(i) unclassified export → expected UNCLASSIFIED (gate would fail), got ${r6.cls}`);

  const synthVerdicts = new Map([
    ["hooks/api/workflows.ts:useWorkflowSchedules", { verdict: "DEFERRED", reason: "planned schedule-management UI — hook stub exists, page not yet implemented" }],
  ]);
  const r7 = classifyExport("hooks/api/workflows.ts", "useWorkflowSchedules", synthVerdicts);
  assert(r7.cls === "DEFERRED",
    `(j) DEFERRED verdict → expected DEFERRED, got ${r7.cls}`);

  const r8 = classifyExport("lib/command-catalog.ts", "CommandDomain");
  assert(r8.cls === "KEEP",
    `(k) KEEP verdict → expected KEEP, got ${r8.cls}`);

  const r8a = classifyExport("hooks/api/payroll/runs-schema.ts", "PayrollRunListItem", EXPORT_VERDICTS, "type");
  assert(r8a.cls === "RETAINED-BY-CONTRACT",
    `(o) a data-layer TYPE in a live module → expected RETAINED-BY-CONTRACT, got ${r8a.cls}`);

  const r8b = classifyExport("hooks/api/payroll/runs-schema.ts", "payrollRunListItemContract", EXPORT_VERDICTS, "export");
  assert(r8b.cls === "UNCLASSIFIED",
    `(p) BITE: a data-layer VALUE nothing imports is an unvalidated boundary → expected UNCLASSIFIED, got ${r8b.cls}`);

  const r8c = classifyExport(
    "hooks/api/ghost-schema.ts", "GhostRow", EXPORT_VERDICTS, "type",
    new Set(["hooks/api/ghost-schema.ts"]),
  );
  assert(r8c.cls === "UNCLASSIFIED",
    `(q) BITE: a type in a module NO live file imports is not retained → expected UNCLASSIFIED, got ${r8c.cls}`);

  const r8d = classifyExport("types/payroll/ess.ts", "EssSalaryComponent", EXPORT_VERDICTS, "type");
  assert(r8d.cls === "UNCLASSIFIED",
    `(r) the rule does NOT extend past hooks/api → expected UNCLASSIFIED, got ${r8d.cls}`);

  const fakeVerdicts = new Map([["hooks/api/ghost.ts:useGhost", { verdict: "WIRE", reason: "test" }]]);
  const stale = checkStaleVerdicts(fakeVerdicts, new Set());
  assert(stale.length === 1 && stale[0] === "hooks/api/ghost.ts:useGhost",
    `(l) stale verdict detection → expected [hooks/api/ghost.ts:useGhost], got [${stale.join(",")}]`);

  /*
   * THE DEPENDENCY HALF (2026-09-03).
   *
   * This gate read three of knip's issue groups and none of the six that carry package findings,
   * so 114 declared dependencies were classified by nothing. Measured before the fix: knip already
   * reported `binaries: feedbucket-widget` on this repo's own package.json and the gate printed
   * that finding nowhere. These pin both directions — a package with no verdict must bite, and a
   * package finding must NOT be answered by the path rules that classify source files.
   */
  const depUnknown = classifyExport("package.json", "left-pad", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depUnknown.cls === "UNCLASSIFIED",
    `(s) BITE: an unused dependency with no verdict → expected UNCLASSIFIED, got ${depUnknown.cls}`);
  assert(depUnknown.reason.includes("dep:left-pad"),
    `(t) the unclassified reason names the dep: key to add, got "${depUnknown.reason}"`);

  const depKnown = classifyExport("package.json", "sharp", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depKnown.cls === "KEEP",
    `(u) a dependency with a recorded verdict → expected KEEP, got ${depKnown.cls}`);
  assert(depKnown.reason.length > 40,
    `(v) a dependency verdict carries a WRITTEN reason, not a bare suppression (got ${depKnown.reason.length} chars)`);

  const depBinary = classifyExport("package.json", "feedbucket-widget", EXPORT_VERDICTS, "binaries", new Set(), true);
  assert(depBinary.cls === "KEEP",
    `(w) the binaries finding this gate never read → expected KEEP, got ${depBinary.cls}`);

  // Same name, source key space: the path rules must still answer it, and must not be reachable
  // from a package finding. `test-utils/x.ts` is RETAINED-BY-CONVENTION as a file path, but the
  // identical name under `dep:` has no verdict and must bite.
  const depNotPathClassified = classifyExport("test-utils/index.ts", "makeQueryClient", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depNotPathClassified.cls === "UNCLASSIFIED",
    `(x) a package finding must NOT be answered by a source-path rule → expected UNCLASSIFIED, got ${depNotPathClassified.cls}`);

  assert(verdictKey({ file: "package.json", name: "sharp", depKey: true }) === "dep:sharp",
    "(y) a dependency finding keys into the dep: space");
  assert(verdictKey({ file: "hooks/api/x.ts", name: "useX" }) === "hooks/api/x.ts:useX",
    "(z) a source finding keys into the file:symbol space");

  const staleDep = checkStaleVerdicts(new Map([["dep:sharp", { verdict: "KEEP", reason: "r" }]]), new Set());
  assert(staleDep.length === 1 && staleDep[0] === "dep:sharp",
    `(aa) BITE: a dep: verdict knip no longer reports goes stale → expected [dep:sharp], got [${staleDep.join(",")}]`);

  // Every group the gate claims to read must land somewhere. A group added to one list and not the
  // other would be silently unread again.
  assert(DEPENDENCY_GROUPS.length === 6 && SYMBOL_GROUPS.length === 5,
    `(ab) all nine knip issue groups plus files are wired (${DEPENDENCY_GROUPS.length}+${SYMBOL_GROUPS.length})`);
  for (const group of ["dependencies", "devDependencies", "optionalPeerDependencies", "unlisted", "unresolved", "binaries"])
    assert(DEPENDENCY_GROUPS.includes(group), `(ac) knip group ${group} is read by this gate`);

  // The three suppressions that used to live in knip.json with no recorded reason now live here
  // WITH one, and a suppression without a reason is not a suppression this gate accepts.
  for (const dep of ["sharp", "tailwindcss", "@tailwindcss/typography"]) {
    const entry = EXPORT_VERDICTS.get(`dep:${dep}`);
    assert(entry !== undefined, `(ad) ${dep} moved out of knip.json ignoreDependencies into the ledger`);
    assert(entry !== undefined && entry.reason.length > 40,
      `(ae) the ${dep} verdict records WHY, which ignoreDependencies could not`);
  }
  const knipConfig = JSON.parse(readFileSync(join(ROOT, "knip.json"), "utf8"));
  assert(knipConfig.ignoreDependencies === undefined,
    "(af) knip.json declares no unexplained ignoreDependencies — the ledger owns them, and a ledger entry goes stale when its reason expires");

  // The graph stats the corpus line reports must actually be filled.
  const statProbe = { walked: 0, read: 0 };
  buildImporterMap(join(ROOT, "test-utils"), statProbe);
  assert(statProbe.walked > 0 && statProbe.read === statProbe.walked,
    `(ag) the module-graph corpus counts every file walked and read (${statProbe.read}/${statProbe.walked})`);

  const rScratch = classifyFile(".scratch/mint-session.mjs", new Set([".scratch/mint-session.mjs"]), new Map(), synthRoot);
  assert(rScratch.cls === "OUT-OF-SCOPE",
    `(m0) a scratch path → expected OUT-OF-SCOPE, got ${rScratch.cls}`);

  const rGen = classifyFile(".next-buildmart/dev/chunk.js", new Set([".next-buildmart/dev/chunk.js"]), new Map(), synthRoot);
  assert(rGen.cls === "OUT-OF-SCOPE",
    `(m1) a generated build path → expected OUT-OF-SCOPE, got ${rGen.cls}`);

  const rAuthored = classifyFile("features/next-intl-shim/thing.ts", new Set(["features/next-intl-shim/thing.ts"]), new Map(), synthRoot);
  assert(rAuthored.cls === "DEAD",
    `(m2) an authored dir merely starting with "next-" must NOT be swallowed by the exclusion, got ${rAuthored.cls}`);

  const r9 = classifyFile("test-utils/render.tsx", new Set(), new Map(), synthRoot);
  assert(r9.cls === "RETAINED-BY-CONVENTION",
    `(m) test-infra file → expected RETAINED-BY-CONVENTION, got ${r9.cls}`);

  const r10 = classifyExport("test-utils/index.ts", "makeQueryClient");
  assert(r10.cls === "RETAINED-BY-CONVENTION",
    `(n) test-infra export → expected RETAINED-BY-CONVENTION, got ${r10.cls}`);

  const fixtureDir = join(tmpdir(), `dead-code-self-test-${Date.now()}`);
  try {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, "entry.ts"),
      'import x from "./a";\nimport "./b";\nexport * from "./c";\n');
    writeFileSync(join(fixtureDir, "a.ts"), "export default 1;\n");
    writeFileSync(join(fixtureDir, "b.ts"), "export {};\n");
    writeFileSync(join(fixtureDir, "c.ts"), "export const C = 1;\n");

    const fixMap = buildImporterMap(fixtureDir);
    const entryAbs = join(fixtureDir, "entry.ts");
    const aAbs = join(fixtureDir, "a.ts");
    const bAbs = join(fixtureDir, "b.ts");
    const cAbs = join(fixtureDir, "c.ts");

    assert(fixMap.has(aAbs) && fixMap.get(aAbs).named.has(entryAbs),
      "(f) buildImporterMap: named import edge a.ts ← entry.ts not recorded");
    assert(fixMap.has(bAbs) && fixMap.get(bAbs).sideEffect.has(entryAbs),
      "(g) buildImporterMap: side-effect import edge b.ts ← entry.ts not recorded");
    assert(fixMap.has(cAbs) && fixMap.get(cAbs).reexport.has(entryAbs),
      "(h) buildImporterMap: re-export edge c.ts ← entry.ts not recorded");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log(`PASS: self-test (${assertionsRun} assertions)\n`);
  console.log("  (a) file with no live importers                       → DEAD");
  console.log("  (b) file reachable via side-effect import             → RETAINED-BY-CONTRACT");
  console.log("  (c) file reachable via re-export from live barrel     → RETAINED-BY-CONTRACT");
  console.log("  (d) export from feature barrel                        → RETAINED-BY-CONTRACT");
  console.log("  (e) export from CRM domain                            → EXCLUDED");
  console.log("  (f) buildImporterMap: named import edge recorded");
  console.log("  (g) buildImporterMap: side-effect import edge recorded");
  console.log("  (h) buildImporterMap: re-export edge recorded");
  console.log("  (i) export with no EXPORT_VERDICTS entry              → UNCLASSIFIED (gate bites)");
  console.log("  (j) export with DEFERRED verdict in EXPORT_VERDICTS   → DEFERRED");
  console.log("  (k) export with KEEP verdict in EXPORT_VERDICTS       → KEEP");
  console.log("  (l) EXPORT_VERDICTS entry not in knip output          → stale (gate bites)");
  console.log("  (m) test-utils file                                   → RETAINED-BY-CONVENTION");
  console.log("  (n) test-utils export                                 → RETAINED-BY-CONVENTION");
  console.log("  (o) data-layer TYPE in a live module                  → RETAINED-BY-CONTRACT");
  console.log("  (p) data-layer VALUE nothing imports                  → UNCLASSIFIED (gate bites)");
  console.log("  (q) TYPE in a module no live file imports             → UNCLASSIFIED (gate bites)");
  console.log("  (r) a TYPE outside hooks/api                          → UNCLASSIFIED (rule is scoped)");
  console.log("  (s) unused dependency with no verdict                 → UNCLASSIFIED (gate bites)");
  console.log("  (u) dependency with a written verdict                 → KEEP");
  console.log("  (w) the knip `binaries` finding, previously unread    → KEEP");
  console.log("  (x) a package finding is not answered by a path rule  → UNCLASSIFIED");
  console.log("  (aa) a dep: verdict knip no longer reports            → stale (gate bites)");
  console.log("  (af) knip.json carries no unexplained ignoreDependencies");
}

async function runMain() {
  let knipJson;
  try {
    let rawOut;
    try {
      rawOut = execSync("pnpm exec knip --no-progress --reporter json", {
        cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      rawOut = e.stdout;
      if (!rawOut) { console.error("knip run failed:", e.stderr ?? e.message); process.exit(1); }
    }
    knipJson = JSON.parse(rawOut);
  } catch (e) {
    console.error("knip JSON parse failed:", e.message);
    process.exit(1);
  }

  const issues = knipJson.issues ?? [];
  const deadFileRels = [];
  const deadExportItems = [];

  // Every array-valued group knip emits, so a group added upstream shows up as an unread corpus
  // gap in the corpus line rather than as silence.
  const groupsSeen = new Map();
  for (const issue of issues) {
    for (const [group, value] of Object.entries(issue))
      if (Array.isArray(value)) groupsSeen.set(group, (groupsSeen.get(group) ?? 0) + value.length);

    for (const f of issue.files ?? []) deadFileRels.push(f.name ?? f);
    for (const group of SYMBOL_GROUPS)
      for (const item of issue[group] ?? [])
        deadExportItems.push({
          file: issue.file,
          name: item.name ?? String(item),
          kind: group === "exports" ? "export" : group === "types" ? "type" : group.replace(/s$/, ""),
        });
    for (const group of DEPENDENCY_GROUPS)
      for (const item of issue[group] ?? [])
        deadExportItems.push({ file: issue.file, name: item.name ?? String(item), kind: group, depKey: true });
  }

  const knipDeadSet = new Set(deadFileRels);

  const knipTotal = deadFileRels.length + deadExportItems.length;
  if (knipTotal < SCAN_FLOOR.knipTotal) {
    console.error(
      `FAIL: knip returned only ${deadFileRels.length} files and ` +
      `${deadExportItems.length} exports/types — scan looks broken, not clean.`
    );
    process.exit(1);
  }

  console.log("Building import graph (scanning all TS/TSX files)...");
  const graphStats = { walked: 0, read: 0 };
  const importerMap = buildImporterMap(ROOT, graphStats);

  const graphFileCount = importerMap.size;
  let graphEdgeCount = 0;
  for (const entry of importerMap.values()) {
    for (const set of Object.values(entry)) graphEdgeCount += set.size;
  }
  if (graphFileCount < SCAN_FLOOR.graphFiles || graphEdgeCount < SCAN_FLOOR.graphEdges) {
    console.error(
      `FAIL: module-graph walk resolved only ${graphFileCount} files / ` +
      `${graphEdgeCount} import edges — scan looks broken.`
    );
    process.exit(1);
  }

  const buckets = {
    "DEAD": [],
    "OUT-OF-SCOPE": [],
    "RETAINED-BY-CONTRACT": [],
    "RETAINED-BY-CONVENTION": [],
    "WIRE": [],
    "DEFERRED": [],
    "KEEP": [],
    "EXCLUDED": [],
    "UNCLASSIFIED": [],
  };

  for (const rel of deadFileRels) {
    const r = classifyFile(rel, knipDeadSet, importerMap, ROOT);
    buckets[r.cls].push({ type: "file", path: rel, reason: r.reason });
  }

  const processedVerdictKeys = new Set();

  for (const ex of deadExportItems) {
    const r = classifyExport(ex.file, ex.name, EXPORT_VERDICTS, ex.kind, knipDeadSet, ex.depKey === true);
    if (r.cls === "WIRE" || r.cls === "DEFERRED" || r.cls === "KEEP") {
      processedVerdictKeys.add(verdictKey(ex));
    }
    buckets[r.cls].push({ type: ex.kind, path: ex.file, name: ex.name, reason: r.reason });
  }

  const staleVerdicts = checkStaleVerdicts(EXPORT_VERDICTS, processedVerdictKeys);

  console.log("\n=== Dead Code Classification ===\n");

  /*
   * Say how much of knip's report was read before saying what was in it. The gate read three of
   * knip's groups and printed "knip raw: files=… exports=… types=…", a denominator made of its own
   * filtered subset — the exact shape gate-corpus.mjs exists to stop. `total` here is every finding
   * knip emitted, in every array-valued group; `scanned` is the ones this gate classified. They
   * are equal only because the six dependency groups were wired in.
   */
  const knipReported = [...groupsSeen.values()].reduce((a, b) => a + b, 0);
  const knipRead = deadFileRels.length + deadExportItems.length;
  reportCorpus({ gate: "check-dead-code (knip findings)", scanned: knipRead, total: knipReported, unit: "finding" });
  reportCorpus({ gate: "check-dead-code (module graph)", scanned: graphStats.read, total: graphStats.walked, unit: "file" });

  const byGroup = [...groupsSeen.entries()].filter(([, n]) => n > 0).map(([g, n]) => `${g}=${n}`);
  console.log(`knip raw: ${byGroup.join(" ") || "(no findings)"}`);
  console.log(
    `dependency groups read: ${DEPENDENCY_GROUPS.join(", ")} — ` +
      `${deadExportItems.filter((e) => e.depKey).length} finding(s) over ${declaredDependencyCount(ROOT)} declared dependencies`,
  );

  for (const [label, items] of Object.entries(buckets)) {
    console.log(`\n${label} (${items.length}):`);
    if (items.length === 0) { console.log("  (none)"); continue; }
    for (const it of items) {
      const name = it.name ? `:${it.name}` : "";
      console.log(`  [${it.type}] ${it.path}${name}  — ${it.reason}`);
    }
  }

  const deadFiles = buckets["DEAD"].filter((i) => i.type === "file").length;
  const deadExports = buckets["DEAD"].filter((i) => i.type !== "file").length;

  console.log(`\n=== Baseline: files=${BASELINE.deadFiles} exports=${BASELINE.deadExports} ===`);
  console.log(`=== Current:  files=${deadFiles} exports=${deadExports} ===`);

  if (staleVerdicts.length > 0) {
    console.error(
      `\nFAIL: ${staleVerdicts.length} stale EXPORT_VERDICTS entr${staleVerdicts.length === 1 ? "y" : "ies"} ` +
      `(export no longer dead — remove from EXPORT_VERDICTS or confirm it regressed):`
    );
    for (const key of staleVerdicts) console.error(`  ${key}`);
    process.exit(1);
  }

  if (buckets["UNCLASSIFIED"].length > 0) {
    console.error(
      `\nFAIL: ${buckets["UNCLASSIFIED"].length} unclassified export(s) — add a WIRE or KEEP entry to EXPORT_VERDICTS for each:`
    );
    for (const it of buckets["UNCLASSIFIED"]) {
      console.error(`  ${it.path}:${it.name}`);
    }
    process.exit(1);
  }

  if (deadFiles > BASELINE.deadFiles || deadExports > BASELINE.deadExports) {
    console.error("\nFAIL: dead code count exceeds baseline. New dead code introduced.");
    process.exit(1);
  }

  console.log("\nPASS: dead code within baseline.");
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runMain().catch((e) => { console.error(e); process.exit(1); });
}
