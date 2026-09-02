import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const IMPORTS_API_CLIENT = /from ['"]@\/lib\/api-client['"]/;
const USECALLBACK_DECL = /(?:const|let)\s+(\w+)\s*=\s*useCallback\s*\(/g;
const DIRECT_ASYNC_EFFECT = /useEffect\s*\(\s*async\s*\(\s*\)\s*=>/;
const VOID_IN_EFFECT = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*void\s+(\w+)\s*\(/g;

function findEffectFetchViolations(content, sourceLabel) {
  const violations = [];
  if (!content.includes("useEffect") || !IMPORTS_API_CLIENT.test(content)) return violations;

  if (DIRECT_ASYNC_EFFECT.test(content) && content.includes("apiClient.")) {
    violations.push(`${sourceLabel}  (async useEffect with apiClient)`);
    return violations;
  }

  const apiCallbacks = new Set();
  USECALLBACK_DECL.lastIndex = 0;
  let cbMatch;
  while ((cbMatch = USECALLBACK_DECL.exec(content)) !== null) {
    const name = cbMatch[1];
    const window = content.slice(cbMatch.index, cbMatch.index + 3000);
    if (window.includes("apiClient.")) apiCallbacks.add(name);
  }

  if (apiCallbacks.size === 0) return violations;

  VOID_IN_EFFECT.lastIndex = 0;
  let voidMatch;
  while ((voidMatch = VOID_IN_EFFECT.exec(content)) !== null) {
    const calledFn = voidMatch[1];
    if (apiCallbacks.has(calledFn)) {
      const lineNum = content.slice(0, voidMatch.index).split("\n").length;
      violations.push(`${sourceLabel}:${lineNum}  ${voidMatch[0].trim()}`);
    }
  }
  return violations;
}

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

const selfTest = process.argv.includes("--self-test");

if (selfTest) {
  let passed = 0;
  let failed = 0;

  const asyncEffectFixture = [
    "import { apiClient } from '@/lib/api-client';",
    "import { useEffect } from 'react';",
    "function Comp() {",
    "  useEffect(async () => {",
    "    const data = await apiClient.get('/users');",
    "  }, []);",
    "}",
  ].join("\n");
  if (findEffectFetchViolations(asyncEffectFixture, "fixture").length === 0) {
    process.stderr.write("  FAIL  async useEffect with apiClient was not detected\n");
    failed++;
  } else {
    process.stdout.write("  PASS  async useEffect with apiClient correctly detected\n");
    passed++;
  }

  const cleanFixture = [
    "import { useQuery } from '@tanstack/react-query';",
    "function Comp() {",
    "  const { data } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/users').then(r => r.json()) });",
    "}",
  ].join("\n");
  if (findEffectFetchViolations(cleanFixture, "fixture").length > 0) {
    process.stderr.write("  FAIL  clean useQuery component incorrectly flagged\n");
    failed++;
  } else {
    process.stdout.write("  PASS  clean useQuery component correctly not flagged\n");
    passed++;
  }

  const noApiClientImportFixture = [
    "import { useEffect } from 'react';",
    "function Comp() {",
    "  useEffect(async () => {",
    "    const data = await fetch('/users');",
    "  }, []);",
    "}",
  ].join("\n");
  if (findEffectFetchViolations(noApiClientImportFixture, "fixture").length > 0) {
    process.stderr.write("  FAIL  effect without apiClient import was incorrectly flagged\n");
    failed++;
  } else {
    process.stdout.write("  PASS  effect without apiClient import correctly not flagged\n");
    passed++;
  }

  if (failed > 0) {
    process.stderr.write(`\n  SELF-TEST FAILED — ${failed} of ${passed + failed} assertions did not bite\n`);
    process.exit(1);
  }
  process.stdout.write(`\n  SELF-TEST PASSED — all ${passed} assertions bite correctly\n`);
  process.exit(0);
}

const violations = [];
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  scannedFiles++;
  const content = readFileSync(file, "utf8");
  const rel = `  ${relative(ROOT, file)}`;
  const found = findEffectFetchViolations(content, rel);
  for (const v of found) violations.push(v);
}

if (scannedFiles < 500) {
  console.error(`✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log("✔  No useEffect-driven API fetches found.");
  process.exit(0);
} else {
  console.error(`✖  ${violations.length} useEffect-driven API fetch(es) — use useQuery or useMutation instead:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
