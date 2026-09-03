#!/usr/bin/env node
/**
 * Ratchet gate: count of frontend production TypeScript/TSX files over 300 lines
 * must not increase beyond the baseline.
 *
 * BASELINE HISTORY. Seeded at 519 on 2026-08-31. That seeding carried slack —
 * the measured count on 2026-09-02 was 509 — and eleven files crossed 300 into
 * the gap unremarked before the count reached 520 and the gate finally bit.
 * Lowered to 516 on 2026-09-03 by splitting five of those crossings by
 * responsibility (mail cache patching, three column sets, the salary-profile
 * presentation), leaving the number equal to the measured count with no slack.
 *
 * THE BASELINE MAY ONLY EVER MOVE DOWN, and only because files got shorter.
 * Raising it to absorb a new crossing is the failure mode this gate exists to
 * catch; a red run means split the file the run names.
 *
 * Scans: all *.ts and *.tsx under the project root, excluding:
 *   node_modules, .next, feedbucket-widget (a separate bundled widget),
 *   *.spec.ts, *.spec.tsx, *.d.ts, scripts/ (gate scripts themselves).
 *
 * Passes when actual count <= BASELINE. Fails when it increases.
 * To lower the baseline after a split, decrement BASELINE and commit.
 *
 * Flags:
 *   --self-test   Run internal assertions and exit (no file scan).
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const LIMIT = 300;
const BASELINE = 516;
const MIN_FILES = 100;

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const EXTRA_EXCLUDED_DIRS = new Set(["scripts", "public"]);

function isExcludedDir(name) {
  return isExcludedScanDir(name) || EXTRA_EXCLUDED_DIRS.has(name);
}

function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (isExcludedDir(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, files);
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if ((ext === ".ts" || ext === ".tsx") &&
          !entry.endsWith(".d.ts") &&
          !entry.endsWith(".spec.ts") &&
          !entry.endsWith(".spec.tsx")) {
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

  assert("BASELINE is a positive integer", Number.isInteger(BASELINE) && BASELINE > 0);
  assert("LIMIT is 300", LIMIT === 300);
  assert("MIN_FILES is a positive integer", Number.isInteger(MIN_FILES) && MIN_FILES > 0);

  // The scan itself, against known-bad files on disk. Asserting the constants and
  // re-implementing countLines inside the assertion left a broken collectFiles()
  // reporting zero crossings and still passing — the backend twin shipped exactly
  // that defect.
  const fixture = mkdtempSync(join(tmpdir(), "fe-over-300-self-test-"));
  try {
    mkdirSync(join(fixture, "features", "nested"), { recursive: true });
    mkdirSync(join(fixture, ".next-buildmart", "dev"), { recursive: true });
    mkdirSync(join(fixture, "next-intl"), { recursive: true });
    mkdirSync(join(fixture, "node_modules"), { recursive: true });

    writeFileSync(join(fixture, "features", "nested", "over.tsx"), "x\n".repeat(301));
    writeFileSync(join(fixture, "exactly-at-limit.ts"), "x\n".repeat(300));
    writeFileSync(join(fixture, "under.ts"), "x\n".repeat(12));
    writeFileSync(join(fixture, "over.spec.ts"), "x\n".repeat(400));
    writeFileSync(join(fixture, "over.spec.tsx"), "x\n".repeat(400));
    writeFileSync(join(fixture, "over.d.ts"), "x\n".repeat(400));
    writeFileSync(join(fixture, "over.js"), "x\n".repeat(400));
    writeFileSync(join(fixture, ".next-buildmart", "dev", "chunk.ts"), "x\n".repeat(9000));
    writeFileSync(join(fixture, "next-intl", "authored.tsx"), "x\n".repeat(400));
    writeFileSync(join(fixture, "node_modules", "dep.ts"), "x\n".repeat(900));

    const collected = collectFiles(fixture).map((f) => f.replace(/\\/g, "/"));
    const overLimit = collected.filter((f) => countLines(f) > LIMIT);

    assert("collectFiles recurses into subdirectories", collected.some((f) => f.endsWith("/features/nested/over.tsx")));
    assert("a 301-line file is over the limit", overLimit.some((f) => f.endsWith("/features/nested/over.tsx")));
    assert("a file at exactly 300 lines is not over the limit", !overLimit.some((f) => f.endsWith("exactly-at-limit.ts")));
    assert("an under-limit file is not counted", !overLimit.some((f) => f.endsWith("under.ts")));
    assert("countLines does not count the trailing newline as a line", countLines(join(fixture, "under.ts")) === 12);
    assert("spec files are excluded", !collected.some((f) => f.includes(".spec.")));
    assert("declaration files are excluded", !collected.some((f) => f.endsWith(".d.ts")));
    assert("non-TypeScript files are excluded", !collected.some((f) => f.endsWith(".js")));
    assert("generated build output is excluded", !collected.some((f) => f.includes(".next-buildmart")));
    assert("node_modules is excluded", !collected.some((f) => f.includes("node_modules")));
    assert(
      "an authored directory merely starting with 'next-' is still scanned",
      overLimit.some((f) => f.endsWith("/next-intl/authored.tsx")),
    );
    assert("the vacuity guard would fire on this fixture", collected.length < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failed > 0) {
    console.error(`check-over-300 self-tests: ${failed} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-over-300 self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTests();

const files = collectFiles(ROOT);

if (files.length < MIN_FILES) {
  console.error(
    `check-over-300: vacuity guard — only ${files.length} files found under ${ROOT} (expected ≥ ${MIN_FILES}); scan is broken`,
  );
  process.exit(1);
}

const over300 = [];
for (const file of files) {
  const lines = countLines(file);
  if (lines > LIMIT) {
    over300.push({ path: relative(ROOT, file).replace(/\\/g, "/"), lines });
  }
}

const actual = over300.length;

if (actual <= BASELINE) {
  console.log(
    `check-over-300: ${actual} of ${files.length} production files exceed ${LIMIT} lines (baseline ${BASELINE}) — OK`,
  );
  process.exit(0);
}

const increase = actual - BASELINE;
console.error(
  `check-over-300: ${actual} files exceed ${LIMIT} lines — ${increase} above baseline of ${BASELINE}.\n`,
);
console.error(`Files exceeding ${LIMIT} lines (${actual} total):`);
for (const v of over300.sort((a, b) => b.lines - a.lines)) {
  console.error(`  ${v.lines}  ${v.path}`);
}
console.error(
  `\nTo fix: split the new file(s) into focused sub-files, or decrement BASELINE after justifying why the count dropped.`,
);
process.exit(1);
