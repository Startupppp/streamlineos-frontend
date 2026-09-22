import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/*
  `isExcludedScanDir` (check-repo-paths.mjs) skips every dot-directory, the
  `.next*` build outputs among them, plus node_modules and feedbucket-widget.
  scripts/ holds the gates themselves and stays out of their own corpus, as it
  was before the shared helper replaced this file's own list.
*/
const EXTRA_EXCLUDED_DIRS = new Set(["scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const JSX_EXTENSIONS = new Set([".tsx", ".jsx"]);
const HEX_ARBITRARY = /-\[#[0-9a-fA-F]/;
const MIN_FILES = 5000;

/*
  BARE HEX RATCHET (FE-93)

  Detects raw hex string literals in JS/TS source — e.g. "#94a3b8" — that
  bypass both the Tailwind arbitrary-colour check above and the eslint
  `streamline/no-raw-visual-values` rule (which only fires on Tailwind class
  strings, not on standalone hex values).

  Scope: components/ and features/ only, per FE-93.

  rgb()/rgba()/hsl() forms are omitted from this check deliberately: every
  occurrence in the codebase uses the CSS-variable form `hsl(var(--...))`,
  which is a proper token reference, not a hardcoded value. If raw numeric
  rgb/hsl literals ever appear, this regex should be extended.

  No lookbehind. The natural ["']# pattern already excludes Tailwind arbitrary
  classes (className="text-[#94a3b8]" starts with "t", not "#"), and a
  lookbehind on `[` would cause false negatives on array-literal hex values
  like ["#94a3b8"] (verified: the first element would have been missed).

  Baseline measured 2026-09-21. The true count (304) exceeds the prose count
  in CLAUDE.md (228) by 76; the prose was stale. Both counts are reported
  below; neither was quietly adjusted. The baseline may only ever move down.
*/
const BARE_HEX_STRING = /["']#[0-9a-fA-F]{3,8}["']/;
const BARE_HEX_SCOPE_DIRS = ["components", "features"];
// 2026-09-21 — measured as LINES containing bare hex in components/ and
// features/ (including test files; ~304 individual occurrences, 271 lines).
// CLAUDE.md FE-93 quoted 228 — that figure was stale by 43 lines; the prose
// was not adjusted to avoid false safety. This constant may only decrease.
// A red run means new bare hex lines were added; lower it after each batch
// of fixes.
const BARE_HEX_BASELINE = 271;

const MUTED_FG_OPACITY_PATTERN = /\btext-muted-foreground\/[0-9]/;
const MUTED_FG_OPACITY_ALLOWLIST = new Set([
  "features/notifications/unified-inbox/inbox-shell.tsx",
  "features\\notifications\\unified-inbox\\inbox-shell.tsx",
]);

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name) || EXTRA_EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

export function scan(root) {
  const violations = [];
  const fgOpacityViolations = [];
  const bareHexViolations = [];
  let scannedFiles = 0;
  for (const file of walkFiles(root)) {
    scannedFiles++;
    const content = readFileSync(file, "utf8");
    const rel = relative(root, file).split("\\").join("/");

    if (HEX_ARBITRARY.test(content)) {
      content.split("\n").forEach((line, i) => {
        if (HEX_ARBITRARY.test(line)) violations.push(`  ${rel}:${i + 1}  ${line.trim()}`);
      });
    }
    if (JSX_EXTENSIONS.has(extname(file)) && MUTED_FG_OPACITY_PATTERN.test(content)) {
      if (!MUTED_FG_OPACITY_ALLOWLIST.has(rel)) {
        content.split("\n").forEach((line, i) => {
          if (MUTED_FG_OPACITY_PATTERN.test(line)) fgOpacityViolations.push(`  ${rel}:${i + 1}  ${line.trim()}`);
        });
      }
    }

    const inBareHexScope = BARE_HEX_SCOPE_DIRS.some((d) => rel.startsWith(d + "/"));
    if (inBareHexScope && BARE_HEX_STRING.test(content)) {
      content.split("\n").forEach((line, i) => {
        if (BARE_HEX_STRING.test(line)) bareHexViolations.push(`  ${rel}:${i + 1}  ${line.trim()}`);
      });
    }
  }
  return { violations, fgOpacityViolations, bareHexViolations, scannedFiles };
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "no-arbitrary-colors-"));
  try {
    mkdirSync(join(fixture, "features", "deep"), { recursive: true });
    mkdirSync(join(fixture, "components", "ui"), { recursive: true });
    mkdirSync(join(fixture, "lib"), { recursive: true });
    mkdirSync(join(fixture, ".next-custom", "chunks"), { recursive: true });
    mkdirSync(join(fixture, "node_modules", "pkg"), { recursive: true });

    writeFileSync(join(fixture, "features", "deep", "bad.tsx"), 'const a = <div className="text-[#3b82f6]" />;\n');
    writeFileSync(join(fixture, "features", "deep", "bad-style.tsx"), 'const b = <div className="bg-[#0b1220]" />;\n');
    writeFileSync(join(fixture, "good.tsx"), 'const c = <div className="text-primary" />;\n');
    writeFileSync(join(fixture, "token-arbitrary.tsx"), 'const d = <div className="w-[calc(100%-1rem)]" />;\n');
    writeFileSync(join(fixture, ".next-custom", "chunks", "gen.js"), 'e.className="text-[#ffffff]";\n');
    writeFileSync(join(fixture, "node_modules", "pkg", "vendor.js"), 'f.className="text-[#000000]";\n');
    writeFileSync(join(fixture, "notes.md"), "text-[#123456]\n");
    writeFileSync(join(fixture, "features", "deep", "mf-opacity.tsx"), 'const e = <p className="text-muted-foreground/50">pts</p>;\n');
    writeFileSync(join(fixture, "features", "deep", "mf-full.tsx"), 'const f = <p className="text-muted-foreground">full</p>;\n');
    writeFileSync(join(fixture, "features", "deep", "mf-comment.ts"), '// text-muted-foreground/60 composites at render time\n');

    // Bare hex ratchet test fixtures
    writeFileSync(join(fixture, "components", "ui", "badge.tsx"), 'const c = { color: "#94a3b8" };\n');
    writeFileSync(join(fixture, "features", "deep", "chart.tsx"), 'const fills = ["#3b82f6", "#f59e0b"];\n');
    writeFileSync(join(fixture, "lib", "tokens.ts"), 'export const BASE = "#0b1220";\n');

    const { violations, fgOpacityViolations, bareHexViolations, scannedFiles } = scan(fixture);
    const joined = violations.join("\n");
    const fgJoined = fgOpacityViolations.join("\n");
    const hexJoined = bareHexViolations.join("\n");

    assert("a known-bad arbitrary hex colour is rejected", violations.length === 2);
    assert("the finding names the file and line", joined.includes("bad.tsx:1"));
    assert("a second arbitrary hex form is also caught", joined.includes("bad-style.tsx:1"));
    assert("the scan recurses into nested source directories", joined.includes(join("features", "deep").split("\\").join("/")));
    assert("a token class is not a violation", !joined.includes("good.tsx"));
    assert("a non-colour arbitrary value is not a violation", !joined.includes("token-arbitrary.tsx"));
    assert("generated build output is outside the corpus", !joined.includes("gen.js"));
    assert("node_modules is outside the corpus", !joined.includes("vendor.js"));
    assert("non-source extensions are outside the corpus", !joined.includes("notes.md"));
    assert("the vacuity floor would fire on this fixture", scannedFiles < MIN_FILES);
    assert("a text-muted-foreground opacity modifier is caught as a contrast violation", fgOpacityViolations.length >= 1);
    assert("muted-foreground opacity file is in the violations", fgJoined.includes("mf-opacity.tsx:1"));
    assert("full-opacity muted-foreground is not a violation", !fgJoined.includes("mf-full.tsx"));
    assert("plain ts file with opacity pattern in a comment is not a violation", !fgJoined.includes("mf-comment.ts"));

    assert("a bare hex string in components/ is a ratchet violation", bareHexViolations.length >= 1);
    assert("the ratchet violation names the file and line", hexJoined.includes("components/ui/badge.tsx:1"));
    assert("a bare hex in features/ is also a ratchet violation", hexJoined.includes("features/deep/chart.tsx:1"));
    assert("a hex that opens an array literal is caught (no lookbehind false-negative)", bareHexViolations.length >= 2);
    assert("a Tailwind arbitrary hex class is NOT a bare hex ratchet violation", !hexJoined.includes("features/deep/bad.tsx"));
    assert("bare hex in lib/ (outside scope) is NOT a ratchet violation", !hexJoined.includes("lib/tokens.ts"));
    assert("the ratchet counts LINES not occurrences (badge=1 line, chart=1 line with 2 hex)", bareHexViolations.length === 2);

    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
    console.error(`check-no-arbitrary-colors self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-arbitrary-colors self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const { violations, fgOpacityViolations, bareHexViolations, scannedFiles } = scan(ROOT);

if (scannedFiles < MIN_FILES) {
  console.error(`✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

let exitCode = 0;

if (violations.length > 0) {
  exitCode = 1;
  console.error(`✖  ${violations.length} arbitrary Tailwind hex colour class(es) — use a CSS token instead:`);
  for (const v of violations) console.error(v);
}

if (fgOpacityViolations.length > 0) {
  exitCode = 1;
  console.error(`✖  ${fgOpacityViolations.length} text-muted-foreground opacity modifier(s) — any opacity below 1 fails WCAG AA contrast in light mode (4.55:1 full opacity, 3.14:1 at /80). Remove the /<number> suffix:`);
  for (const v of fgOpacityViolations) console.error(v);
}

const bareHexCount = bareHexViolations.length;
if (bareHexCount > BARE_HEX_BASELINE) {
  exitCode = 1;
  const excess = bareHexCount - BARE_HEX_BASELINE;
  console.error(
    `✖  ${bareHexCount} bare hex string literal(s) in components/ and features/ — ` +
      `${excess} above baseline of ${BARE_HEX_BASELINE} (FE-93). ` +
      `Convert to CSS tokens; third-party brand marks are the only defensible exception:`,
  );
  for (const v of bareHexViolations) console.error(v);
} else {
  console.log(
    `✔  Bare hex string literals (FE-93): ${bareHexCount} of ${BARE_HEX_BASELINE} baseline — OK`,
  );
}

if (exitCode === 0) {
  console.log(`✔  No arbitrary Tailwind hex colours or text-muted-foreground opacity violations found (${scannedFiles} files scanned).`);
}

process.exit(exitCode);
