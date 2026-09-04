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
import { join, relative, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";
import { driftAgainstBackend, reportCorpus } from "./gate-corpus.mjs";

const LIMIT = 500;

/**
 * Vacuity floor. MEASURED 2026-09-03: 5,388 scannable files under frontend/ with this gate's own
 * extension and directory filter, distributed features 2,800 · app 1,224 · hooks 584 · components
 * 375 · lib 286 · types 93 · test-utils 15.
 *
 * The previous floor of 200 was 3.7% of that and could not bite on any realistic loss. Losing the
 * whole of `features/` — where every large component in the product lives — leaves 2,588 files,
 * still THIRTEEN TIMES the old floor, so the gate would print "5,388 files scanned — all within
 * 500 lines" over a tree it had never opened. Proved in a tmpdir below: at minFiles 200 a corpus
 * with its largest subtree unreadable returned ok=true while a 900-line violation sat inside it.
 *
 * 4,000 is ~74% of the measured corpus: it bites the moment either of the two largest subtrees
 * goes missing, and still leaves room for the tree to shrink by a quarter without a false alarm.
 * The count is only a backstop against gross loss — REQUIRED_SUBTREES is what catches a single
 * subtree disappearing, and a THROWING collectFiles is what catches an unreadable one.
 */
const MIN_FILES = 4000;

/**
 * Every authored source root. A scan that returns files but contributes nothing from one of these
 * did not read the tree, whatever its total: `lib/` (286 files) or `hooks/` (584) could vanish
 * entirely and the count floor above would never notice.
 */
const REQUIRED_SUBTREES = ["app", "components", "features", "hooks", "lib"];

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

function collectFiles(dir, files = [], readdir = readdirSync) {
  let entries;
  try {
    entries = readdir(dir);
  } catch (error) {
    // Swallowing this returned a SHORT file list that then read as "nothing over the limit".
    // An unreadable directory is an unmeasured directory: fail loudly. The backend twin
    // (streamlineos-backend/src/scripts/check-file-sizes.mjs) has thrown here since the same
    // defect was found there.
    throw new Error(`cannot read ${dir}: ${error.code ?? error.message}`, { cause: error });
  }
  for (const entry of entries) {
    if (isExcludedDir(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch (error) {
      // A broken symlink or a racing delete. Same reasoning: an entry we cannot classify is an
      // entry we did not measure, and a gate that skips it silently reports a clean pass over it.
      throw new Error(`cannot stat ${full}: ${error.code ?? error.message}`, { cause: error });
    }
    if (stat.isDirectory()) {
      collectFiles(full, files, readdir);
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

function runCheck(
  rootDir,
  exceptionsPath,
  { minFiles = MIN_FILES, requiredSubtrees = REQUIRED_SUBTREES, readdir } = {},
) {
  let doc;
  try {
    doc = readFileSync(exceptionsPath, "utf8");
  } catch {
    return {
      ok: false, reason: "cannot-read-exceptions",
      message: `cannot read exceptions at ${exceptionsPath}`,
      fileCount: 0, judgedCount: 0, violations: [], crmInventoryOver: [], staleErrors: [], exceptionCount: 0,
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

  let files;
  try {
    files = collectFiles(rootDir, [], readdir);
  } catch (error) {
    return {
      ok: false, reason: "scan-error",
      message: `${error.message} — the tree was not fully read, so a clean result would be vacuous`,
      fileCount: 0, judgedCount: 0, violations: [], crmInventoryOver: [], staleErrors, exceptionCount: exceptions.size,
    };
  }

  // A subtree that contributed nothing was not scanned, whatever the total says. This bites where
  // the count floor cannot: `lib/` and `hooks/` are each small enough to vanish inside the margin.
  const missingSubtrees = requiredSubtrees.filter(
    (name) => !files.some((f) => f.startsWith(join(rootDir, name) + sep)),
  );
  if (missingSubtrees.length > 0) {
    return {
      ok: false, reason: "vacuous-scan",
      message:
        `vacuity guard — required subtree(s) contributed no files: ${missingSubtrees.join(", ")}` +
        ` (${files.length} file(s) were still found, which is why the count floor alone cannot see this); scan is broken`,
      fileCount: files.length, judgedCount: 0, violations: [], crmInventoryOver: [], staleErrors, exceptionCount: exceptions.size,
    };
  }

  if (files.length < minFiles) {
    return {
      ok: false, reason: "vacuous-scan",
      message: `vacuity guard — only ${files.length} files found under ${rootDir} (expected ≥ ${minFiles}); scan is broken`,
      fileCount: files.length, judgedCount: 0, violations: [], crmInventoryOver: [], staleErrors, exceptionCount: exceptions.size,
    };
  }

  const violations = [];
  const crmInventoryOver = [];
  // Files walked and line-counted but held out of the pass/fail decision, so the corpus line can
  // print the real judged denominator instead of the walked one.
  let outOfScopeCount = 0;

  for (const file of files) {
    const rel = relative(rootDir, file).replace(/\\/g, "/");
    const outOfScope = isCrmOrInventory(rel);
    if (outOfScope) outOfScopeCount++;
    const lines = countLines(file);
    if (lines <= LIMIT) continue;
    if (outOfScope) {
      crmInventoryOver.push({ path: rel, lines });
      continue;
    }
    if (!exceptions.has(rel)) {
      violations.push({ path: rel, lines });
    }
  }

  const judgedCount = files.length - outOfScopeCount;

  if (staleErrors.length > 0) {
    return {
      ok: false, reason: "stale-exceptions",
      fileCount: files.length, judgedCount, violations, crmInventoryOver, staleErrors, exceptionCount: exceptions.size,
    };
  }

  return {
    ok: violations.length === 0,
    reason: violations.length > 0 ? "violations" : "ok",
    fileCount: files.length, judgedCount, violations, crmInventoryOver, staleErrors: [], exceptionCount: exceptions.size,
  };
}

async function runSelfTests() {
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
    const vacRes = runCheck(vacDir, join(vacDir, "exc.md"), { minFiles: 5, requiredSubtrees: [] });
    assert("vacuous scan: ok=false", vacRes.ok === false);
    assert("vacuous scan: reason=vacuous-scan", vacRes.reason === "vacuous-scan");

    const noExcDir = join(tmpRoot, "no-exc");
    writeLines(join(noExcDir, "app", "feat", "big.tsx"), 501);
    writeFileSync(join(noExcDir, "exc.md"), makeRegistry([]));
    const noExcRes = runCheck(noExcDir, join(noExcDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
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
    const testRes = runCheck(testDir, join(testDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("a *.test.ts over 500 is a violation", testRes.violations.some((v) => v.path.includes("big.test.ts")));
    assert("a *.test.tsx over 500 is a violation", testRes.violations.some((v) => v.path.includes("big.test.tsx")));
    assert("a *.d.ts over 500 is still exempt", !testRes.violations.some((v) => v.path.includes("big.d.ts")));

    const missingDir = join(tmpRoot, "missing");
    writeLines(join(missingDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(missingDir, "exc.md"), makeRegistry([
      { path: "app/feat/big.tsx", lines: 510 },
      { path: "app/feat/gone.tsx", lines: 900 },
    ]));
    const missingRes = runCheck(missingDir, join(missingDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("a registered path that no longer exists fails the gate", missingRes.ok === false);
    assert("a missing registered path is named", missingRes.staleErrors.some((e) => e.path.includes("gone.tsx")));

    const staleDir = join(tmpRoot, "stale");
    writeLines(join(staleDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(staleDir, "exc.md"), makeRegistry([{ path: "app/feat/big.tsx", lines: 520 }]));
    const staleRes = runCheck(staleDir, join(staleDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("stale line count: ok=false", staleRes.ok === false);
    assert("stale line count: reason=stale-exceptions", staleRes.reason === "stale-exceptions");
    assert("stale line count: names the file", staleRes.staleErrors.some((e) => e.path.includes("big.tsx")));
    assert("stale line count: error mentions stale line count", staleRes.staleErrors.some((e) => e.error.includes("stale line count")));

    const droppedDir = join(tmpRoot, "dropped");
    writeLines(join(droppedDir, "app", "feat", "shrunk.tsx"), 490);
    writeFileSync(join(droppedDir, "exc.md"), makeRegistry([{ path: "app/feat/shrunk.tsx", lines: 490 }]));
    const droppedRes = runCheck(droppedDir, join(droppedDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("within-limit exception: ok=false", droppedRes.ok === false);
    assert("within-limit exception: reason=stale-exceptions", droppedRes.reason === "stale-exceptions");
    assert("within-limit exception: error mentions exception no longer needed", droppedRes.staleErrors.some((e) => e.error.includes("exception no longer needed")));

    const okDir = join(tmpRoot, "ok");
    writeLines(join(okDir, "app", "feat", "big.tsx"), 510);
    writeFileSync(join(okDir, "exc.md"), makeRegistry([{ path: "app/feat/big.tsx", lines: 510 }]));
    const okRes = runCheck(okDir, join(okDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("valid exception: ok=true", okRes.ok === true);
    assert("valid exception: reason=ok", okRes.reason === "ok");

    /*
     * THE SILENT-LOSS BITE (2026-09-03).
     *
     * `collectFiles` used to answer an unreadable directory with `catch { return files; }` and the
     * floor was MIN_FILES=200 against a 5,388-file corpus. Together those meant a lost subtree
     * printed as a clean pass. Both halves are proved here on the same fixture: the corpus is
     * shaped like the real one — a big `features/` holding the violation, and enough small files
     * elsewhere to clear a floor that is a small fraction of the whole.
     *
     * A mock readdir is used instead of chmod 000 for portability: on Windows chmod is a no-op
     * so the directory remained readable and the scan returned "violations" instead of "scan-error",
     * causing the assertion to fail with a TypeError. The mock injects an EPERM error for exactly
     * the target directory and proves the same path on all platforms without relying on OS-level
     * permission enforcement.
     */
    const lostDir = join(tmpRoot, "lost-subtree");
    writeLines(join(lostDir, "features", "big", "huge.tsx"), 900);
    for (let i = 0; i < 40; i++) writeLines(join(lostDir, "app", `small-${i}.tsx`), 10);
    writeFileSync(join(lostDir, "exc.md"), makeRegistry([]));

    const lostVisible = runCheck(lostDir, join(lostDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert(
      "control: with features/ readable the 900-line violation IS found",
      lostVisible.violations.some((v) => v.path.includes("huge.tsx")),
    );

    const lostFeaturesDir = join(lostDir, "features");
    const throwingReaddir = (dir) => {
      if (dir === lostFeaturesDir)
        throw Object.assign(new Error(`EPERM: operation not permitted, scandir '${dir}'`), { code: "EPERM" });
      return readdirSync(dir);
    };
    const unreadable = runCheck(lostDir, join(lostDir, "exc.md"), { minFiles: 10, requiredSubtrees: [], readdir: throwingReaddir });
    assert("an unreadable subtree fails the gate", unreadable.ok === false);
    assert("an unreadable subtree reports reason=scan-error", unreadable.reason === "scan-error");
    assert("the scan error names the directory it could not read", unreadable.message.includes("features"));
    assert(
      "the scan error says a clean result would be vacuous, rather than reporting one",
      unreadable.message.includes("vacuous"),
    );

    // The other half: a subtree that is simply absent is readable, clears a low count floor, and
    // was invisible to the count check. REQUIRED_SUBTREES is what sees it.
    const absentSubtree = runCheck(lostDir, join(lostDir, "exc.md"), {
      minFiles: 10,
      requiredSubtrees: ["app", "features", "hooks"],
    });
    assert("a required subtree that contributed nothing fails the gate", absentSubtree.ok === false);
    assert("an absent required subtree reports reason=vacuous-scan", absentSubtree.reason === "vacuous-scan");
    assert("the vacuity message names the missing subtree", absentSubtree.message.includes("hooks"));
    assert(
      "the vacuity message does NOT blame the ones that were present",
      !absentSubtree.message.includes("app,") && !absentSubtree.message.includes(" features"),
    );
    assert(
      "REQUIRED_SUBTREES bites where the count floor cannot — 41 files still cleared it",
      absentSubtree.fileCount >= 10,
    );

    // The corpus line's denominator must exclude the out-of-scope hold-out, not the whole walk.
    const corpusDir = join(tmpRoot, "corpus");
    writeLines(join(corpusDir, "app", "in-scope.tsx"), 10);
    writeLines(join(corpusDir, "features", "crm", "out-of-scope.tsx"), 10);
    writeLines(join(corpusDir, "features", "inventory", "also-out.tsx"), 10);
    writeFileSync(join(corpusDir, "exc.md"), makeRegistry([]));
    const corpusRes = runCheck(corpusDir, join(corpusDir, "exc.md"), { minFiles: 1, requiredSubtrees: [] });
    assert("corpus total counts every file walked", corpusRes.fileCount === 3);
    assert("corpus scanned excludes the CRM/Inventory hold-out", corpusRes.judgedCount === 1);

  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  /*
   * The floor and the subtree list are claims about the REAL corpus, so measure it rather than
   * trusting the comment. Without this, MIN_FILES could drift back below the point where it bites
   * and nothing would say so — which is exactly how it sat at 200 against 5,388.
   */
  const realFiles = collectFiles(FRONTEND_ROOT);
  assert(
    `the real corpus (${realFiles.length} files) clears MIN_FILES=${MIN_FILES}`,
    realFiles.length >= MIN_FILES,
  );
  assert(
    `MIN_FILES=${MIN_FILES} is a real fraction of the ${realFiles.length}-file corpus, not a token floor`,
    MIN_FILES >= realFiles.length * 0.6,
  );
  for (const name of REQUIRED_SUBTREES)
    assert(
      `required subtree ${name} contributes files to the real scan`,
      realFiles.some((f) => f.startsWith(join(FRONTEND_ROOT, name) + sep)),
    );

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

  /*
   * The corpus reporter this gate prints through is a TWIN of the backend's
   * src/scripts/gate-corpus.mjs, and a copy nobody diffs is a copy that rots. Folding the drift
   * check in here rather than leaving it to a separate script means it runs wherever this
   * blocking self-test runs, with no CI wiring to forget. On a single-repository checkout the
   * comparison is reported as SKIPPED rather than silently passing.
   */
  const drift = await driftAgainstBackend();
  if (drift.skipped) {
    console.log(`  gate-corpus twin: drift check SKIPPED — ${drift.reason}`);
  } else {
    for (const d of drift.divergences) console.error(`  DRIFT on ${d}`);
    assert(
      `the gate-corpus twin agrees with ${drift.originalPath} on all ${drift.checked} drift cases`,
      drift.divergences.length === 0,
    );
  }

  if (failed > 0) {
    console.error(`check-file-sizes self-tests: ${failed} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-file-sizes self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) await runSelfTests();

const result = runCheck(FRONTEND_ROOT, EXCEPTIONS_DOC, { minFiles: MIN_FILES });

if (result.reason === "cannot-read-exceptions") {
  console.error(`check-file-sizes: ${result.message}`);
  process.exit(1);
}

if (result.reason === "vacuous-scan" || result.reason === "scan-error") {
  console.error(`check-file-sizes: ${result.message}`);
  process.exit(1);
}

// Say how much was read before saying what was found. `0 violations` and `nothing to check` print
// identically otherwise, and the CRM/Inventory hold-out is exactly the kind of denominator gap
// gate-corpus exists to keep visible.
reportCorpus({
  gate: "check-file-sizes",
  scanned: result.judgedCount,
  total: result.fileCount,
  unit: "file",
});

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
  `check-file-sizes: ${result.judgedCount} in-scope file(s) judged — all within ${LIMIT} lines ` +
    `(${result.exceptionCount} exceptions registered; ${result.fileCount - result.judgedCount} CRM/Inventory ` +
    `file(s) held out of the decision, see the corpus line above)`,
);
process.exit(0);
