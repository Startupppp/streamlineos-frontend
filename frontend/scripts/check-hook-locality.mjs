import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIR = "lib/api";
const EXTENSIONS = new Set([".ts", ".tsx"]);

const QUERY_HOOK_NAMES = [
  "useQuery",
  "useQueries",
  "useMutation",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useSuspenseInfiniteQuery",
  "useQueryClient",
];

const EXPORTED_HOOK =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function)\s+(use[A-Z][\w$]*)/;

export function importsQueryHookValue(source) {
  const importRe = /import\s+([^;]*?)\s+from\s+"@tanstack\/react-query"/g;
  let match;
  while ((match = importRe.exec(source)) !== null) {
    const clause = match[1].trim();
    if (clause.startsWith("type ")) continue;
    const specifiers = clause
      .replace(/^[^{]*\{/, "")
      .replace(/\}[^}]*$/, "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("type "));
    if (specifiers.some((s) => QUERY_HOOK_NAMES.includes(s.split(/\s+as\s+/)[0])))
      return true;
  }
  return false;
}

export function exportedHookNames(source) {
  const names = [];
  for (const line of source.split("\n")) {
    const match = EXPORTED_HOOK.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

export function classifyModule(source) {
  const hooks = exportedHookNames(source);
  if (hooks.length > 0) return { violation: true, reason: `exports ${hooks.join(", ")}` };
  if (importsQueryHookValue(source))
    return { violation: true, reason: "imports a React Query hook as a value" };
  return { violation: false, reason: null };
}

function* walkFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

function selfTest() {
  console.log("Running self-test...\n");
  const failures = [];
  let checksRun = 0;

  checksRun++;
  if (!classifyModule("export function useOrgSetupSessionQuery() { return 1; }").violation)
    failures.push("(a) failed to detect an exported `use*` function");

  checksRun++;
  if (!classifyModule("export const useThing = () => 1;").violation)
    failures.push("(b) failed to detect an exported `use*` const");

  checksRun++;
  const valueImport = 'import { useQuery } from "@tanstack/react-query";\nconst x = 1;';
  if (!classifyModule(valueImport).violation)
    failures.push("(c) failed to detect a value import of useQuery");

  checksRun++;
  const typeOnly =
    'import type { InfiniteData } from "@tanstack/react-query";\nexport function selectFlatPages(r) { return r; }';
  if (classifyModule(typeOnly).violation)
    failures.push("(d) false positive on a statement-level `import type`");

  checksRun++;
  const inlineType =
    'import { type UseQueryOptions } from "@tanstack/react-query";\nexport function buildUrl() { return ""; }';
  if (classifyModule(inlineType).violation)
    failures.push("(e) false positive on an inline `{ type X }` specifier");

  checksRun++;
  if (classifyModule("export function userDisplayName() { return 1; }").violation)
    failures.push("(f) false positive on an export merely starting with `user`");

  checksRun++;
  if (classifyModule("export const CURSOR_LIMIT = 50;").violation)
    failures.push("(g) false positive on a plain constant export");

  checksRun++;
  let scanned = 0;
  for (const _file of walkFiles(join(ROOT, SCAN_DIR))) scanned += 1;
  if (scanned < 1)
    failures.push(`(h) the walk found ${scanned} files under ${SCAN_DIR} — it is not scanning`);

  checksRun++;
  const renamedValue = 'import { useQuery as useRQ } from "@tanstack/react-query";';
  if (!classifyModule(renamedValue).violation)
    failures.push("(i) failed to detect a renamed value import of useQuery");

  if (failures.length > 0) {
    console.error("✖  Self-test FAILED:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log(`PASS: self-test (${checksRun} assertions)\n`);
  console.log("  (a) detects an exported `use*` function");
  console.log("  (b) detects an exported `use*` const");
  console.log("  (c) detects a value import of useQuery");
  console.log("  (d) no false positive on a statement-level `import type`");
  console.log("  (e) no false positive on an inline `{ type X }` specifier");
  console.log("  (f) no false positive on an export merely starting with `user`");
  console.log("  (g) no false positive on a plain constant export");
  console.log(`  (h) the walk reaches ${SCAN_DIR} (${scanned} files scanned)`);
  console.log("  (i) detects a renamed value import of useQuery");
  process.exit(0);
}

if (process.argv.includes("--self-test")) selfTest();

const violations = [];
let scannedFiles = 0;

for (const file of walkFiles(join(ROOT, SCAN_DIR))) {
  scannedFiles += 1;
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel.includes(".test.") || rel.includes(".spec.")) continue;
  const verdict = classifyModule(readFileSync(file, "utf8"));
  if (verdict.violation) violations.push(`  ${rel}  — ${verdict.reason}`);
}

if (scannedFiles < 1) {
  console.error(
    `✖  No files scanned under ${SCAN_DIR} — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

if (violations.length === 0) {
  console.log(
    `✔  No React Query hook modules under ${SCAN_DIR}/ (${scannedFiles} files scanned). FE-29 holds.`,
  );
  process.exit(0);
}

console.error(
  `✖  ${violations.length} React Query hook module(s) under ${SCAN_DIR}/.\n` +
    `   FE-29 puts an API hook at hooks/api/<module>/<entity>.ts. Move the module and its\n` +
    `   sibling *-schema.ts, then rewrite every importer — including the dynamic import\n` +
    `   strings inside lazyContract(), which a plain identifier search will not show you:`,
);
for (const v of violations) console.error(v);
process.exit(1);
