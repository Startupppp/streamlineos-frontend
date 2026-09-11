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

const SANCTIONED_QUERY_CLIENT = new Set([
  "components/providers/query-provider.tsx",
  "lib/prefetch/server-query-client.ts",
  "features/portal/components/portal-providers.tsx",
]);

const SANCTIONED_HASH_FN = new Set([
  "lib/query-scope.ts",
  "components/providers/query-provider.tsx",
  "lib/prefetch/server-query-client.ts",
]);

function normRel(relPath) {
  return relPath.replace(/\\/g, "/");
}

function isTestFile(relPath) {
  const p = normRel(relPath);
  return (
    p.endsWith(".test.ts") ||
    p.endsWith(".test.tsx") ||
    p.startsWith("test-utils/") ||
    p.includes("/__tests__/")
  );
}

const EMPTY_DEHYDRATE_RE = /dehydrate\s*\(\s*new\s+QueryClient\s*\(\s*\)\s*\)/g;

function checkNewQueryClient(content, relPath) {
  if (isTestFile(relPath)) return null;
  if (!content.includes("new QueryClient(")) return null;
  if (SANCTIONED_QUERY_CLIENT.has(normRel(relPath))) return null;
  const stripped = content.replace(EMPTY_DEHYDRATE_RE, "");
  if (!stripped.includes("new QueryClient(")) return null;
  return `${relPath}  (new QueryClient() outside sanctioned factories)`;
}

function checkQueryKeyHashFn(content, relPath) {
  if (isTestFile(relPath)) return null;
  if (!content.includes("queryKeyHashFn")) return null;
  if (SANCTIONED_HASH_FN.has(normRel(relPath))) return null;
  return `${relPath}  (queryKeyHashFn set outside sanctioned files)`;
}

function checkPrefetchDehydrate(content, relPath) {
  const norm = normRel(relPath);
  if (!norm.startsWith("lib/prefetch/")) return null;
  if (isTestFile(relPath)) return null;
  if (!content.includes("dehydrate(")) return null;
  if (content.includes("createServerQueryClient")) return null;
  return `${relPath}  (dehydrate() called without createServerQueryClient)`;
}

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

function runSelfTest() {
  const fixtures = [
    {
      description: "rule 1 — new QueryClient() outside sanctioned factories",
      relPath: "lib/some-util.ts",
      content: [
        'import { QueryClient } from "@tanstack/react-query";',
        "export const rogue = new QueryClient();",
      ].join("\n"),
      detect: checkNewQueryClient,
    },
    {
      description: "rule 2 — queryKeyHashFn outside sanctioned files",
      relPath: "lib/some-hook.ts",
      content: [
        'import { QueryClient } from "@tanstack/react-query";',
        "const c = new QueryClient({ defaultOptions: { queries: { queryKeyHashFn: () => '' } } });",
      ].join("\n"),
      detect: checkQueryKeyHashFn,
    },
    {
      description: "rule 3 — dehydrate() in lib/prefetch/ without createServerQueryClient",
      relPath: "lib/prefetch/broken.ts",
      content: [
        'import { dehydrate, QueryClient } from "@tanstack/react-query";',
        "export async function prefetchFoo() {",
        "  return dehydrate(new QueryClient());",
        "}",
      ].join("\n"),
      detect: checkPrefetchDehydrate,
    },
    {
      description:
        "rule 1 — a lookalike app path is NOT exempt (test-utils must be a directory, not a substring)",
      relPath: "lib/test-utils-helper.ts",
      content: [
        'import { QueryClient } from "@tanstack/react-query";',
        "export const rogue = new QueryClient();",
      ].join("\n"),
      detect: checkNewQueryClient,
    },
  ];

  const exemptFixtures = [
    {
      description: "test harness under test-utils/ may construct a QueryClient",
      relPath: "test-utils/render.tsx",
      content: [
        'import { QueryClient } from "@tanstack/react-query";',
        "export const client = new QueryClient();",
      ].join("\n"),
      detect: checkNewQueryClient,
    },
    {
      description: "a __tests__ directory may construct a QueryClient",
      relPath: "features/foo/__tests__/foo.helper.tsx",
      content: [
        'import { QueryClient } from "@tanstack/react-query";',
        "export const client = new QueryClient();",
      ].join("\n"),
      detect: checkNewQueryClient,
    },
  ];

  const selfFailures = [];

  for (const { description, relPath, content, detect } of fixtures) {
    const result = detect(content, relPath);
    if (result === null) {
      selfFailures.push(`self-test MISSED: ${description}`);
    } else {
      console.log(`✔ self-test detected ${description}`);
    }
  }

  for (const { description, relPath, content, detect } of exemptFixtures) {
    const result = detect(content, relPath);
    if (result !== null) {
      selfFailures.push(`self-test WRONGLY FLAGGED: ${description}`);
    } else {
      console.log(`✔ self-test exempted ${description}`);
    }
  }

  if (selfFailures.length > 0) {
    for (const f of selfFailures) console.error(`✖  ${f}`);
    process.exit(1);
  }

  console.log("\n✔ All 3 rules self-tested successfully — check-query-scope is live.");
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
}

const violations1 = [];
const violations2 = [];
const violations3 = [];

for (const file of walkFiles(ROOT)) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  const v1 = checkNewQueryClient(content, rel);
  if (v1) violations1.push(`  ${v1}`);

  const v2 = checkQueryKeyHashFn(content, rel);
  if (v2) violations2.push(`  ${v2}`);

  const v3 = checkPrefetchDehydrate(content, rel);
  if (v3) violations3.push(`  ${v3}`);
}

const allViolations = [...violations1, ...violations2, ...violations3];

if (allViolations.length === 0) {
  console.log("✔  No query-scope violations found.");
  process.exit(0);
} else {
  if (violations1.length > 0) {
    console.error(`✖  ${violations1.length} unsanctioned QueryClient construction(s):`);
    for (const v of violations1) console.error(v);
  }
  if (violations2.length > 0) {
    console.error(`✖  ${violations2.length} unsanctioned queryKeyHashFn assignment(s):`);
    for (const v of violations2) console.error(v);
  }
  if (violations3.length > 0) {
    console.error(`✖  ${violations3.length} prefetch file(s) calling dehydrate() without createServerQueryClient:`);
    for (const v of violations3) console.error(v);
  }
  process.exit(1);
}
