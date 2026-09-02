import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const EXTENSIONS = new Set([".tsx", ".jsx"]);
const CANONICAL_EMPTY_STATE = "components/ui/empty-state.tsx";

const EXCEPTIONS = [
  {
    file: "features/org-setup/components/workspace-preview-main.tsx",
    reason: "Absolutely-positioned overlay inside animated onboarding preview — layout context incompatible with EmptyState",
  },
  {
    file: "components/charts/chart-empty-state.tsx",
    reason: "This IS the chart-specific empty-state primitive — the shared counterpart to EmptyState for chart surfaces; converting it would be circular",
  },
];

for (const exc of EXCEPTIONS) {
  if (!exc.reason) {
    console.error(`✖  Exception for "${exc.file}" has no reason — add one.`);
    process.exit(1);
  }
}

const exceptionFileSet = new Set(EXCEPTIONS.map((e) => e.file));

const HANDROLLED_STRUCTURE =
  /flex[^"]*flex-col[^"]*items-center[^"]*justify-center|text-center[^"]*text-muted-foreground[^"]*text-sm/;

const EMPTY_INDICATOR =
  /(?:No\s+(?:results|data|items|records|entries|invoices|branches|members|projects|tickets|employees|leads|deals)|nothing\s+(?:here|yet)|\bempty\b|no-data)/i;

function findHandrolledBlocks(content) {
  const blocks = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!HANDROLLED_STRUCTURE.test(line)) continue;
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length, i + 15);
    const context = lines.slice(start, end).join("\n");
    if (EMPTY_INDICATOR.test(context)) blocks.push(i + 1);
  }
  return blocks;
}

const MIN_FILES = 500;

function runSelfTest(exitWhenDone) {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const handrolled = [
    "export function FixtureEmpty() {",
    "  return (",
    '    <div className="flex flex-col items-center justify-center text-center">',
    '      <p className="text-sm font-medium">No items found</p>',
    "    </div>",
    "  );",
    "}",
  ].join("\n");
  const mutedVariant = [
    "export function FixtureEmpty2() {",
    '  return <p className="text-center text-muted-foreground text-sm">Nothing here yet</p>;',
    "}",
  ].join("\n");
  const canonical = [
    'import { EmptyState } from "@/components/ui/empty-state";',
    "export function Good() {",
    '  return <EmptyState title="No items found" description="Create one to get started." />;',
    "}",
  ].join("\n");
  const centredButNotEmpty = [
    "export function Spinner() {",
    '  return <div className="flex flex-col items-center justify-center text-center"><Loader2 /></div>;',
    "}",
  ].join("\n");
  const emptyWordNoStructure = 'const label = "No results";\n';
  const canonicalNeighbour = [
    "function BuilderErrorState({ error, onRetry }: Props) {",
    "  return (",
    '    <div className="flex-1 flex flex-col items-center justify-center bg-background h-full gap-3 p-6">',
    '      <ErrorState title="Couldn\'t load workflow" description={getErrorMessage(error)} onRetry={onRetry} />',
    "    </div>",
    "  );",
    "}",
    "",
    "function BuilderNotFoundState({ onBack }: Props) {",
    "  return (",
    "    <EmptyState",
    '      illustrationPreset="automations"',
    '      title="Workflow not found"',
    '      description="This workflow was deleted, or the link is out of date."',
    "    />",
    "  );",
    "}",
  ].join("\n");
  const spelledOutEmpty = [
    "export function FixtureEmpty3() {",
    "  return (",
    '    <div className="flex flex-col items-center justify-center">',
    "      <p>This list is empty.</p>",
    "    </div>",
    "  );",
    "}",
  ].join("\n");

  assert("a hand-rolled centred empty block is rejected", findHandrolledBlocks(handrolled).length > 0);
  assert("the finding names the structural line", findHandrolledBlocks(handrolled)[0] === 3);
  assert("the muted-foreground variant is also rejected", findHandrolledBlocks(mutedVariant).length > 0);
  assert("a canonical EmptyState usage is NOT a finding", findHandrolledBlocks(canonical).length === 0);
  assert(
    "a centred container with no empty-state wording is NOT a finding",
    findHandrolledBlocks(centredButNotEmpty).length === 0,
  );
  assert(
    "empty-state wording with no centred structure is NOT a finding",
    findHandrolledBlocks(emptyWordNoStructure).length === 0,
  );
  assert(
    "a centred wrapper around the canonical ErrorState is NOT a finding just because <EmptyState> is spelled nearby",
    findHandrolledBlocks(canonicalNeighbour).length === 0,
  );
  assert(
    "BITE — a centred block whose copy says the list is empty IS still a finding",
    findHandrolledBlocks(spelledOutEmpty).length === 1,
  );

  if (failures.length > 0) {
    for (const f of failures) console.error("\u2716  self-test FAILED: " + f);
    console.error(`check-no-handrolled-empty-states self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  if (exitWhenDone) {
    console.log(`check-no-handrolled-empty-states self-tests: ${passed} passed`);
    process.exit(0);
  }
}

runSelfTest(process.argv.includes("--self-test"));

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

const violations = [];
const seenExceptionFiles = new Set();
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  scannedFiles++;
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === CANONICAL_EMPTY_STATE) continue;

  if (exceptionFileSet.has(rel)) {
    seenExceptionFiles.add(rel);
    continue;
  }

  const content = readFileSync(file, "utf8");
  const blocks = findHandrolledBlocks(content);
  for (const lineNum of blocks) {
    violations.push(`  ${rel}:${lineNum}`);
  }
}

if (scannedFiles < MIN_FILES) {
  console.error(
    "\u2716  Only " + scannedFiles + " files scanned (floor " + MIN_FILES + ") — the walk is broken, so a clean result would prove nothing.",
  );
  process.exit(1);
}

const staleExceptions = EXCEPTIONS.filter((e) => !seenExceptionFiles.has(e.file));
if (staleExceptions.length > 0) {
  console.error(
    "✖  Stale exception(s) — these files no longer exist; remove their entries from EXCEPTIONS:",
  );
  for (const e of staleExceptions) console.error(`  ${e.file} — ${e.reason}`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log("✔  No hand-rolled empty states found outside EmptyState (" + scannedFiles + " files scanned).");
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} hand-rolled empty state block(s) found.\n` +
      `   Use <EmptyState> from components/ui/empty-state.tsx when touching these files:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
