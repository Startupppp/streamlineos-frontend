/**
 * fix-query-signal.mjs
 *
 * Automated sweep: adds { signal } to queryFn contexts that call
 * apiClient.get / apiClient.post without forwarding the abort signal.
 *
 * Usage:
 *   node scripts/fix-query-signal.mjs            # fix all violations
 *   node scripts/fix-query-signal.mjs --dry-run  # report only
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".ts", ".tsx"]);
const DRY = process.argv.includes("--dry-run");

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

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
 * Find the index of the closing `)` that matches the opening `(` at `openIdx`
 * in the string `str`. Handles nested parens and angle brackets for generics.
 * Returns -1 if not found.
 */
function findMatchingParen(str, openIdx) {
  let depth = 0;
  let angleBrackets = 0;
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === "<") { angleBrackets++; continue; }
    if (ch === ">" && angleBrackets > 0) { angleBrackets--; continue; }
    if (angleBrackets > 0) continue;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Given an `apiClient.get(...)` or `apiClient.post(...)` call starting at
 * `callIdx`, insert `, signal` (for get) or `, { signal }` (for post) as
 * the additional last argument.
 *
 * Returns the transformed string (full content with the insertion applied)
 * or the original string if the call couldn't be parsed.
 */
function addSignalToCall(content, callIdx, method) {
  const openIdx = content.indexOf("(", callIdx);
  if (openIdx === -1) return content;

  const closeIdx = findMatchingParen(content, openIdx);
  if (closeIdx === -1) return content;

  const inside = content.slice(openIdx + 1, closeIdx);

  // Already has signal? Skip.
  if (/\bsignal\b/.test(inside)) return content;

  // Determine argument count by parsing at depth-0 commas (rough heuristic).
  let depth = 0;
  let angleBrackets = 0;
  let commas = 0;
  for (const ch of inside) {
    if (ch === "<") { angleBrackets++; continue; }
    if (ch === ">" && angleBrackets > 0) { angleBrackets--; continue; }
    if (angleBrackets > 0) continue;
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) commas++;
  }

  let insertion;
  if (method === "get") {
    if (commas === 0) {
      // 1 arg (url only) → add undefined + signal
      insertion = ", undefined, signal";
    } else {
      // 2+ args → just add signal
      insertion = ", signal";
    }
  } else {
    // apiClient.post — signal goes in the config object
    if (commas === 0) {
      // url only (unusual) — don't touch
      return content;
    }
    // Has at least url + data → add { signal } config
    insertion = ", { signal }";
  }

  // Handle trailing comma before closing paren
  const trimmedInside = inside.trimEnd();
  if (trimmedInside.endsWith(",")) {
    // Insert before the trailing whitespace
    const trailingSpaceStart = openIdx + 1 + trimmedInside.length;
    return content.slice(0, trailingSpaceStart) + " signal," + content.slice(trailingSpaceStart);
  }

  return content.slice(0, closeIdx) + insertion + content.slice(closeIdx);
}

/**
 * Transform a single file's content. Returns the updated content, or the
 * original if no changes were needed.
 */
function transformContent(content) {
  let result = content;
  let changed = false;

  const qfRe = /queryFn\s*:/g;
  let m;
  // Collect all queryFn positions first (indices into `result` will shift after edits).
  // Process from the END of the file backwards to preserve earlier indices.
  const positions = [];
  while ((m = qfRe.exec(content)) !== null) {
    const window = content.slice(m.index, m.index + 150);
    const callsGet = /\bapiClient\.get\b/.test(window);
    const callsPost = /\bapiClient\.post\b/.test(window);
    if (!callsGet && !callsPost) continue;

    const arrowIdx = window.indexOf("=>");
    if (arrowIdx === -1) continue;
    const paramArea = window.slice(0, arrowIdx);
    if (/\bsignal\b/.test(paramArea)) continue;

    positions.push({ idx: m.index, callsGet, callsPost });
  }

  // Process from end to start so indices remain valid
  for (let i = positions.length - 1; i >= 0; i--) {
    const { idx, callsGet } = positions[i];
    const before = result.slice(0, idx);
    const from = result.slice(idx);

    // --- Step 1: fix the queryFn params ---
    let fixed = from;

    // Pattern: queryFn: ({ pageParam }: { pageParam: T }) =>
    // or queryFn: ({ pageParam }: { pageParam: T | undefined }) =>
    // → queryFn: ({ pageParam, signal }) =>
    fixed = fixed.replace(
      /^(queryFn\s*:\s*)(\(\s*\{\s*pageParam(?:\s*:\s*\w+(?:\s*\|\s*\w+)?)?\s*\}(?:\s*:\s*\{[^}]+\})?)\s*=>/,
      "$1({ pageParam, signal }) =>",
    );

    // Pattern: queryFn: ({ pageParam }) => (with optional alias: { pageParam: cursor })
    fixed = fixed.replace(
      /^(queryFn\s*:\s*)\(\s*\{\s*pageParam(?:\s*:\s*\w+)?\s*\}\s*\)\s*=>/,
      "$1({ pageParam, signal }) =>",
    );

    // Pattern: queryFn: async ({ pageParam }): Promise<T> =>
    fixed = fixed.replace(
      /^(queryFn\s*:\s*async\s+)\(\s*\{\s*pageParam(?:\s*:\s*\w+(?:\s*\|\s*\w+)?)?\s*\}(?:\s*:\s*\{[^}]+\})?(?:\s*\):\s*\S+)?\s*\)\s*=>/,
      "$1({ pageParam, signal }) =>",
    );

    // Pattern: queryFn: async () => { or async () =>
    fixed = fixed.replace(
      /^(queryFn\s*:\s*async\s+)\(\s*\)\s*=>/,
      "$1({ signal }) =>",
    );

    // Pattern: queryFn: () => { or () =>
    fixed = fixed.replace(
      /^(queryFn\s*:\s*)\(\s*\)\s*=>/,
      "$1({ signal }) =>",
    );

    if (fixed === from) continue; // didn't match any pattern — skip

    // --- Step 2: add signal to the apiClient call ---
    const method = callsGet ? "get" : "post";
    const callPattern = callsGet
      ? /\bapiClient\.get(?:<[^>]*>)?\s*\(/
      : /\bapiClient\.post(?:<[^>]*>)?\s*\(/;

    // Find the call within the next 400 chars of the fixed block
    const searchWindow = fixed.slice(0, 400);
    const callMatch = callPattern.exec(searchWindow);
    if (callMatch) {
      const callStart = callMatch.index;
      // addSignalToCall needs the global position relative to the beginning of 'fixed'
      const before2 = before + fixed.slice(0, callStart);
      const remaining = fixed.slice(callStart);
      const transformed = addSignalToCall(remaining, 0, method);
      fixed = fixed.slice(0, callStart) + transformed;
    }

    result = before + fixed;
    changed = true;
  }

  return changed ? result : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let filesScanned = 0;
let filesFixed = 0;
let violationsFixed = 0;

for (const file of walkFiles(ROOT)) {
  const rel = normRel(relative(ROOT, file));
  if (isTestFile(rel)) continue;

  const content = readFileSync(file, "utf8");
  const transformed = transformContent(content);
  if (transformed === null) continue;

  filesScanned++;
  const countBefore = (content.match(/queryFn\s*:/g) ?? []).length;
  const countAfter = (transformed.match(/queryFn\s*:/g) ?? []).length;
  const delta = countBefore; // rough count

  if (!DRY) {
    writeFileSync(file, transformed, "utf8");
    filesFixed++;
    violationsFixed += delta;
    console.log(`  fixed ${rel}`);
  } else {
    console.log(`  would fix ${rel}`);
  }
}

console.log(`\n${DRY ? "[dry-run] " : ""}Files with signal fixes: ${filesScanned}`);
console.log(`Run 'node scripts/check-query-signal.mjs' to verify.`);
