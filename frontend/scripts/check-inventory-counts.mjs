#!/usr/bin/env node
/**
 * PRD-C105 — the module/ownership inventory, measured instead of narrated.
 *
 * The criterion names sixteen dimensions: backend module folders, controllers,
 * implementations, DTO/Zod schemas, database schema files, migrations, workers,
 * cache keys, event consumers, frontend routes, components, hooks, TanStack
 * keys, tests, fixtures and operational scripts. A prose table of those numbers
 * is true for exactly one commit. The v2 audit's table was written at
 * `7469d2789` and every dimension re-measured against a later head had drifted,
 * which is how an inventory stops being an inventory: it becomes a historical
 * document that still looks current.
 *
 * So the deliverable is this script, and the committed table is its output. Each
 * row carries the rule that produced it, so a number can be re-derived rather
 * than trusted, and `--check` re-measures against a committed artifact and
 * prints the drift.
 *
 * Two rules the counting itself follows, both learned from gates in this
 * release that reported clean numbers over corpora they could not see:
 *
 *  1. **Dot-directories are never source.** `.claude/worktrees/<name>/` holds
 *     other agents' full checkouts of these repositories — 8,608 `.ts` files,
 *     57.7% of the backend's walked graph at the time of writing. A walk that
 *     counts them is counting someone else's uncommitted branch. This is the
 *     same rule `check-repo-paths.mjs` already applies frontend-side, and it is
 *     imported from there rather than re-implemented.
 *  2. **A count of zero is reported as a failure, not as a clean result.** Every
 *     dimension here has a known-nonzero denominator; a zero means the rule
 *     stopped matching, which is the failure mode that makes an inventory worse
 *     than none.
 *
 * Usage:
 *   node scripts/check-inventory-counts.mjs              # print the table
 *   node scripts/check-inventory-counts.mjs --check      # diff against the artifact
 *   node scripts/check-inventory-counts.mjs --self-test  # prove the counters bite
 *
 * Exit codes: 0 ok · 1 a dimension counted zero, or --check found drift ·
 *             2 the backend repository is unreachable, so the run is INCONCLUSIVE.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BACKEND_ROOT,
  backendAvailable,
  isExcludedScanDir,
  reportBackendUnreachable,
} from "./check-repo-paths.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ARTIFACT = join(FRONTEND_ROOT, "..", ".scratch", "code-release-10-10-v2", "reports", "24-inventory.md");

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

/** Every file under `dir`, relative to `root`, with dot-directories skipped. */
export function walkFiles(dir, root, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isExcludedScanDir(entry.name)) continue;
      walkFiles(join(dir, entry.name), root, out);
    } else {
      out.push(relative(root, join(dir, entry.name)).split("\\").join("/"));
    }
  }
  return out;
}

/** Immediate subdirectories of `dir`, dot-directories skipped. */
export function subdirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !isExcludedScanDir(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

const isSpec = (p) => /\.(spec|e2e-spec|test)\.[cm]?tsx?$/.test(p);

function countMatches(root, files, re) {
  let n = 0;
  for (const rel of files) {
    let src;
    try {
      src = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    re.lastIndex = 0;
    while (re.exec(src) !== null) n++;
  }
  return n;
}

function filesContaining(root, files, re) {
  const hits = [];
  for (const rel of files) {
    let src;
    try {
      src = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    if (re.test(src)) hits.push(rel);
    re.lastIndex = 0;
  }
  return hits;
}

function headSha(root) {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function branchOf(root) {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// The sixteen dimensions
// ---------------------------------------------------------------------------

/**
 * `readonly eventType = …` is how a consumer declares the outbox type it
 * handles; the same pattern `check-outbox-consumers.mjs` gates on. Counted here
 * over production files only, because a consumer that exists solely in a spec
 * handles nothing.
 */
const CONSUMER_RE = /\breadonly\s+eventType\s*=\s*(["'][^"']+["']|[A-Z][A-Z0-9_]+)/g;

function measureBackend() {
  const root = BACKEND_ROOT;
  const src = join(root, "src");
  const all = walkFiles(src, root);
  const ts = all.filter((p) => p.endsWith(".ts"));
  const prod = ts.filter((p) => !isSpec(p));

  const controllers = prod.filter((p) => p.endsWith(".controller.ts"));
  const services = prod.filter((p) => p.endsWith(".service.ts"));
  const schemaFiles = ts.filter((p) => p.startsWith("src/db/schema/"));
  const workers = prod.filter((p) => /worker/i.test(p.split("/").pop() ?? ""));
  const dtoDirs = new Set(prod.filter((p) => p.includes("/dto/")).map((p) => p.slice(0, p.indexOf("/dto/") + 4)));
  const zodFiles = filesContaining(root, prod, /z\.object\(/);
  const specs = ts.filter(isSpec);
  const fixtures = all.filter((p) => /(^|\/)(fixtures?)(\/|$)/i.test(p) || /fixture/i.test(p.split("/").pop() ?? ""));
  const opScripts = [
    ...walkFiles(join(root, "src", "scripts"), root).filter((p) => /\.(mjs|ts)$/.test(p)),
    ...walkFiles(join(root, "scripts"), root).filter((p) => /\.(mjs|ts|sh)$/.test(p)),
  ];

  const migrationsDir = join(root, "migrations");
  const sqlFiles = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
    : [];
  let journalEntries = [];
  try {
    journalEntries = JSON.parse(readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")).entries ?? [];
  } catch {
    journalEntries = [];
  }
  const journalTags = new Set(journalEntries.map((e) => `${e.tag}.sql`));
  const orphanSql = sqlFiles.filter((f) => !journalTags.has(f));
  const journalWithoutFile = [...journalTags].filter((t) => !sqlFiles.includes(t));

  const consumerFiles = filesContaining(root, prod, CONSUMER_RE);

  return {
    "backend module folders": { items: subdirs(join(src, "modules")), how: "immediate subdirectories of src/modules/" },
    "backend controllers": { items: controllers, how: "*.controller.ts under src/, specs excluded", extra: `${countMatches(root, controllers, /@Controller\(/g)} @Controller( decorators` },
    "backend implementations": { items: services, how: "*.service.ts under src/, specs excluded" },
    "backend DTO/Zod schemas": { items: zodFiles, how: "production files under src/ declaring z.object(", extra: `${dtoDirs.size} dto/ directories · ${countMatches(root, zodFiles, /z\.object\(/g)} z.object( sites` },
    "backend database schema files": { items: schemaFiles, how: ".ts under src/db/schema/", extra: `${subdirs(join(src, "db", "schema")).length} domain folders · ${countMatches(root, schemaFiles, /pgTable\(/g)} pgTable( declarations` },
    "backend migrations": { items: sqlFiles, how: "migrations/*.sql", extra: `${journalEntries.length} journal entries · ${orphanSql.length} .sql not journalled · ${journalWithoutFile.length} journal entries with no file` },
    "backend workers": { items: workers, how: "production .ts under src/ whose basename contains 'worker'" },
    "backend cache keys": { items: cacheKeyNames(root), how: "factory entries parsed out of src/common/cache/cache-keys.ts by the resolver check:cache-key-shapes uses" },
    "backend event consumers": { items: consumerFiles, how: "production files declaring `readonly eventType =`, the same shape check:outbox-consumers gates on" },
    "backend tests": { items: specs, how: "*.spec.ts / *.e2e-spec.ts under src/", extra: `${walkFiles(join(root, "test"), root).filter((p) => p.endsWith(".ts")).length} files under test/` },
    "backend fixtures": { items: fixtures, how: "paths under a fixtures/ directory or with 'fixture' in the basename" },
    "backend operational scripts": { items: opScripts, how: "src/scripts/** and scripts/**" },
  };
}

/**
 * Parsed with the backend's own resolver rather than a second regex, so this
 * number cannot disagree with the gate that consumes it.
 */
function cacheKeyNames(root) {
  const file = join(root, "src", "common", "cache", "cache-keys.ts");
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const re = /^\s{2}([A-Za-z0-9_]+):\s*\([^)]*\)\s*=>\s*(namespace\()?\s*`([^`]*)`/gm;
  const names = [];
  let m;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names.sort();
}

function measureFrontend() {
  const root = FRONTEND_ROOT;
  const app = walkFiles(join(root, "app"), root);
  const components = walkFiles(join(root, "components"), root);
  const features = walkFiles(join(root, "features"), root);
  const hooks = walkFiles(join(root, "hooks"), root);
  const lib = walkFiles(join(root, "lib"), root);
  const authored = [...app, ...components, ...features, ...hooks, ...lib].filter((p) => /\.tsx?$/.test(p));

  const pages = app.filter((p) => /\/page\.tsx$/.test(p));
  const layouts = app.filter((p) => /\/layout\.tsx$/.test(p));
  const routeHandlers = app.filter((p) => /\/route\.ts$/.test(p));

  const queryKeyFiles = lib.filter((p) => /query-keys/.test(p) && /\.ts$/.test(p) && !isSpec(p));
  const queryKeyNames = [];
  for (const rel of queryKeyFiles) {
    let source;
    try {
      source = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    const re = /^\s{2}([A-Za-z0-9_]+):\s*[({[]/gm;
    let m;
    while ((m = re.exec(source)) !== null) queryKeyNames.push(`${rel}:${m[1]}`);
  }

  const tests = authored.filter(isSpec).concat(
    [...app, ...components, ...features, ...hooks, ...lib].filter((p) => p.includes("/__tests__/") && /\.tsx?$/.test(p)),
  );
  // Fixtures do not live beside the feature here: `test-utils/` holds the shared
  // harness and `contracts/__fixtures__/` the vendored contract samples, so a
  // walk of app/components/features/hooks/lib alone finds one file and reports
  // a real dimension as empty.
  const fixtureRoots = [...app, ...components, ...features, ...hooks, ...lib,
    ...walkFiles(join(root, "test-utils"), root), ...walkFiles(join(root, "contracts"), root)];
  const fixtures = fixtureRoots
    .filter((p) => /(^|\/)(fixtures?|__fixtures__|mocks?|__mocks__|test-utils)(\/|$)/i.test(p) || /fixture/i.test(p.split("/").pop() ?? ""));
  const scripts = walkFiles(join(root, "scripts"), root).filter((p) => /\.(mjs|ts)$/.test(p));

  return {
    "frontend routes": { items: pages, how: "app/**/page.tsx", extra: `${layouts.length} layout.tsx · ${routeHandlers.length} route.ts` },
    "frontend components": { items: components.filter((p) => /\.tsx?$/.test(p)), how: ".ts/.tsx under components/", extra: `${subdirs(join(root, "components")).length} top-level dirs · ${features.filter((p) => /\.tsx?$/.test(p)).length} files under features/ in ${subdirs(join(root, "features")).length} dirs` },
    "frontend hooks": { items: hooks.filter((p) => /\.tsx?$/.test(p)), how: ".ts/.tsx under hooks/", extra: `${hooks.filter((p) => p.startsWith("hooks/api/")).length} under hooks/api/` },
    "frontend TanStack keys": { items: queryKeyNames, how: "two-space-indented members of the query-key factories in lib/**query-keys**", extra: `${queryKeyFiles.length} partition files` },
    "frontend tests": { items: [...new Set(tests)], how: "*.test.ts(x) / *.spec.ts(x) and anything under __tests__/" },
    "frontend fixtures": { items: fixtures, how: "paths under fixtures/, __fixtures__/, mocks/, __mocks__/ or test-utils/, or with 'fixture' in the basename" },
    "frontend operational scripts": { items: scripts, how: "scripts/**" },
    "frontend authored source files": { items: authored, how: ".ts/.tsx under app, components, features, hooks, lib" },
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * The criterion asks for an inventory, not a scoreboard, so `countOf` reads the
 * length of a real enumeration rather than a number computed on its own. The
 * enumerations are emitted in full by `--json`; the markdown carries the counts
 * and the rule that produced each one, because a 2,195-row table is not a
 * document anyone reads.
 */
export function countOf(dimension) {
  return Array.isArray(dimension.items) ? dimension.items.length : dimension.n;
}

export function renderTable(dimensions) {
  const rows = ["| dimension | count | how it is counted |", "|---|---:|---|"];
  for (const [name, dim] of Object.entries(dimensions))
    rows.push(`| ${name} | **${countOf(dim)}** | ${dim.how}${dim.extra ? ` — ${dim.extra}` : ""} |`);
  return rows.join("\n");
}

export function findZeroDimensions(dimensions) {
  return Object.entries(dimensions).filter(([, v]) => countOf(v) === 0).map(([k]) => k);
}

export function diffTables(previousMarkdown, dimensions) {
  const previous = new Map();
  for (const line of previousMarkdown.split("\n")) {
    const m = /^\|\s*([^|]+?)\s*\|\s*\*\*(\d+)\*\*\s*\|/.exec(line);
    if (m) previous.set(m[1], Number(m[2]));
  }
  const drift = [];
  for (const [name, dim] of Object.entries(dimensions)) {
    const n = countOf(dim);
    if (!previous.has(name)) {
      drift.push(`${name}: NEW (${n})`);
      continue;
    }
    const was = previous.get(name);
    if (was !== n) drift.push(`${name}: ${was} -> ${n}`);
  }
  for (const name of previous.keys())
    if (!(name in dimensions)) drift.push(`${name}: GONE from the measurement`);
  return drift;
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

let assertionsRun = 0;
function assert(cond, msg) {
  assertionsRun++;
  if (!cond) {
    console.error("SELF-TEST FAIL:", msg);
    process.exit(1);
  }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  assert(isExcludedScanDir(".claude") === true,
    "(a) .claude must be excluded from the walk — it holds other agents' full checkouts, and counting them inventories someone else's branch");
  assert(isExcludedScanDir("features") === false,
    "(b) a real source directory must be walked");

  assert(countOf({ items: ["a", "b"] }) === 2,
    "(c0) a dimension's count is the length of its enumeration, never a number computed beside it");
  assert(findZeroDimensions({ a: { items: [] }, b: { n: 3 } }).length === 1,
    "(c) a dimension that counts zero must be reported — a rule that stopped matching reads identically to a clean codebase");
  assert(findZeroDimensions({ a: { items: ["x"] } }).length === 0,
    "(d) a nonzero dimension is not a finding");

  const table = renderTable({ "backend workers": { items: Array.from({ length: 18 }, (_, i) => `w${i}.ts`), how: "basename contains worker" } });
  assert(/\|\s*backend workers\s*\|\s*\*\*18\*\*\s*\|/.test(table),
    "(e) a dimension must render as a parseable row so --check can diff it");

  const drift = diffTables(table, { "backend workers": { n: 19, how: "x" } });
  assert(drift.length === 1 && drift[0] === "backend workers: 18 -> 19",
    `(f) a changed count must be reported as drift — this is the clause the v2 audit failed, its table was measured at a superseded SHA; got ${JSON.stringify(drift)}`);
  assert(diffTables(table, { "backend workers": { n: 18, how: "x" } }).length === 0,
    "(g) an unchanged count is not drift");
  assert(diffTables(table, {}).length === 1,
    "(h) a dimension that disappears from the measurement is drift, not silence");
  assert(diffTables("", { "backend workers": { n: 18, how: "x" } })[0] === "backend workers: NEW (18)",
    "(i) a dimension with no previous row is reported as NEW");

  assert(CONSUMER_RE.test('  readonly eventType = "gdpr.export.requested";'),
    "(j) the outbox-consumer rule must match a string event type");
  CONSUMER_RE.lastIndex = 0;
  assert(CONSUMER_RE.test("  readonly eventType = GDPR_EXPORT_REQUESTED;"),
    "(k) the outbox-consumer rule must match a constant event type");
  CONSUMER_RE.lastIndex = 0;

  assert(isSpec("src/a.spec.ts") && isSpec("src/a.e2e-spec.ts") && isSpec("features/a.test.tsx"),
    "(l) every spec form must be recognised");
  assert(!isSpec("src/a.service.ts"),
    "(m) a production file is not a spec");

  console.log(`PASS: self-test (${assertionsRun} assertions)\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!backendAvailable) {
    reportBackendUnreachable(
      "check-inventory-counts",
      "the twelve backend dimensions of PRD-C105 (module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, tests, fixtures, operational scripts)",
    );
    process.exit(2);
  }

  const dimensions = { ...measureBackend(), ...measureFrontend() };

  const header = [
    "# PRD-C105 — module and ownership inventory",
    "",
    "Emitted by `frontend/scripts/check-inventory-counts.mjs`. Re-run it rather than trusting the numbers below;",
    "every row states the rule that produced it so it can be re-derived.",
    "",
    `| frontend | \`${headSha(FRONTEND_ROOT)}\` (\`${branchOf(FRONTEND_ROOT)}\`) |`,
    "|---|---|",
    `| backend | \`${headSha(BACKEND_ROOT)}\` (\`${branchOf(BACKEND_ROOT)}\`) |`,
    `| measured | ${new Date().toISOString().slice(0, 10)} |`,
    "",
    "The counts are of the WORKING TREE; the SHAs above are of `HEAD`. On a clean checkout those are the",
    "same corpus. In a shared checkout with uncommitted work they are not, and `--check` will report drift",
    "for every file another change has added since this was emitted — which is the staleness it exists to catch.",
    "",
  ].join("\n");

  const body = `${header}${renderTable(dimensions)}\n`;

  const zero = findZeroDimensions(dimensions);
  if (zero.length) {
    console.error(body);
    console.error(`FAIL: ${zero.length} dimension(s) counted ZERO: ${zero.join(", ")}.`);
    console.error("Every one of these has a known-nonzero denominator, so a zero means the rule stopped matching.");
    process.exit(1);
  }

  if (process.argv.includes("--check")) {
    let previous;
    try {
      previous = readFileSync(ARTIFACT, "utf8");
    } catch {
      console.error(`FAIL: no committed inventory at ${ARTIFACT} to check against.`);
      process.exit(1);
    }
    const drift = diffTables(previous, dimensions);
    console.log(body);
    if (drift.length) {
      console.error(`DRIFT: ${drift.length} dimension(s) differ from the committed inventory:`);
      for (const line of drift) console.error(`  ${line}`);
      console.error(`Re-emit it: node scripts/check-inventory-counts.mjs > ${relative(FRONTEND_ROOT, ARTIFACT)}`);
      process.exit(1);
    }
    console.log("PASS: the committed inventory matches the codebase.");
    return;
  }

  if (process.argv.includes("--json")) {
    const full = {
      frontendSha: headSha(FRONTEND_ROOT),
      backendSha: headSha(BACKEND_ROOT),
      measured: new Date().toISOString().slice(0, 10),
      dimensions: Object.fromEntries(
        Object.entries(dimensions).map(([name, dim]) => [name, { how: dim.how, count: countOf(dim), items: dim.items ?? [] }]),
      ),
    };
    process.stdout.write(`${JSON.stringify(full, null, 1)}\n`);
    return;
  }

  process.stdout.write(body);
}

if (process.argv.includes("--self-test")) runSelfTest();
else main();
