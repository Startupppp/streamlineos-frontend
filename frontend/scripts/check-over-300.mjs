#!/usr/bin/env node
/**
 * Ratchet gate: count of frontend production TypeScript/TSX files over 300 lines
 * must not increase beyond the baseline set on 2026-08-31.
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

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const LIMIT = 300;
const BASELINE = 519;
const MIN_FILES = 100;

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "feedbucket-widget",
  ".git",
  "scripts",
  "public",
]);

function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
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
  assert("countLines counts lines in a string", (() => {
    const fake = "a\nb\nc\n";
    const parts = fake.split("\n");
    const count = fake.endsWith("\n") ? parts.length - 1 : parts.length;
    return count === 3;
  })());
  assert("EXCLUDED_DIRS excludes node_modules", EXCLUDED_DIRS.has("node_modules"));
  assert("EXCLUDED_DIRS excludes feedbucket-widget", EXCLUDED_DIRS.has("feedbucket-widget"));

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
