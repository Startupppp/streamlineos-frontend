#!/usr/bin/env node
/**
 * Prevents `hsl(var(--TOKEN))` from being written in source.
 *
 * This project is Tailwind 4 CSS-first. Every design token in globals.css is
 * defined as a complete hex colour or rgba value — NOT bare HSL components.
 * Wrapping a complete hex value in `hsl(...)` produces `hsl(#rrggbb)`, which
 * is invalid CSS. The browser drops the declaration silently and the element
 * falls back to its default. Nothing in the lint or type-check chain catches
 * it: it is a valid-looking string to every static analyser, and jsdom does
 * not evaluate CSS.
 *
 * The correct form for any token that resolves to a complete colour value is
 * `var(--TOKEN)` directly. If you need to apply an opacity, use
 * `color-mix(in srgb, var(--TOKEN) <pct>%, transparent)`.
 *
 * Flags:
 *   --self-test   Run the classifier against synthetic fixtures and exit.
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTRA_EXCLUDED_DIRS = new Set(["scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const HSL_VAR_PATTERN = /hsl\(var\(--/;
const MIN_FILES = 5000;

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
  let scannedFiles = 0;
  for (const file of walkFiles(root)) {
    scannedFiles++;
    const content = readFileSync(file, "utf8");
    if (HSL_VAR_PATTERN.test(content)) {
      content.split("\n").forEach((line, i) => {
        if (HSL_VAR_PATTERN.test(line)) {
          violations.push(`  ${relative(root, file)}:${i + 1}  ${line.trim()}`);
        }
      });
    }
  }
  return { violations, scannedFiles };
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "no-hsl-wrapper-"));
  try {
    mkdirSync(join(fixture, "features", "charts"), { recursive: true });
    mkdirSync(join(fixture, ".next-custom", "chunks"), { recursive: true });
    mkdirSync(join(fixture, "node_modules", "pkg"), { recursive: true });

    writeFileSync(
      join(fixture, "features", "charts", "bad.tsx"),
      'const STROKE = "hsl(var(--border))";\n',
    );
    writeFileSync(
      join(fixture, "features", "charts", "bad-opacity.tsx"),
      'const BG = "hsl(var(--muted) / 0.3)";\n',
    );
    writeFileSync(
      join(fixture, "features", "charts", "good.tsx"),
      'const STROKE = "var(--border)";\n',
    );
    writeFileSync(
      join(fixture, "features", "charts", "good-mix.tsx"),
      'const BG = "color-mix(in srgb, var(--muted) 30%, transparent)";\n',
    );
    writeFileSync(
      join(fixture, ".next-custom", "chunks", "gen.js"),
      'const x = "hsl(var(--primary))";\n',
    );
    writeFileSync(
      join(fixture, "node_modules", "pkg", "vendor.js"),
      'const y = "hsl(var(--card))";\n',
    );
    writeFileSync(join(fixture, "notes.md"), 'hsl(var(--border))\n');

    const { violations, scannedFiles } = scan(fixture);
    const joined = violations.join("\n");

    assert("a plain hsl(var(--TOKEN)) is rejected", violations.length >= 1);
    assert("the hsl-with-opacity form is also rejected", violations.length >= 2);
    assert("the finding names the file and line number", joined.includes("bad.tsx:1"));
    assert("the opacity variant is named in the findings", joined.includes("bad-opacity.tsx:1"));
    assert("var(--TOKEN) without hsl() wrapper is not a violation", !joined.includes("good.tsx"));
    assert("color-mix opacity form is not a violation", !joined.includes("good-mix.tsx"));
    assert("generated build output is outside the corpus", !joined.includes("gen.js"));
    assert("node_modules is outside the corpus", !joined.includes("vendor.js"));
    assert("non-source extensions are outside the corpus", !joined.includes("notes.md"));
    assert("the vacuity floor would fire on this fixture", scannedFiles < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
    console.error(`check-no-hsl-token-wrapper self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-hsl-token-wrapper self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const { violations, scannedFiles } = scan(ROOT);

if (scannedFiles < MIN_FILES) {
  console.error(
    `✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

if (violations.length > 0) {
  console.error(
    `✖  ${violations.length} hsl(var(--TOKEN)) wrapper(s) found — tokens resolve to hex values, so hsl() produces invalid CSS. Use var(--TOKEN) directly; for opacity use color-mix(in srgb, var(--TOKEN) <pct>%, transparent):`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}

console.log(`✔  No hsl(var(--)) wrappers found (${scannedFiles} files scanned).`);
process.exit(0);
