import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
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

// ── Rule 4: inline queryKey array literals ────────────────────────────────────
// `queryKey: ["module", "entity"]` by-passes the factory and loses the tenant hash.
// Legitimate patterns:
//   queryKey: queryKeys.foo.bar(params)   ← factory call
//   queryKey: queryKeys.foo.all           ← factory constant
//   queryKey: [...queryKeys.foo.bar(), "variant"] as const  ← factory + variant suffix
//
// Bad patterns (detected):
//   queryKey: ["module", "entity"]        ← pure string array
//   queryKey: [orgId, "employees"]        ← variable-first array (no factory)
//
// ALLOWLIST: files that intentionally define query-key shapes (factories, tests, scope lib).
const INLINE_KEY_ALLOWLIST = new Set([
  "lib/query-keys.ts",         // the factory definitions themselves
  "lib/query-scope.ts",        // scope isolation testing
  "lib/query-scope-isolation.test.tsx",
]);
// Matches `queryKey:` followed (after optional whitespace/newline) by `[` whose
// first non-whitespace element is NOT `...queryKeys` (spread of a factory).
const INLINE_KEY_RE = /\bqueryKey\s*:\s*\[(?!\s*\.\.\.queryKeys)/g;

function checkInlineQueryKey(content, relPath) {
  if (isTestFile(relPath)) return null;
  if (INLINE_KEY_ALLOWLIST.has(normRel(relPath))) return null;
  if (!INLINE_KEY_RE.test(content)) {
    INLINE_KEY_RE.lastIndex = 0;
    return null;
  }
  INLINE_KEY_RE.lastIndex = 0;
  return `${relPath}  (inline queryKey array — use queryKeys factory instead)`;
}

// A local key factory may live beside its feature, but it must compose the shared
// prefix rather than repeat the literal — otherwise a change to `queryKeyBase`
// applies to half the cache and silently splits every affected key space.
const HARDCODED_BASE_RE = /\[\s*"streamlineos"\s*[,\]]/;
const BASE_LITERAL_ALLOWLIST = new Set(["lib/query-scope.ts"]);

function checkHardcodedKeyBase(content, relPath) {
  const norm = normRel(relPath);
  if (isTestFile(relPath)) return null;
  if (norm.startsWith("lib/query-keys/") || norm === "lib/query-keys.ts") return null;
  if (BASE_LITERAL_ALLOWLIST.has(norm)) return null;
  if (!HARDCODED_BASE_RE.test(content)) return null;
  return `${relPath}  (hardcoded "streamlineos" key prefix — spread queryKeyBase instead)`;
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
    if (EXCLUDE_DIRS.has(entry.name)) continue;
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

  fixtures.push(
    {
      description: "rule 5 — a local key factory hardcoding the \"streamlineos\" prefix",
      relPath: "hooks/api/hr/cases.ts",
      content: 'const caseKeys = { all: ["streamlineos", "hr", "cases"] as const };',
      detect: checkHardcodedKeyBase,
    },
    {
      description: "rule 5 — the prefix alone, with no trailing segment",
      relPath: "hooks/api/hr/other.ts",
      content: 'const root = ["streamlineos"] as const;',
      detect: checkHardcodedKeyBase,
    },
  );

  const exemptFixtures = [
    {
      description: "rule 5 — a factory that spreads queryKeyBase is not flagged",
      relPath: "hooks/api/hr/cases.ts",
      content: 'const caseKeys = { all: [...queryKeyBase, "hr", "cases"] as const };',
      detect: checkHardcodedKeyBase,
    },
    {
      description: "rule 5 — the registry itself may hold the literal",
      relPath: "lib/query-keys/base.ts",
      content: 'export const queryKeyBase = ["streamlineos"] as const;',
      detect: checkHardcodedKeyBase,
    },
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

  // Rule 4 fixtures
  const inlineKeyBad = {
    description: "rule 4 — inline queryKey array without factory",
    relPath: "hooks/api/widgets.ts",
    content: 'const q = useQuery({ queryKey: ["module", "entity"], queryFn: () => fetch() });',
    detect: checkInlineQueryKey,
  };
  const inlineKeyGoodFactory = {
    description: "rule 4 — queryKey from factory (should NOT be flagged)",
    relPath: "hooks/api/widgets.ts",
    content: 'const q = useQuery({ queryKey: queryKeys.widgets.list(params), queryFn: () => fetch() });',
    detect: checkInlineQueryKey,
  };
  const inlineKeyGoodSpread = {
    description: "rule 4 — queryKey spreading factory key (should NOT be flagged)",
    relPath: "hooks/api/widgets.ts",
    content: 'const q = useQuery({ queryKey: [...queryKeys.widgets.list(), "page"], queryFn: () => fetch() });',
    detect: checkInlineQueryKey,
  };
  const inlineKeyGoodTestFile = {
    description: "rule 4 — inline queryKey in a test file (should NOT be flagged)",
    relPath: "hooks/api/widgets.test.ts",
    content: 'const q = useQuery({ queryKey: ["test", "key"], queryFn: () => fetch() });',
    detect: checkInlineQueryKey,
  };

  const r4bad = inlineKeyBad.detect(inlineKeyBad.content, inlineKeyBad.relPath);
  if (r4bad === null) {
    selfFailures.push(`self-test MISSED: ${inlineKeyBad.description}`);
  } else {
    console.log(`✔ self-test detected ${inlineKeyBad.description}`);
  }
  for (const f of [inlineKeyGoodFactory, inlineKeyGoodSpread, inlineKeyGoodTestFile]) {
    const result = f.detect(f.content, f.relPath);
    if (result !== null) {
      selfFailures.push(`self-test WRONGLY FLAGGED: ${f.description}`);
    } else {
      console.log(`✔ self-test exempted ${f.description}`);
    }
  }

  console.log("\n✔ All 5 rules self-tested successfully — check-query-scope is live.");
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
}

const violations1 = [];
const violations2 = [];
const violations3 = [];
const violations4 = [];
const violations5 = [];

for (const file of walkFiles(ROOT)) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  const v1 = checkNewQueryClient(content, rel);
  if (v1) violations1.push(`  ${v1}`);

  const v2 = checkQueryKeyHashFn(content, rel);
  if (v2) violations2.push(`  ${v2}`);

  const v3 = checkPrefetchDehydrate(content, rel);
  if (v3) violations3.push(`  ${v3}`);

  const v4 = checkInlineQueryKey(content, rel);
  if (v4) violations4.push(`  ${v4}`);

  const v5 = checkHardcodedKeyBase(content, rel);
  if (v5) violations5.push(`  ${v5}`);
}

const allViolations = [...violations1, ...violations2, ...violations3, ...violations4, ...violations5];

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
  if (violations5.length > 0) {
    console.error(`✖  ${violations5.length} hardcoded "streamlineos" key prefix(es) — spread queryKeyBase:`);
    for (const v of violations5) console.error(v);
  }
  if (violations4.length > 0) {
    console.error(`✖  ${violations4.length} inline queryKey array(s) — use queryKeys factory:`);
    for (const v of violations4) console.error(v);
  }
  process.exit(1);
}
