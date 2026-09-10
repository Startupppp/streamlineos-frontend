import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);

/*
  A build directory is any name starting with `.next`, not the one called
  exactly `.next`. A dev server run with a custom `distDir` (`.next-local`)
  left its Turbopack output here and this walk read all of it: two gates went
  red over compiled chunks and the rest merely scanned 718MB for nothing.
*/
function isBuildDir(name) {
  return name.startsWith(".next");
}
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const IMPORTS_API_CLIENT = /from ['"]@\/lib\/api-client['"]/;
const USECALLBACK_DECL = /(?:const|let)\s+(\w+)\s*=\s*useCallback\s*\(/g;
const DIRECT_ASYNC_EFFECT = /useEffect\s*\(\s*async\s*\(\s*\)\s*=>/;
const VOID_IN_EFFECT = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*void\s+(\w+)\s*\(/g;

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ((EXCLUDE_DIRS.has(entry.name) || isBuildDir(entry.name))) continue;
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
  const content = readFileSync(file, "utf8");
  if (!content.includes("useEffect") || !IMPORTS_API_CLIENT.test(content)) continue;

  const rel = relative(ROOT, file);

  if (DIRECT_ASYNC_EFFECT.test(content) && content.includes("apiClient.")) {
    violations.push(`  ${rel}  (async useEffect with apiClient)`);
    continue;
  }

  const apiCallbacks = new Set();
  USECALLBACK_DECL.lastIndex = 0;
  let cbMatch;
  while ((cbMatch = USECALLBACK_DECL.exec(content)) !== null) {
    const name = cbMatch[1];
    const window = content.slice(cbMatch.index, cbMatch.index + 3000);
    if (window.includes("apiClient.")) apiCallbacks.add(name);
  }

  if (apiCallbacks.size === 0) continue;

  VOID_IN_EFFECT.lastIndex = 0;
  let voidMatch;
  while ((voidMatch = VOID_IN_EFFECT.exec(content)) !== null) {
    const calledFn = voidMatch[1];
    if (apiCallbacks.has(calledFn)) {
      const lineNum = content.slice(0, voidMatch.index).split("\n").length;
      violations.push(`  ${rel}:${lineNum}  ${voidMatch[0].trim()}`);
    }
  }
}

if (violations.length === 0) {
  console.log("✔  No useEffect-driven API fetches found.");
  process.exit(0);
} else {
  console.error(`✖  ${violations.length} useEffect-driven API fetch(es) — use useQuery or useMutation instead:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
