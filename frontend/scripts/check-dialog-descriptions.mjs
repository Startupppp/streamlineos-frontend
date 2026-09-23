#!/usr/bin/env node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const BASELINE = 215;
const MIN_FILES = 1500;

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const EXTRA_EXCLUDED_DIRS = new Set(["dist", "public", "scripts"]);

const OVERLAY_TAGS = [
  "DialogContent",
  "SheetContent",
  "AlertDialogContent",
  "DrawerContent",
];

const DESCRIPTION_TAG = /<[A-Za-z][A-Za-z0-9_]*Description[\s/>]/;

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
    } else if (stat.isFile() && extname(entry) === ".tsx") {
      files.push(full);
    }
  }
  return files;
}

function findOpeningTagEnd(source, tagStart) {
  let depth = 0;
  let quote = null;
  for (let i = tagStart; i < source.length; i++) {
    const ch = source[i];
    if (quote !== null) {
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

function findClosingTag(source, tag, afterOpeningTag) {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let depth = 1;
  let cursor = afterOpeningTag;
  while (cursor < source.length) {
    const nextOpen = source.indexOf(open, cursor);
    const nextClose = source.indexOf(close, cursor);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      cursor = nextOpen + open.length;
      continue;
    }
    depth--;
    if (depth === 0) return nextClose;
    cursor = nextClose + close.length;
  }
  return -1;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++;
  return line;
}

function findUndescribedOverlays(source) {
  const findings = [];
  for (const tag of OVERLAY_TAGS) {
    const open = `<${tag}`;
    let cursor = 0;
    while (cursor < source.length) {
      const start = source.indexOf(open, cursor);
      if (start === -1) break;
      const nextChar = source[start + open.length];
      if (nextChar !== undefined && /[A-Za-z0-9_]/.test(nextChar)) {
        cursor = start + open.length;
        continue;
      }
      const tagEnd = findOpeningTagEnd(source, start);
      if (tagEnd === -1) break;
      const attributes = source.slice(start, tagEnd);
      const selfClosing = source[tagEnd - 1] === "/";
      let body = "";
      let next = tagEnd + 1;
      if (!selfClosing) {
        const closeAt = findClosingTag(source, tag, tagEnd + 1);
        if (closeAt === -1) {
          cursor = tagEnd + 1;
          continue;
        }
        body = source.slice(tagEnd + 1, closeAt);
        next = closeAt + tag.length + 3;
      }
      const described =
        attributes.includes("aria-describedby") || DESCRIPTION_TAG.test(body);
      if (!described) findings.push({ tag, line: lineOf(source, start) });
      cursor = next;
    }
  }
  return findings;
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

  assert("BASELINE is a non-negative integer", Number.isInteger(BASELINE) && BASELINE >= 0);
  assert("MIN_FILES is a positive integer", Number.isInteger(MIN_FILES) && MIN_FILES > 0);
  assert("all four overlay primitives are covered", OVERLAY_TAGS.length === 4);

  const fixture = mkdtempSync(join(tmpdir(), "fe-dialog-descriptions-self-test-"));
  try {
    mkdirSync(join(fixture, "features", "nested"), { recursive: true });
    mkdirSync(join(fixture, "node_modules"), { recursive: true });
    mkdirSync(join(fixture, ".next-custom"), { recursive: true });
    mkdirSync(join(fixture, "feedbucket-widget"), { recursive: true });
    mkdirSync(join(fixture, "dist"), { recursive: true });
    mkdirSync(join(fixture, "coverage"), { recursive: true });

    const planted = {
      "known-bad.tsx": `
export function Bad() {
  return (
    <Dialog open>
      <DialogContent className="max-w-sm">
        <DialogTitle>Edit</DialogTitle>
      </DialogContent>
    </Dialog>
  );
}
`,
      "known-good-description.tsx": `
export function Good() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Change the contact details.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
`,
      "known-good-aria.tsx": `
export function GoodAria() {
  return (
    <SheetContent aria-describedby="summary">
      <SheetTitle>Invoice</SheetTitle>
    </SheetContent>
  );
}
`,
      "self-closing-bad.tsx": `
export function SelfClosing() {
  return <DrawerContent className="p-0" />;
}
`,
      "alert-bad.tsx": `
export function AlertBad() {
  return (
    <AlertDialogContent>
      <AlertDialogTitle>Delete</AlertDialogTitle>
    </AlertDialogContent>
  );
}
`,
      "features/nested/sibling-mix.tsx": `
export function Mixed() {
  return (
    <>
      <DialogContent>
        <DialogTitle>First</DialogTitle>
      </DialogContent>
      <DialogContent>
        <DialogDescription>Second is described.</DialogDescription>
      </DialogContent>
    </>
  );
}
`,
      "nested-description.tsx": `
export function Nested() {
  return (
    <DialogContent>
      <div className="wrap">
        <section>
          <DialogDescription className="sr-only">Deeply nested.</DialogDescription>
        </section>
      </div>
    </DialogContent>
  );
}
`,
      "brace-in-attributes.tsx": `
export function Braces() {
  return (
    <DrawerContent className={cn("a > b", { open: true })}>
      <DrawerDescription>Described despite a greater-than in props.</DrawerDescription>
    </DrawerContent>
  );
}
`,
      "prefix-collision.tsx": `
export function Prefix() {
  return (
    <DialogContentWrapper>
      <p>not an overlay primitive</p>
    </DialogContentWrapper>
  );
}
`,
      "node_modules/dep.tsx": `export const D = () => <DialogContent><DialogTitle>x</DialogTitle></DialogContent>;`,
      ".next-custom/chunk.tsx": `export const D = () => <DialogContent><DialogTitle>x</DialogTitle></DialogContent>;`,
      "feedbucket-widget/panel.tsx": `export const D = () => <DialogContent><DialogTitle>x</DialogTitle></DialogContent>;`,
      "dist/bundle.tsx": `export const D = () => <DialogContent><DialogTitle>x</DialogTitle></DialogContent>;`,
      "coverage/report.tsx": `export const D = () => <DialogContent><DialogTitle>x</DialogTitle></DialogContent>;`,
      "not-jsx.ts": `export const source = "<DialogContent><DialogTitle>x</DialogTitle></DialogContent>";`,
    };

    for (const [name, content] of Object.entries(planted)) {
      writeFileSync(join(fixture, name), content);
    }

    const collected = collectFiles(fixture).map((f) => f.replace(/\\/g, "/"));
    const byFile = new Map();
    for (const file of collected) {
      byFile.set(file, findUndescribedOverlays(readFileSync(file, "utf8")));
    }
    const flagged = (suffix) =>
      [...byFile.entries()]
        .filter(([file]) => file.endsWith(suffix))
        .flatMap(([, findings]) => findings);

    assert(
      "a DialogContent carrying only a title is reported — the planted known-bad",
      flagged("/known-bad.tsx").length === 1,
    );
    assert(
      "a DialogContent carrying a DialogDescription is not reported — the planted known-good",
      flagged("/known-good-description.tsx").length === 0,
    );
    assert(
      "an explicit aria-describedby on the opening tag is accepted as a description",
      flagged("/known-good-aria.tsx").length === 0,
    );
    assert(
      "a self-closing overlay has no body and is reported",
      flagged("/self-closing-bad.tsx").length === 1,
    );
    assert(
      "AlertDialogContent is covered, not only DialogContent",
      flagged("/alert-bad.tsx").length === 1,
    );
    assert(
      "a described SIBLING overlay does not rescue an undescribed one in the same file",
      flagged("/sibling-mix.tsx").length === 1,
    );
    assert(
      "a description nested several elements deep still counts as present",
      flagged("/nested-description.tsx").length === 0,
    );
    assert(
      "a greater-than inside a className expression does not truncate the opening tag",
      flagged("/brace-in-attributes.tsx").length === 0,
    );
    assert(
      "a longer component name merely starting with DialogContent is not treated as the primitive",
      flagged("/prefix-collision.tsx").length === 0,
    );
    assert(
      "the reported line number points at the opening tag",
      flagged("/known-bad.tsx")[0]?.line === 5,
    );
    assert("node_modules is excluded", !collected.some((f) => f.includes("node_modules")));
    assert("generated build output is excluded", !collected.some((f) => f.includes(".next-custom")));
    assert("the bundled widget is excluded", !collected.some((f) => f.includes("feedbucket-widget")));
    assert("dist is excluded", !collected.some((f) => f.includes("/dist/")));
    assert("coverage is excluded", !collected.some((f) => f.includes("/coverage/")));
    assert(
      "a .ts file quoting the markup in a string is never scanned",
      !collected.some((f) => f.endsWith("not-jsx.ts")),
    );
    assert(
      "the detector finds a non-zero number of sites on this fixture — a checker that resolves nothing reports zero vacuously",
      [...byFile.values()].flat().length > 0,
    );
    assert("the vacuity guard would fire on this fixture", collected.length < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failed > 0) {
    console.error(`check-dialog-descriptions self-tests: ${failed} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-dialog-descriptions self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTests();

const files = collectFiles(ROOT);

if (files.length < MIN_FILES) {
  console.error(
    `check-dialog-descriptions: vacuity guard — only ${files.length} .tsx files found under ${ROOT} (expected >= ${MIN_FILES}); scan is broken`,
  );
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const finding of findUndescribedOverlays(source)) {
    violations.push({
      path: relative(ROOT, file).replace(/\\/g, "/"),
      line: finding.line,
      tag: finding.tag,
    });
  }
}

const actual = violations.length;

if (actual <= BASELINE) {
  console.log(
    `check-dialog-descriptions: ${actual} overlay sites across ${files.length} files render without a description or an explicit aria-describedby (baseline ${BASELINE}) — OK`,
  );
  process.exit(0);
}

console.error(
  `check-dialog-descriptions: ${actual} undescribed overlay sites — ${actual - BASELINE} above baseline of ${BASELINE}.\n`,
);
violations.sort((a, b) => (a.path === b.path ? a.line - b.line : a.path < b.path ? -1 : 1));
for (const v of violations) console.error(`  ${v.path}:${v.line}  ${v.tag}`);
console.error(
  `\nTo fix: give the new overlay a <*Description> child, or pass aria-describedby when another element already describes it. Lower BASELINE after the count drops.`,
);
process.exit(1);
