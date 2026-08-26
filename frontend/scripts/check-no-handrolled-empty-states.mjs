import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".tsx", ".jsx"]);
const CANONICAL_EMPTY_STATE = "components/ui/empty-state.tsx";

const EMPTY_INDICATOR = /(?:No\s+(?:results|data|items|records|entries|invoices|branches|members|projects|tickets|employees|leads|deals)|nothing\s+(?:here|yet)|empty|no-data)/i;

const HANDROLLED_STRUCTURE = /(?:flex[^"]*flex-col[^"]*items-center[^"]*justify-center[^"]*text-center|text-center[^"]*text-muted-foreground[^"]*text-sm)/;

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

const violations = [];

for (const file of walkFiles(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === CANONICAL_EMPTY_STATE) continue;

  const content = readFileSync(file, "utf8");

  if (content.includes("EmptyState")) continue;

  if (HANDROLLED_STRUCTURE.test(content) && EMPTY_INDICATOR.test(content)) {
    violations.push(`  ${rel}`);
  }
}

if (violations.length === 0) {
  console.log("✔  No obvious hand-rolled empty states found outside EmptyState.");
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} file(s) contain patterns that look like hand-rolled empty states.\n` +
    `   Use <EmptyState> from components/ui/empty-state.tsx when touching these files:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
