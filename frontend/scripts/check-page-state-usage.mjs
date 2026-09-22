import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["app", "components", "features"];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "feedbucket-widget"]);
const TAG = "<PageState";

function assert(cond, msg) {
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function* findTsx(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* findTsx(full);
    else if (entry.name.endsWith(".tsx")) yield full;
  }
}

function openingTagEnd(source, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === "\\") { i++; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") { depth++; continue; }
    if (char === "}") { depth--; continue; }
    if (char === ">" && depth === 0) return i;
  }
  return -1;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++;
  return line;
}

function findSelfClosingPageStates(source) {
  const hits = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(TAG, from);
    if (at === -1) break;
    const after = source[at + TAG.length];
    if (after !== undefined && !/[\s>/]/.test(after)) { from = at + TAG.length; continue; }
    const end = openingTagEnd(source, at + TAG.length);
    if (end === -1) { from = at + TAG.length; continue; }
    const before = source.slice(at, end).trimEnd();
    if (before.endsWith("/")) hits.push({ index: at, line: lineOf(source, at) });
    from = end + 1;
  }
  return hits;
}

function scan(roots) {
  const violations = [];
  for (const root of roots)
    for (const file of findTsx(root))
      for (const hit of findSelfClosingPageStates(readFileSync(file, "utf8")))
        violations.push({ file, line: hit.line });
  return violations;
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthDir = join(ROOT, ".check-page-state-usage-self-test");
  const dir = join(synthDir, "features");
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "bad.tsx"),
    'export function Bad() {\n  return (\n    <PageState resolution={s} loading={null} onRetry={r} className="flex-1" />\n  );\n}\n');
  writeFileSync(join(dir, "good.tsx"),
    'export function Good() {\n  return (\n    <PageState resolution={s} loading={<Skeleton />} onRetry={r}>\n      <Body />\n    </PageState>\n  );\n}\n');
  writeFileSync(join(dir, "nested-jsx-attr.tsx"),
    'export function Tricky() {\n  return (\n    <PageState resolution={s} loading={<A b={<C />} />}>\n      {null}\n    </PageState>\n  );\n}\n');
  writeFileSync(join(dir, "unrelated.tsx"),
    'export function Other() {\n  return <PageStateThing resolution={s} />;\n}\n');

  const found = scan([dir]).map((v) => relative(dir, v.file).replace(/\\/g, "/"));

  assert(found.includes("bad.tsx"), "self-closing <PageState /> was not detected");
  assert(!found.includes("good.tsx"), "a <PageState> with children was wrongly flagged");
  assert(!found.includes("nested-jsx-attr.tsx"), "JSX inside an attribute expression confused the tag scanner");
  assert(!found.includes("unrelated.tsx"), "<PageStateThing> was wrongly matched as <PageState>");
  assert(found.length === 1, `expected exactly 1 violation, got ${found.length}: ${found.join(", ")}`);

  rmSync(synthDir, { recursive: true, force: true });

  console.log("PASS: self-test (5 assertions)\n");
  console.log("  (a) flags a self-closing <PageState />");
  console.log("  (b) accepts a <PageState> that wraps children");
  console.log("  (c) is not fooled by JSX nested inside an attribute expression");
  console.log("  (d) does not match a different tag sharing the prefix");
  console.log("  (e) reports exactly one violation across the fixture tree");
  process.exit(0);
}

if (process.argv.slice(2).includes("--self-test")) runSelfTest();

const violations = scan(SCAN_DIRS.map((d) => join(ROOT, d)));

console.log(`PageState call sites scanned in: ${SCAN_DIRS.join(", ")}`);

if (violations.length > 0) {
  console.error(`\n✖  ${violations.length} self-closing <PageState /> call site(s):\n`);
  for (const v of violations)
    console.error(`   ${relative(ROOT, v.file).replace(/\\/g, "/")}:${v.line}`);
  console.error("\n`children` is required on PageStateProps, so each of these is a TS2741 the");
  console.error("focused jest and eslint runs cannot see. Wrap the real body as children and pass");
  console.error("the real skeleton as `loading`. Worked example: features/build/cycles/cycles-page.tsx");
  process.exit(1);
}

console.log("\n✔  No self-closing <PageState /> call sites.");
process.exit(0);
