#!/usr/bin/env node
/**
 * Gate: no authored TypeScript/JavaScript file in the frontend workspace may
 * exceed 500 lines, except those recorded in scripts/file-size-exceptions.md.
 *
 * Excluded from scanning (path-classified, not heuristic):
 *   node_modules/, .next/, feedbucket-widget/, public/, scripts/, contracts/,
 *   .git/, coverage/, dist/, out/ — build output, package dirs, generated
 *   artifacts, and gate scripts themselves.
 *   *.d.ts, *.spec.ts, *.spec.tsx, *.test.ts, *.test.tsx — tests and
 *   declaration files (§7 exceptions by default).
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
        !entry.endsWith(".d.ts") &&
        !entry.endsWith(".spec.ts") &&
        !entry.endsWith(".spec.tsx") &&
        !entry.endsWith(".test.ts") &&
        !entry.endsWith(".test.tsx")
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

function parseExceptions(doc) {
  const exceptions = new Map();
  for (const line of doc.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const match = cells[1]?.match(/^`([^`]+)`$/);
    if (!match) continue;
    if (cells.length < 7) continue;
    const path = match[1];
    if (path.includes("*") || path.endsWith("/")) continue;
    const lines = parseInt(cells[2], 10);
    if (isNaN(lines)) continue;
    exceptions.set(path, lines);
  }
  return exceptions;
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

  const exceptions = parseExceptions(doc);

  const staleErrors = [];
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

  const fakeDoc = [
    "## Exceptions",
    "",
    "| Path | Lines | Category | Interface | Reason | Owner |",
    "|---|---|---|---|---|---|",
    "| `app/feature/big-component.tsx` | 601 | Cohesive | BigComponent | cohesive | Build |",
    "| `features/hr/hr-catalog.ts` | 712 | Catalog | HR_CATALOG | flat array | HR |",
    "",
    "## Audit trail",
    "- `app/other/file.tsx` mentioned in prose only.",
    "- `features/**` glob in prose.",
  ].join("\n");

  const parsed = parseExceptions(fakeDoc);
  assert("parses first exception path", parsed.has("app/feature/big-component.tsx"));
  assert("parses registered line count for first entry", parsed.get("app/feature/big-component.tsx") === 601);
  assert("parses second exception path", parsed.has("features/hr/hr-catalog.ts"));
  assert("does not include prose-only paths", !parsed.has("app/other/file.tsx"));
  assert("does not include glob patterns in prose", !parsed.has("features/**"));
  assert("grants exactly the two table rows", parsed.size === 2);
  assert(
    "rejects a table row missing required columns",
    parseExceptions("| `app/x.tsx` | 600 |").size === 0,
  );
  assert(
    "rejects wildcard paths",
    parseExceptions("| `app/**/*.tsx` | 600 | Cat | Int | Reason | Owner |").size === 0,
  );
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
        "| Path | Lines | Category | Interface | Reason | Owner |",
        "|---|---|---|---|---|---|",
        ...rows.map((r) => `| \`${r.path}\` | ${r.lines} | Cat | Int | Reason | Owner |`),
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
