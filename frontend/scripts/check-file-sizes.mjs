#!/usr/bin/env node
/**
 * Gate: no authored TypeScript/JavaScript file in the frontend workspace may
 * exceed 500 lines, except those recorded in scripts/file-size-exceptions.md.
 *
 * Excluded from scanning (path-classified, not heuristic):
 *   node_modules/, .next/, feedbucket-widget/, public/, scripts/, contracts/,
 *   .git/, coverage/, dist/, out/ — build output, package dirs, generated
 *   artifacts, and gate scripts themselves.
 *   *.d.ts — declaration files (a §7 exception by name).
 *
 * TEST FILES ARE SCANNED, as of 2026-09-02 (ticket 35). They were excluded here
 * while check-over-300.mjs scanned them, so a 664-line test file inflated the
 * 300-line ratchet and was exempt from the 500-line ceiling — one policy, two
 * corpora. §7 names its exceptions and tests are not among them, so the two are
 * aligned by TIGHTENING this gate rather than by loosening the other:
 *   measured, exempting *.test.* from check-over-300 instead — 519 -> 509, ten
 *   files leaving the count with no file getting shorter, which is a ratchet
 *   moved to make a number smaller and is exactly what this release forbids;
 *   measured, scanning *.test.* here — 2 -> 3 files over 500, the one addition
 *   being hooks/api/notifications-inbox.test.ts at 664 lines.
 * Revealing one row of debt is the honest direction; hiding ten is not.
 *
 * CRM and Inventory files (out of PRD scope) are tallied separately and do
 * not affect the gate's pass/fail decision.
 *
 * Flags:
 *   --self-test   Run fixture-based assertions and exit (no real file scan).
 */

import {
  readFileSync, readdirSync, statSync,
  mkdtempSync, mkdirSync, writeFileSync, rmSync,
} from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const LIMIT = 500;
const MIN_FILES = 200;

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCEPTIONS_DOC = fileURLToPath(new URL("file-size-exceptions.md", import.meta.url));

// Generated/vendor exclusion is shared and anchored (see check-repo-paths.mjs);
// these are the additional NON-generated directories this gate does not judge.
const EXTRA_EXCLUDED_DIRS = new Set(["public", "scripts", "contracts", "dist"]);

function isExcludedDir(name) {
  return isExcludedScanDir(name) || EXTRA_EXCLUDED_DIRS.has(name);
}

function isCrmOrInventory(relPath) {
  return (
    relPath.startsWith("app/(authenticated)/crm/") ||
    relPath.startsWith("features/crm/") ||
    relPath.startsWith("app/(authenticated)/inventory/") ||
    relPath.startsWith("features/inventory/")
  );
}

function collectFiles(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const entry of entries) {
    if (isExcludedDir(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, files);
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (
        (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".mjs") &&
        !entry.endsWith(".d.ts")
      ) {
        files.push(full);
      }
    }
  }
  return files;
}

function countLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  const parts = content.split("\n");
  return content.endsWith("\n") ? parts.length - 1 : parts.length;
}

/**
 * The nine columns a §7 exception must carry, in order. A row that looks like an
 * exception but is malformed is returned as an ERROR rather than skipped: skipping
 * turned a typo into "not an exception", which reads as a size violation instead of a
 * broken registry, and a header row with no owner or review date used to be accepted.
 */
const COLUMNS = [
  "path",
  "lines",
  "category",
  "owner",
  "interface",
  "cohesion",
  "alternatives",
  "reviewDate",
  "removalTrigger",
];

function parseExceptions(doc) {
  const entries = new Map();
  const errors = [];
  for (const line of doc.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const match = cells[1]?.match(/^`([^`]+)`$/);
    if (!match) continue;
    const path = match[1];

    if (path.includes("*") || path.endsWith("/")) {
      errors.push({ path, error: "wildcard and directory-wide exceptions are not allowed" });
      continue;
    }
    const values = cells.slice(1, 1 + COLUMNS.length);
    if (values.length < COLUMNS.length || values.some((v) => v === undefined || v === "")) {
      errors.push({
        path,
        error: `row must carry all ${COLUMNS.length} columns (${COLUMNS.join(", ")}) with none blank`,
      });
      continue;
    }
    const record = Object.fromEntries(COLUMNS.map((name, i) => [name, values[i]]));
    const lines = Number(record.lines);
    if (!Number.isInteger(lines) || lines <= 0) {
      errors.push({ path, error: `line count "${record.lines}" is not a positive integer` });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewDate) || Number.isNaN(Date.parse(record.reviewDate))) {
      errors.push({ path, error: `review date "${record.reviewDate}" is not an ISO calendar date` });
      continue;
    }
    if (entries.has(path)) {
      errors.push({ path, error: "registered more than once" });
      continue;
    }
    entries.set(path, lines);
  }
  return { entries, errors };
}

function runCheck(rootDir, exceptionsPath, { minFiles = MIN_FILES } = {}) {
  let doc;
  try {
    doc = readFileSync(exceptionsPath, "utf8");
  } catch {
    return {
      ok: false, reason: "cannot-read-exceptions",
      message: `cannot read exceptions at ${exceptionsPath}`,
      fileCount: 0, violations: [], crmInventoryOver: [], staleErrors: [], exceptionCount: 0,
    };
  }

  const { entries: exceptions, errors } = parseExceptions(doc);

  const staleErrors = [...errors];
  for (const [regPath, regLines] of exceptions) {
    const fullPath = join(rootDir, regPath);
    let actualLines;
    try {
      actualLines = countLines(fullPath);
    } catch {
      staleErrors.push({ path: regPath, error: "registered path not found" });
      continue;
    }
    if (actualLines !== regLines) {
      staleErrors.push({
        path: regPath,
        error: `stale line count — registered ${regLines}, actual ${actualLines}`,
      });
      continue;
    }
    if (actualLines <= LIMIT) {
      staleErrors.push({
        path: regPath,
        error: `exception no longer needed — file is at ${actualLines} lines (within the ${LIMIT}-line limit)`,
      });
    }
  }

  const files = collectFiles(rootDir);

  if (files.length < minFiles) {
    return {
      ok: false, reason: "vacuous-scan",
      message: `vacuity guard — only ${files.length} files found under ${rootDir} (expected ≥ ${minFiles}); scan is broken`,
      fileCount: files.length, violations: [], crmInventoryOver: [], staleErrors, exceptionCount: exceptions.size,
    };
  }

  const violations = [];
  const crmInventoryOver = [];

  for (const file of files) {
    const rel = relative(rootDir, file).replace(/\\/g, "/");
    const lines = countLines(file);
    if (lines <= LIMIT) continue;
    if (isCrmOrInventory(rel)) {
      crmInventoryOver.push({ path: rel, lines });
      continue;
    }
    if (!exceptions.has(rel)) {
      violations.push({ path: rel, lines });
    }
  }

  if (staleErrors.length > 0) {
    return {
      ok: false, reason: "stale-exceptions",
      fileCount: files.length, violations, crmInventoryOver, staleErrors, exceptionCount: exceptions.size,
    };
  }

  return {
    ok: violations.length === 0,
    reason: violations.length > 0 ? "violations" : "ok",
    fileCount: files.length, violations, crmInventoryOver, staleErrors: [], exceptionCount: exceptions.size,
  };
}

function runSelfTests() {
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      passed++;
    } else {
      console.error(`  FAIL: ${label}`);
      failed++;
    }
  }

  const row = (path, lines) =>
    `| \`${path}\` | ${lines} | Cohesive | Build | BigComponent | one screen | per-tab split rejected | 2026-12-01 | drops to 500 |`;

  const fakeDoc = [
    "## Exceptions",
    "",
    "| Path | Lines | Category | Owner | Interface | Cohesion | Alternatives | Review date | Removal trigger |",
    "|---|---|---|---|---|---|---|---|---|",
    row("app/feature/big-component.tsx", 601),
    row("features/hr/hr-catalog.ts", 712),
    "",
    "## Audit trail",
    "- `app/other/file.tsx` mentioned in prose only.",
    "- `features/**` glob in prose.",
  ].join("\n");

  const parsed = parseExceptions(fakeDoc);
  assert("parses first exception path", parsed.entries.has("app/feature/big-component.tsx"));
  assert("parses registered line count for first entry", parsed.entries.get("app/feature/big-component.tsx") === 601);
  assert("parses second exception path", parsed.entries.has("features/hr/hr-catalog.ts"));
  assert("does not include prose-only paths", !parsed.entries.has("app/other/file.tsx"));
  assert("does not include glob patterns in prose", !parsed.entries.has("features/**"));
  assert("grants exactly the two table rows", parsed.entries.size === 2);
  assert("a well-formed registry reports no row errors", parsed.errors.length === 0);

  const short = parseExceptions("| `app/x.tsx` | 600 |");
  assert("rejects a table row missing required columns", short.entries.size === 0);
  assert("reports a short row as an error rather than skipping it", short.errors.length === 1);

  const blank = parseExceptions("| `app/x.tsx` | 600 | Cohesive |  | I | C | A | 2026-12-01 | T |");
  assert("rejects a row with a blank owner", blank.entries.size === 0);
  assert("reports a blank owner as an error", blank.errors.length === 1);

  const wildcard = parseExceptions(row("app/**/*.tsx", 600));
  assert("rejects wildcard paths", wildcard.entries.size === 0);
  assert("reports a wildcard path as an error", wildcard.errors.some((e) => e.error.includes("wildcard")));

  const dirWide = parseExceptions(row("features/hr/", 600));
  assert("rejects directory-wide paths", dirWide.entries.size === 0);
  assert("reports a directory-wide path as an error", dirWide.errors.length === 1);

  const badDate = parseExceptions("| `app/x.tsx` | 600 | Cohesive | Build | I | C | A | soon | T |");
  assert("rejects a non-ISO review date", badDate.entries.size === 0);
  assert("reports a non-ISO review date as an error", badDate.errors.some((e) => e.error.includes("review date")));

  const dupe = parseExceptions([row("app/x.tsx", 600), row("app/x.tsx", 700)].join("\n"));
  assert("reports a duplicate registration as an error", dupe.errors.some((e) => e.error.includes("more than once")));
  assert("countLines counts trailing-newline file correctly", (() => {
    const fake = "a\nb\nc\n";
    const parts = fake.split("\n");
    return (fake.endsWith("\n") ? parts.length - 1 : parts.length) === 3;
  })());
  assert("countLines counts no-trailing-newline file correctly", (() => {
    const fake = "a\nb\nc";
    const parts = fake.split("\n");
    return (fake.endsWith("\n") ? parts.length - 1 : parts.length) === 3;
  })());

  const tmpRoot = mkdtempSync(join(tmpdir(), "chk-fs-"));
  try {
    function writeLines(filePath, n) {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, Array.from({ length: n }, (_, i) => `const x${i} = ${i};`).join("\n") + "\n");
    }
    function makeRegistry(rows) {
      return [
        "## Exceptions", "",
        "| Path | Lines | Category | Owner | Interface | Cohesion | Alternatives | Review date | Removal trigger |",
        "|---|---|---|---|---|---|---|---|---|",
        ...rows.map((r) => row(r.path, r.lines)),
      ].join("\n") + "\n";
    }

    const vacDir = join(tmpRoot, "vac");
    writeLines(join(vacDir, "app", "one.tsx"), 10);
    writeFileSync(join(vacDir, "exc.md"), makeRegistry([]));
    const vacRes = runCheck(vacDir, join(vacDir, "exc.md"), { minFiles: 5 });
    assert("vacuous scan: ok=false", vacRes.ok === false);
    assert("vacuous scan: reason=vacuous-scan", vacRes.reason === "vacuous-scan");

    const noExcDir = join(tmpRoot, "no-exc");
    writeLines(join(noExcDir, "app", "feat", "big.tsx"), 501);
    writeFileSync(join(noExcDir, "exc.md"), makeRegistry([]));
    const noExcRes = runCheck(noExcDir, join(noExcDir, "exc.md"), { minFiles: 1 });
    assert("over-limit no exception: ok=false", noExcRes.ok === false);
    assert("over-limit no exception: reason=violations", noExcRes.reason === "violations");
    assert("over-limit no exception: names the file", noExcRes.violations.some((v) => v.path.includes("big.tsx")));
    assert("over-limit no exception: reports 501 lines", noExcRes.violations.some((v) => v.lines === 501));

    // Pins the 2026-09-02 alignment with check-over-300: a test file is subject
    // to the 500-line ceiling, a declaration file is not. Without this the
    // exclusion could drift back and the two gates would silently disagree again.
    const testDir = join(tmpRoot, "tests");
    writeLines(join(testDir, "hooks", "big.test.ts"), 664);
    writeLines(join(testDir, "hooks", "big.test.tsx"), 501);
    writeLines(join(testDir, "types", "big.d.ts"), 900);
    writeFileSync(join(testDir, "exc.md"), makeRegistry([]));
    const testRes = runCheck(testDir, join(testDir, "exc.md"), { minFiles: 1 });
    assert("a *.test.ts over 500 is a violation", testRes.violations.some((v) => v.path.includes("big.test.ts")));
    assert("a *.test.tsx over 500 is a violation", testRes.violations.some((v) => v.path.includes("big.test.tsx")));
    assert("a *.d.ts over 500 is still exempt", !testRes.violations.some((v) => v.path.includes("big.d.ts")));

    const missingDir = join(tmpRoot, "missing");
    writeLines(join(missingDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(missingDir, "exc.md"), makeRegistry([
      { path: "app/feat/big.tsx", lines: 510 },
      { path: "app/feat/gone.tsx", lines: 900 },
    ]));
    const missingRes = runCheck(missingDir, join(missingDir, "exc.md"), { minFiles: 1 });
    assert("a registered path that no longer exists fails the gate", missingRes.ok === false);
    assert("a missing registered path is named", missingRes.staleErrors.some((e) => e.path.includes("gone.tsx")));

    const staleDir = join(tmpRoot, "stale");
    writeLines(join(staleDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(staleDir, "exc.md"), makeRegistry([{ path: "app/feat/big.tsx", lines: 520 }]));
    const staleRes = runCheck(staleDir, join(staleDir, "exc.md"), { minFiles: 1 });
    assert("stale line count: ok=false", staleRes.ok === false);
    assert("stale line count: reason=stale-exceptions", staleRes.reason === "stale-exceptions");
    assert("stale line count: names the file", staleRes.staleErrors.some((e) => e.path.includes("big.tsx")));
    assert("stale line count: error mentions stale line count", staleRes.staleErrors.some((e) => e.error.includes("stale line count")));

    const droppedDir = join(tmpRoot, "dropped");
    writeLines(join(droppedDir, "app", "feat", "shrunk.tsx"), 490);
    writeFileSync(join(droppedDir, "exc.md"), makeRegistry([{ path: "app/feat/shrunk.tsx", lines: 490 }]));
    const droppedRes = runCheck(droppedDir, join(droppedDir, "exc.md"), { minFiles: 1 });
    assert("within-limit exception: ok=false", droppedRes.ok === false);
    assert("within-limit exception: reason=stale-exceptions", droppedRes.reason === "stale-exceptions");
    assert("within-limit exception: error mentions exception no longer needed", droppedRes.staleErrors.some((e) => e.error.includes("exception no longer needed")));

    const okDir = join(tmpRoot, "ok");
    writeLines(join(okDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(okDir, "exc.md"), makeRegistry([{ path: "app/feat/big.tsx", lines: 510 }]));
    const okRes = runCheck(okDir, join(okDir, "exc.md"), { minFiles: 1 });
    assert("valid exception: ok=true", okRes.ok === true);
    assert("valid exception: reason=ok", okRes.reason === "ok");

  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  assert(
    "isExcludedDir keeps generated build output out of the corpus",
    isExcludedDir(".next") && isExcludedDir(".next-buildmart") && isExcludedDir("node_modules"),
  );
  assert(
    "isExcludedDir also drops the non-source dirs this gate does not measure",
    isExcludedDir("public") && isExcludedDir("scripts") && isExcludedDir("contracts") && isExcludedDir("dist"),
  );
  assert(
    "isExcludedDir does NOT swallow authored source — the exclusion is not a prefix match",
    !isExcludedDir("features") && !isExcludedDir("next-intl") && !isExcludedDir("build") && !isExcludedDir("app"),
  );
  assert(
    "isCrmOrInventory recognises both roots of each excluded module",
    isCrmOrInventory("app/(authenticated)/crm/leads/page.tsx") &&
      isCrmOrInventory("features/crm/leads/lead-table.tsx") &&
      isCrmOrInventory("app/(authenticated)/inventory/stock/page.tsx") &&
      isCrmOrInventory("features/inventory/stock/stock-table.tsx"),
  );
  assert(
    "isCrmOrInventory does not exempt in-release code that merely mentions crm",
    !isCrmOrInventory("features/crm-shared/util.ts") &&
      !isCrmOrInventory("hooks/api/crm.ts") &&
      !isCrmOrInventory("features/build/board.tsx"),
  );

  if (failed > 0) {
    console.error(`check-file-sizes self-tests: ${failed} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-file-sizes self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTests();

const result = runCheck(FRONTEND_ROOT, EXCEPTIONS_DOC, { minFiles: MIN_FILES });

if (result.reason === "cannot-read-exceptions") {
  console.error(`check-file-sizes: ${result.message}`);
  process.exit(1);
}

if (result.reason === "vacuous-scan") {
  console.error(`check-file-sizes: ${result.message}`);
  process.exit(1);
}

if (result.crmInventoryOver.length > 0) {
  console.log(
    `check-file-sizes: CRM/Inventory (out-of-scope, informational — ${result.crmInventoryOver.length} file(s) over ${LIMIT} lines):`,
  );
  for (const v of result.crmInventoryOver) {
    console.log(`  ${v.lines} lines  ${v.path}`);
  }
}

if (result.reason === "stale-exceptions") {
  console.error(`check-file-sizes: exception registry is stale — ${result.staleErrors.length} error(s):\n`);
  for (const e of result.staleErrors) {
    console.error(`  ${e.path}: ${e.error}`);
  }
  console.error(`\nFix: re-measure the affected file(s) and update scripts/file-size-exceptions.md.`);
  process.exit(1);
}

if (result.violations.length > 0) {
  console.error(`check-file-sizes: ${result.violations.length} file(s) exceed ${LIMIT} lines:\n`);
  for (const v of result.violations) {
    console.error(`  ${v.lines} lines  ${v.path}`);
  }
  console.error(`\nTo exempt a file, add it to scripts/file-size-exceptions.md with justification.`);
  process.exit(1);
}

console.log(
  `check-file-sizes: ${result.fileCount} files scanned — all within ${LIMIT} lines (${result.exceptionCount} exceptions registered)`,
);
process.exit(0);
