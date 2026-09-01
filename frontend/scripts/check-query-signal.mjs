/**
 * check-query-signal.mjs
 *
 * Gate: every queryFn that calls apiClient.get or apiClient.post must
 * destructure { signal } from its QueryFunctionContext and forward it.
 *
 * Exceptions (explicitly allowlisted with a reason) are the only way to
 * mark a queryFn as intentionally non-cancellable.
 *
 * Usage:
 *   node scripts/check-query-signal.mjs           # scan all files
 *   node scripts/check-query-signal.mjs --self-test
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Legitimate exceptions: queryFns that call apiClient methods which do not
 * accept an AbortSignal. Add entries here when truly non-cancellable, with
 * an explicit reason. Every entry must be re-verified when the underlying
 * apiClient method gains a signal parameter.
 */
const ALLOWLIST = new Map([
  // No current exceptions — apiClient.get and apiClient.post both accept signal.
  // Entries have the form:
  //   ["hooks/api/path/to/file.ts", "reason: why signal cannot be forwarded"],
]);

/**
 * Scan window size (chars after `queryFn:`) used to detect the queryFn body.
 * 150 chars is enough for the typical single-line or two-line arrow form
 * without bleeding into the next property at the same indentation level.
 */
const WINDOW = 150;

function normRel(p) {
  return p.replace(/\\/g, "/");
}

function isTestFile(relPath) {
  const p = normRel(relPath);
  return (
    p.endsWith(".test.ts") ||
    p.endsWith(".test.tsx") ||
    p.endsWith(".spec.ts") ||
    p.endsWith(".spec.tsx") ||
    p.startsWith("test-utils/") ||
    p.includes("/__tests__/")
  );
}

/**
 * True if content has a queryFn that calls apiClient.get or apiClient.post
 * and does NOT destructure `signal` from the QueryFunctionContext.
 *
 * Returns an array of violations (one per offending queryFn occurrence).
 */
function findSignalViolations(content, relPath) {
  if (isTestFile(relPath)) return [];
  const norm = normRel(relPath);
  if (ALLOWLIST.has(norm)) return [];

  const violations = [];
  const qfRe = /queryFn\s*:/g;
  let m;

  while ((m = qfRe.exec(content)) !== null) {
    const window = content.slice(m.index, m.index + WINDOW);

    // Does this queryFn window call a cancellable apiClient method?
    const callsGet = /\bapiClient\.get\b/.test(window);
    const callsPost = /\bapiClient\.post\b/.test(window);
    if (!callsGet && !callsPost) continue;

    // Find the arrow `=>` that delimits the function params from its body.
    // Everything before `=>` is the parameter list.
    const arrowIdx = window.indexOf("=>");
    if (arrowIdx === -1) continue;
    const paramArea = window.slice(0, arrowIdx);

    // Is `signal` present in the parameter destructuring?
    if (/\bsignal\b/.test(paramArea)) continue;

    const lineNo = content.slice(0, m.index).split("\n").length;
    violations.push(`  ${norm}:${lineNo}`);
  }

  return violations;
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------
function runSelfTest() {
  const fixtures = [
    {
      description: "queryFn with () => and apiClient.get — no signal (BAD)",
      relPath: "hooks/api/bad-hook.ts",
      content: [
        'import { useQuery } from "@tanstack/react-query";',
        'import { apiClient } from "@/lib/api-client";',
        "export function useBadHook() {",
        "  return useQuery({",
        '    queryKey: ["things"],',
        "    queryFn: () =>",
        '      apiClient.get<string[]>("/things"),',
        "    staleTime: 30_000,",
        "  });",
        "}",
      ].join("\n"),
      expectViolation: true,
    },
    {
      description: "queryFn with async () => and apiClient.get — no signal (BAD)",
      relPath: "hooks/api/bad-async-hook.ts",
      content: [
        'import { useQuery } from "@tanstack/react-query";',
        'import { apiClient } from "@/lib/api-client";',
        "export function useBadAsyncHook() {",
        "  return useQuery({",
        '    queryKey: ["things"],',
        "    queryFn: async () =>",
        '      apiClient.get<string[]>("/things"),',
        "    staleTime: 30_000,",
        "  });",
        "}",
      ].join("\n"),
      expectViolation: true,
    },
    {
      description: "queryFn with apiClient.post and no signal (BAD)",
      relPath: "hooks/api/bad-post-hook.ts",
      content: [
        'import { useQuery } from "@tanstack/react-query";',
        'import { apiClient } from "@/lib/api-client";',
        "export function useBadPostHook() {",
        "  return useQuery({",
        '    queryKey: ["things"],',
        '    queryFn: () => apiClient.post<string[]>("/things/search", {}),',
        "    staleTime: 30_000,",
        "  });",
        "}",
      ].join("\n"),
      expectViolation: true,
    },
    {
      description: "queryFn with ({ signal }) => and apiClient.get — correct (GOOD)",
      relPath: "hooks/api/good-hook.ts",
      content: [
        'import { useQuery } from "@tanstack/react-query";',
        'import { apiClient } from "@/lib/api-client";',
        "export function useGoodHook() {",
        "  return useQuery({",
        '    queryKey: ["things"],',
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<string[]>("/things", undefined, signal),',
        "    staleTime: 30_000,",
        "  });",
        "}",
      ].join("\n"),
      expectViolation: false,
    },
    {
      description: "queryFn with ({ pageParam, signal }) => — correct (GOOD)",
      relPath: "hooks/api/good-infinite-hook.ts",
      content: [
        'import { useInfiniteQuery } from "@tanstack/react-query";',
        'import { apiClient } from "@/lib/api-client";',
        "export function useGoodInfiniteHook() {",
        "  return useInfiniteQuery({",
        '    queryKey: ["things"],',
        "    queryFn: ({ pageParam, signal }) =>",
        '      apiClient.get<string[]>("/things", { cursor: pageParam }, signal),',
        "    getNextPageParam: (last) => last[last.length - 1]?.id,",
        "    initialPageParam: undefined,",
        "    staleTime: 30_000,",
        "  });",
        "}",
      ].join("\n"),
      expectViolation: false,
    },
    {
      description: "test file — exempt regardless of content (GOOD)",
      relPath: "hooks/api/my-hook.test.ts",
      content: [
        '    queryFn: () => apiClient.get<string[]>("/things"),',
      ].join("\n"),
      expectViolation: false,
    },
  ];

  const failures = [];

  for (const { description, relPath, content, expectViolation } of fixtures) {
    const violations = findSignalViolations(content, relPath);
    const gotViolation = violations.length > 0;
    if (gotViolation !== expectViolation) {
      failures.push(
        `self-test WRONG for "${description}": expected ${expectViolation ? "VIOLATION" : "PASS"}, got ${gotViolation ? "VIOLATION" : "PASS"}`,
      );
    } else if (expectViolation) {
      console.log(`✔ self-test detected: ${description}`);
    } else {
      console.log(`✔ self-test exempted: ${description}`);
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  ${f}`);
    process.exit(1);
  }

  console.log("\n✔ All signal-gate fixtures passed — check-query-signal is live.");
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------
const allViolations = [];

for (const file of walkFiles(ROOT)) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const vs = findSignalViolations(content, rel);
  for (const v of vs) allViolations.push(v);
}

if (allViolations.length === 0) {
  console.log("✔  No query-signal violations found.");
  process.exit(0);
} else {
  console.error(
    `✖  ${allViolations.length} queryFn(s) call apiClient without forwarding signal:`,
  );
  for (const v of allViolations) console.error(v);
  console.error(
    "\nFix: destructure { signal } from QueryFunctionContext and pass it as the last arg to apiClient.get/post.",
  );
  process.exit(1);
}
