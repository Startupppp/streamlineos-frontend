import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);

/*
  A build directory is any name starting with `.next`, not the one called
  exactly `.next`. A dev server run with a custom `distDir` (`.next-buildmart`)
  left its Turbopack output here and this walk read all of it: two gates went
  red over compiled chunks and the rest merely scanned 718MB for nothing.
*/
function isBuildDir(name) {
  return name.startsWith(".next");
}
const EXTENSIONS = new Set([".tsx", ".jsx"]);
const CANONICAL_EMPTY_STATE = "components/ui/empty-state.tsx";

const EXCEPTIONS = [
  {
    file: "components/assistant/ask-os-chat-utils.tsx",
    reason: "Ask OS AI welcome screen with AnimatedLogo, branding, and suggestion chips — not a data-empty state",
  },
  {
    file: "features/build/ai/ai-chat-panel.tsx",
    reason: "AI starter state with AnimatedLogo and 2-col grid of card-style prompt chips — not a data-empty state",
  },
  {
    file: "features/wiki/components/kb-chat-parts.tsx",
    reason: "KB AI welcome with AnimatedLogo and pill chips — not a data-empty state",
  },
  {
    file: "features/chat/empty-chat-state.tsx",
    reason: "Chat welcome with three icon actions — EmptyState supports at most two actions",
  },
  {
    file: "features/org-setup/components/workspace-preview-main.tsx",
    reason: "Absolutely-positioned overlay inside animated onboarding preview — layout context incompatible with EmptyState",
  },
  {
    file: "features/hr/work-logs/work-log-state-cards.tsx",
    reason: "Purpose-built card states inside HR rich-surface card design; Card wrapper is intrinsic to design",
  },
  {
    file: "components/charts/chart-empty-state.tsx",
    reason: "This IS the chart-specific empty-state primitive — the shared counterpart to EmptyState for chart surfaces; converting it would be circular",
  },
  {
    file: "features/crm/analytics/sla-compliance-chart.tsx",
    reason: "False positive: the matched div centers the donut chart SVG in the data-present branch; 'No SLA policy' appears nearby via ChartEmptyState which already uses the chart primitive",
  },
  {
    file: "features/hr/expenses/components/import-expense-sheet.tsx",
    reason: "File-upload dropzone, not a data-empty state; detected because EmptyUploadIllustration contains the word 'empty' which matches the checker EMPTY_INDICATOR pattern",
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
  /(?:No\s+(?:results|data|items|records|entries|invoices|branches|members|projects|tickets|employees|leads|deals)|nothing\s+(?:here|yet)|empty|no-data)/i;

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

(function selfTest() {
  const fixture = [
    'export function FixtureEmpty() {',
    '  return (',
    '    <div className="flex flex-col items-center justify-center text-center">',
    '      <p className="text-sm font-medium">No items found</p>',
    '    </div>',
    '  );',
    '}',
  ].join("\n");
  if (findHandrolledBlocks(fixture).length === 0) {
    console.error("✖  Self-test FAILED: checker did not detect the hand-rolled block in the fixture.");
    process.exit(1);
  }
})();

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ((EXCLUDE_DIRS.has(entry.name) || isBuildDir(entry.name))) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

const violations = [];
const seenExceptionFiles = new Set();

for (const file of walkFiles(ROOT)) {
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

const staleExceptions = EXCEPTIONS.filter((e) => !seenExceptionFiles.has(e.file));
if (staleExceptions.length > 0) {
  console.error(
    "✖  Stale exception(s) — these files no longer exist; remove their entries from EXCEPTIONS:",
  );
  for (const e of staleExceptions) console.error(`  ${e.file} — ${e.reason}`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log("✔  No hand-rolled empty states found outside EmptyState.");
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} hand-rolled empty state block(s) found.\n` +
      `   Use <EmptyState> from components/ui/empty-state.tsx when touching these files:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
