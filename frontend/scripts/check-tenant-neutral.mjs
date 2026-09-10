/**
 * check-tenant-neutral.mjs
 *
 * The frontend half of the backend gate of the same name. StreamlineOS
 * inventory serves every organisation that holds stock, and no one customer may
 * be named in the screens all of them see.
 *
 * The frontend is where this coupling is easiest to acquire and hardest to
 * notice, because it hides in three places nobody greps: a component folder
 * named after the customer the screens were first built for, a query-key
 * namespace that inherited that folder's name, and a test fixture called after
 * a real warehouse. All three were here — `components/buildmart/`,
 * `inventoryBuildmartQueryKeys`, and `"Gachibowli DC"` in four suites — and
 * every one of them type-checked, rendered and passed.
 *
 * What this does NOT forbid: industry vocabulary. A dark store, a zone, a
 * materials pack and a delivery promise are generic concepts any tenant
 * configures. Only proper nouns are banned.
 *
 * Usage:
 *   node scripts/check-tenant-neutral.mjs
 *   node scripts/check-tenant-neutral.mjs --json
 *   node scripts/check-tenant-neutral.mjs --self-test
 *
 * Exit codes:
 *   0 — no customer proper noun in scanned source
 *   1 — a banned token, or a stale ALLOWED entry
 *   2 — vacuity guard fired (the scan reached too little to mean anything)
 *   3 — self-test failure
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Matched case-insensitively and NOT on a word boundary: the shapes that really
 * occurred were `components/buildmart/`, `inventoryBuildmartQueryKeys` and
 * `.next-buildmart`, and a `\b` anchor would have passed two of the three.
 */
const BANNED = [
  { token: "buildmart", why: "a customer, not a tenant of this codebase" },
  { token: "cornerstone", why: "a customer, not a tenant of this codebase" },
  { token: "gachibowli", why: "one customer's locality" },
  { token: "kompally", why: "one customer's locality" },
  { token: "shamshabad", why: "one customer's locality" },
  { token: "attapur", why: "one customer's locality" },
  { token: "homerun", why: "a third-party product name" },
];

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", ".turbo", "coverage", "feedbucket-widget", ".scratch", "playwright-report", "test-results",
]);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css"]);

/**
 * `app`, `features` and `hooks` are the surfaces; `lib` holds the query-key
 * registry the namespace lived in; `e2e` and `scripts` are here because a
 * fixture and a gate header were both carrying the name.
 */
const SCAN_ROOTS = ["app", "components", "features", "hooks", "lib", "e2e", "scripts", "types"];
const SCAN_FILES = [".gitignore", "package.json", "tsconfig.json", "tsconfig.specs.json", "next.config.ts", "next.config.js"];

/** An acknowledged mention, with the reason it stands. */
const ALLOWED = [
  { file: "scripts/check-tenant-neutral.mjs", why: "this gate; the banned list is the list" },
];

export function bannedIn(line) {
  const lower = line.toLowerCase();
  return BANNED.filter((entry) => lower.includes(entry.token));
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SCAN_EXTENSIONS.has(extname(entry.name)) || SCAN_FILES.includes(entry.name)) yield full;
  }
}

export function collectFiles() {
  const files = [];
  for (const root of SCAN_ROOTS) files.push(...walk(join(ROOT, root)));
  for (const name of SCAN_FILES) {
    const full = join(ROOT, name);
    try {
      if (statSync(full).isFile()) files.push(full);
    } catch {
      /* absent is fine; the vacuity guard is what notices a broken scan */
    }
  }
  return files;
}

function scan() {
  const files = collectFiles();
  const allowed = new Set(ALLOWED.map((e) => e.file));
  const violations = [];
  const allowedHit = new Set();

  for (const full of files) {
    const rel = relative(ROOT, full);
    let source;
    try {
      source = readFileSync(full, "utf8");
    } catch {
      continue;
    }

    /**
     * The path is checked as well as the contents. `components/buildmart/`
     * contained no banned word in any of its seventeen files: the folder name
     * was the whole coupling.
     */
    const pathHits = bannedIn(rel);
    const lineHits = [];
    source.split("\n").forEach((line, index) => {
      for (const entry of bannedIn(line)) lineHits.push({ line: index + 1, ...entry, text: line.trim().slice(0, 120) });
    });

    if (pathHits.length === 0 && lineHits.length === 0) continue;
    if (allowed.has(rel)) {
      allowedHit.add(rel);
      continue;
    }
    violations.push({ file: rel, pathHits, lineHits });
  }

  const featureCount = files.filter((f) => relative(ROOT, f).startsWith("features/")).length;
  return { files, featureCount, violations, allowedHit };
}

const MIN_FILES = 800;
const MIN_FEATURES = 200;

function main() {
  const { files, featureCount, violations, allowedHit } = scan();

  /**
   * Vacuity floor. A walker pointed at the wrong directory reports zero
   * violations and exits 0, which is indistinguishable from a clean tree.
   */
  if (files.length < MIN_FILES || featureCount < MIN_FEATURES) {
    process.stdout.write(
      `VACUITY GUARD — scanned ${files.length} files (floor ${MIN_FILES}) of which ` +
        `${featureCount} under features/ (floor ${MIN_FEATURES}). The scan did not reach the ` +
        `app; a clean result here would mean nothing.\n`,
    );
    process.exit(2);
  }

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ scanned: files.length, featureCount, violations }, null, 2) + "\n");
  }

  if (violations.length > 0) {
    process.stdout.write(`FAIL — a customer proper noun in ${violations.length} file(s):\n`);
    for (const v of violations) {
      for (const hit of v.pathHits) process.stdout.write(`  ${v.file}  (in the path) — "${hit.token}": ${hit.why}\n`);
      for (const hit of v.lineHits) process.stdout.write(`  ${v.file}:${hit.line} — "${hit.token}": ${hit.why}\n      ${hit.text}\n`);
    }
    process.stdout.write(
      `\nInventory serves every organisation that holds stock. Name the capability for what it ` +
        `does (materials, dark store, zone) and let a tenant supply its own data. See the ` +
        `backend's docs/inventory/BUILD_MART_DECOUPLE.md.\n`,
    );
    process.exit(1);
  }

  const stale = ALLOWED.filter((e) => !allowedHit.has(e.file));
  if (stale.length > 0) {
    process.stdout.write(`FAIL — ${stale.length} ALLOWED entry(ies) no longer match anything:\n`);
    for (const e of stale) process.stdout.write(`  ${e.file} — ${e.why}\n`);
    process.stdout.write(`\nRemove the entry from ALLOWED in this file.\n`);
    process.exit(1);
  }

  process.stdout.write(
    `PASS — ${files.length} files (${featureCount} under features/), ${BANNED.length} banned tokens, ` +
      `${ALLOWED.length} acknowledged mention(s).\n`,
  );
}

function selfTest() {
  const cases = [
    ["import { ProjectsClient } from \"@/features/inventory/components/buildmart/projects-client\";", true],
    ["export const inventoryBuildmartQueryKeys = {", true],
    [".next-buildmart", true],
    ["useWarehouses: () => ({ data: [{ id: 7, name: \"Gachibowli DC\" }] }),", true],
    ["warehouseZone: \"Gachibowli\",", true],
    ["createdb cornerstone_cold", true],
    // Generic vocabulary the screens are built out of: never a violation.
    ["import { DarkStoresClient } from \"@/features/inventory/components/materials/dark-stores-client\";", false],
    ["export const inventoryMaterialsQueryKeys = {", false],
    ["<Badge>{warehouse.zoneLabel}</Badge>", false],
    ["deliveryPromiseMinutes: number | null;", false],
    ["name: \"North DC\", code: \"NDC\"", false],
  ];

  let failed = 0;
  for (const [line, expected] of cases) {
    const actual = bannedIn(line).length > 0;
    if (actual !== expected) {
      failed += 1;
      process.stdout.write(`  self-test FAIL: ${JSON.stringify(line)} -> ${actual}, want ${expected}\n`);
    }
  }

  /** A correct matcher over a walker that visits nothing passes green. Assert both. */
  const { files, featureCount } = scan();
  if (files.length < MIN_FILES || featureCount < MIN_FEATURES) {
    process.stdout.write(`  self-test FAIL: walker reached ${files.length} files, ${featureCount} under features/\n`);
    failed += 1;
  }

  if (failed > 0) {
    process.stdout.write(`SELF-TEST FAIL — ${failed} case(s)\n`);
    process.exit(3);
  }
  process.stdout.write(`SELF-TEST PASS — ${cases.length} matcher cases, walker reached ${files.length} files\n`);
}

if (process.argv.includes("--self-test")) selfTest();
else main();
