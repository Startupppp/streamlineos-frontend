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
const EXTENSIONS = new Set([".tsx", ".jsx"]);
const MIN_FILES = 500;

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

/**
 * Walks forward from `<Button` to the `>` that closes its props, ignoring any
 * `>` inside a quoted string or a `{…}` expression — `className={cn(a > b)}`
 * and `title=">"` both carry one that is not the end of the tag.
 */
function findPropsEnd(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return i;
  }
  return -1;
}

/** The matching `</Button>`, counting nested `<Button` so a wrapper is not cut short. */
function findClose(text, start) {
  let depth = 1;
  let i = start;
  while (i < text.length) {
    const open = text.indexOf("<Button", i);
    const close = text.indexOf("</Button>", i);
    if (close === -1) return -1;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 7;
      continue;
    }
    depth--;
    if (depth === 0) return close;
    i = close + 9;
  }
  return -1;
}

/**
 * RULE 2 — an icon-only button at ANY size.
 *
 * Rule 1 anchors on the literal `size="icon"`, so an icon-only `size="sm"`
 * button — the shape two Refresh controls on the AI-credits page shipped in —
 * passed it. This rule reads the element instead of a line.
 *
 * It deliberately says nothing about a button whose children hold a `{…}`
 * expression: `<Button>{children}</Button>` and `<Button>{label}</Button>` may
 * well be labelled at runtime, and treating them as bare reported 93 buttons of
 * which 88 were the canonical primitives themselves. Unprovable is not a
 * violation.
 */
function scanFileForAnySizeIconButtons(content, lines, file, root, violations) {
  let idx = content.indexOf("<Button");
  while (idx !== -1) {
    const propsEnd = findPropsEnd(content, idx);
    if (propsEnd === -1) return;
    const props = content.slice(idx, propsEnd);
    const selfClosing = content[propsEnd - 1] === "/";

    // `size="icon"` is rule 1's, so each button is reported exactly once.
    if (!selfClosing && !props.includes('size="icon"')) {
      const closeIdx = findClose(content, propsEnd + 1);
      if (closeIdx !== -1) {
        const children = content.slice(propsEnd + 1, closeIdx);
        const labelled =
          props.includes("aria-label") ||
          props.includes("aria-labelledby") ||
          props.includes("title=") ||
          children.includes("sr-only");
        const hasIcon = /<[A-Z]/.test(children);
        const hasExpression = children.includes("{");
        const bare = children.replace(/<[^>]*>/g, "").trim();

        if (hasIcon && !hasExpression && !labelled && bare.length === 0) {
          const line = content.slice(0, idx).split("\n").length;
          const context = lines
            .slice(Math.max(0, line - 13), line + 12)
            .join("\n");
          if (
            !context.includes("AnimatedIconButton") &&
            !context.includes("TooltipIconButton") &&
            !context.includes("TooltipTrigger")
          )
            violations.push(`  ${relative(root, file)}:${line}`);
        }
      }
    }
    idx = content.indexOf("<Button", idx + 7);
  }
}

export function scan(root) {
  const violations = [];
  let scannedFiles = 0;

  for (const file of walkFiles(root)) {
    scannedFiles++;
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");

    if (content.includes("<Button"))
      scanFileForAnySizeIconButtons(content, lines, file, root, violations);

    if (!content.includes('size="icon"')) continue;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('size="icon"')) continue;

      const before = lines.slice(Math.max(0, i - 12), i).join("\n");
      const after = lines.slice(i + 1, Math.min(lines.length, i + 12)).join("\n");
      const context = before + "\n" + lines[i] + "\n" + after;

      if (
        context.includes("AnimatedIconButton") ||
        context.includes("TooltipIconButton") ||
        context.includes("TooltipTrigger")
      )
        continue;

      if (
        context.includes("aria-label") ||
        context.includes("aria-labelledby") ||
        context.includes("sr-only")
      )
        continue;

      violations.push(`  ${relative(root, file)}:${i + 1}`);
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

  const fixture = mkdtempSync(join(tmpdir(), "icon-labels-"));
  try {
    mkdirSync(join(fixture, "features", "deep"), { recursive: true });
    mkdirSync(join(fixture, ".next-custom"), { recursive: true });

    writeFileSync(
      join(fixture, "features", "deep", "bad.tsx"),
      ['export function A() {', '  return <Button variant="ghost" size="icon"><TrashIcon /></Button>;', "}"].join("\n"),
    );
    writeFileSync(
      join(fixture, "labelled.tsx"),
      ['export function B() {', '  return <Button size="icon" aria-label="Delete row"><TrashIcon /></Button>;', "}"].join("\n"),
    );
    writeFileSync(
      join(fixture, "sr-only.tsx"),
      [
        "export function C() {",
        '  return <Button size="icon"><TrashIcon /><span className="sr-only">Delete</span></Button>;',
        "}",
      ].join("\n"),
    );
    writeFileSync(
      join(fixture, "wrapper.tsx"),
      ['export function D() {', '  return <AnimatedIconButton icon={TrashIcon} size="icon" />;', "}"].join("\n"),
    );
    writeFileSync(
      join(fixture, "labelled-above.tsx"),
      [
        "export function E() {",
        "  return (",
        "    <Button",
        '      aria-label="Open menu"',
        '      variant="ghost"',
        '      size="icon"',
        "    >",
        "      <EllipsisIcon />",
        "    </Button>",
        "  );",
        "}",
      ].join("\n"),
    );
    writeFileSync(join(fixture, ".next-custom", "chunk.jsx"), 'x(<Button size="icon"><I/></Button>);');

    writeFileSync(
      join(fixture, "bad-sm.tsx"),
      ['export function F() {', '  return <Button variant="ghost" size="sm"><RefreshCw /></Button>;', "}"].join("\n"),
    );
    writeFileSync(
      join(fixture, "labelled-sm.tsx"),
      ['export function G() {', '  return <Button size="sm" aria-label="Refresh"><RefreshCw /></Button>;', "}"].join("\n"),
    );
    writeFileSync(
      join(fixture, "expression-child.tsx"),
      ['export function H() {', '  return <Button size="sm"><Icon />{children}</Button>;', "}"].join("\n"),
    );

    const { violations, scannedFiles } = scan(fixture);
    const joined = violations.join("\n");

    assert("an unlabelled icon-only button is rejected", joined.includes("bad.tsx:2"));
    assert(
      'rule 2 bites: an icon-only size="sm" button is rejected',
      joined.includes("bad-sm.tsx:2"),
    );
    assert(
      'an icon-only size="sm" button WITH aria-label is accepted',
      !joined.includes("labelled-sm.tsx"),
    );
    assert(
      "a button whose children hold a {expression} is not called bare",
      !joined.includes("expression-child.tsx"),
    );
    assert("aria-label on the same line is accepted", !joined.includes("labelled.tsx"));
    assert("sr-only text is accepted", !joined.includes("sr-only.tsx"));
    assert("AnimatedIconButton is accepted", !joined.includes("wrapper.tsx"));
    assert("aria-label on a preceding prop line is accepted", !joined.includes("labelled-above.tsx"));
    assert("generated build output is outside the corpus", !joined.includes("chunk.jsx"));
    assert("the scan recurses into nested directories", joined.includes(join("features", "deep")));
    assert("exactly the two known-bad buttons are reported", violations.length === 2);
    assert("the vacuity floor would fire on this fixture", scannedFiles < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`\u2716  self-test FAILED: ${f}`);
    console.error(`check-no-unlabeled-icon-buttons self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-unlabeled-icon-buttons self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const { violations, scannedFiles } = scan(ROOT);

if (scannedFiles < MIN_FILES) {
  console.error(`\u2716  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`\u2714  No icon-only buttons without an accessible name found (${scannedFiles} files scanned).`);
  process.exit(0);
}
console.error(
  `\u2716  ${violations.length} icon-only button(s) without an accessible name.\n` +
    `   Add aria-label, aria-labelledby, or sr-only text; or use AnimatedIconButton / TooltipIconButton:`,
);
for (const v of violations) console.error(v);
process.exit(1);
