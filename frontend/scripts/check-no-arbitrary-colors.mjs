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
  let scannedFiles = 0;
  for (const file of walkFiles(root)) {
    scannedFiles++;
    const content = readFileSync(file, "utf8");
    if (HEX_ARBITRARY.test(content)) {
      content.split("\n").forEach((line, i) => {
        if (HEX_ARBITRARY.test(line)) violations.push(`  ${relative(root, file)}:${i + 1}  ${line.trim()}`);
      });
    }
    if (JSX_EXTENSIONS.has(extname(file)) && MUTED_FG_OPACITY_PATTERN.test(content)) {
      const rel = relative(root, file);
      if (!MUTED_FG_OPACITY_ALLOWLIST.has(rel)) {
        content.split("\n").forEach((line, i) => {
          if (MUTED_FG_OPACITY_PATTERN.test(line)) fgOpacityViolations.push(`  ${rel}:${i + 1}  ${line.trim()}`);
        });
      }
    }
  }
  return { violations, fgOpacityViolations, scannedFiles };
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

    const { violations, fgOpacityViolations, scannedFiles } = scan(fixture);
    const joined = violations.join("\n");
    const fgJoined = fgOpacityViolations.join("\n");

    assert("a known-bad arbitrary hex colour is rejected", violations.length === 2);
    assert("the finding names the file and line", joined.includes("bad.tsx:1"));
    assert("a second arbitrary hex form is also caught", joined.includes("bad-style.tsx:1"));
    assert("the scan recurses into nested source directories", joined.includes(join("features", "deep")));
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

const { violations, fgOpacityViolations, scannedFiles } = scan(ROOT);

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

if (exitCode === 0) {
  console.log(`✔  No arbitrary hex colours or text-muted-foreground opacity violations found (${scannedFiles} files scanned).`);
}

process.exit(exitCode);
