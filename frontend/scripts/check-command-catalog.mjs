#!/usr/bin/env node
/**
 * check-command-catalog — every mutation hook must be classified PERMISSIONED or SELF.
 *
 * Classification rules (applied in order, first match wins):
 *   1. PERMISSIONED — hook body contains `useAuthorizedMutation(` with an explicit key
 *   2. SELF-ENDPOINT — hook body contains an apiClient call to a SELF_ENDPOINT_PREFIX
 *   3. SELF-EXPLICIT — hook function name is in EXPLICIT_SELF_HOOKS
 *   4. UNCLASSIFIED  — none of the above matched (baseline tracks current count)
 *
 * The gate fails when:
 *   - unclassifiedCount > BASELINE.unclassified  (regression)
 *   - Any EXPLICIT_SELF_HOOKS entry is stale (hook no longer exists)
 *
 * --self-test: exercises the classifier against known fixtures without touching the real codebase.
 */

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

// ── Baseline ────────────────────────────────────────────────────────────────
// Run `node scripts/check-command-catalog.mjs` to see the current count.
// Lower this number after migrating hooks to useAuthorizedMutation or adding them
// to EXPLICIT_SELF_HOOKS. Never raise it — that is a regression.
const BASELINE = { unclassified: 895 };

// ── Auto-SELF endpoint prefixes ──────────────────────────────────────────────
// A mutation whose mutationFn body contains an apiClient call to any of these
// paths is automatically classified as SELF — the authenticated user is always
// the subject (no org-level side effects, no privilege required).
const SELF_ENDPOINT_PREFIXES = [
  '"/me/',       // all /me/* routes
  "`/me/",       // template literals
  '"/notifications/', // user manages their own notifications
  "`/notifications/",
  '"/auth/',     // auth flows (login, logout, refresh, MFA)
  "`/auth/",
];

// ── Explicit SELF hooks ───────────────────────────────────────────────────────
// Hook function names classified as SELF that do NOT call a SELF_ENDPOINT_PREFIX.
// Entries here bypass the endpoint check. Add when a SELF hook uses a non-/me/ path
// for architectural reasons (e.g. a shared path whose subject is always the caller).
// NEVER add a hook that gates on a permission — use useAuthorizedMutation instead.
const EXPLICIT_SELF_HOOKS = new Set([
  // Notification inbox — user manages their own notification state
  // (endpoint /notifications/* is already caught by SELF_ENDPOINT_PREFIXES)
]);

// ── Skip patterns ─────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", ".git"]);
const SCAN_DIRS = ["hooks/api", "features"];
const TEST_FILE_RE = /\.test\.|\.spec\.|__tests__/;

// ── Scan floor (sanity check) ─────────────────────────────────────────────────
const SCAN_FLOOR = { minHooks: 50 };

// ─────────────────────────────────────────────────────────────────────────────
// Core classifier
// ─────────────────────────────────────────────────────────────────────────────

function extractMutationBlocks(src, filePath) {
  const results = [];
  // Match export function use* ... up to the closing brace at function level.
  // Strategy: find each `export function use`, capture name, then find the block.
  const EXPORT_RE = /^[ \t]*export\s+(?:async\s+)?function\s+(use\w+)\s*\(/gm;
  let match;
  while ((match = EXPORT_RE.exec(src)) !== null) {
    const name = match[1];
    const start = match.index;
    // Find the opening { of this function
    const openBrace = src.indexOf("{", start + match[0].length);
    if (openBrace === -1) continue;
    // Walk forward counting braces to find the function body end
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const body = src.slice(openBrace, end + 1);
    const hasMutation = body.includes("useMutation(") || body.includes("useAuthorizedMutation(");
    if (!hasMutation) continue;
    results.push({ name, body, file: filePath });
  }
  return results;
}

function classifyBlock(block) {
  const { name, body } = block;

  // Rule 1: PERMISSIONED — uses useAuthorizedMutation
  if (body.includes("useAuthorizedMutation(")) {
    const keyMatch = body.match(/useAuthorizedMutation\(\s*["'`]([^"'`]+)["'`]/);
    const key = keyMatch ? keyMatch[1] : "unknown";
    return { kind: "PERMISSIONED", key };
  }

  // Rule 2: SELF via endpoint prefix
  for (const prefix of SELF_ENDPOINT_PREFIXES) {
    if (body.includes(prefix)) {
      return { kind: "SELF", reason: `endpoint matches self-prefix ${prefix.trim()}` };
    }
  }

  // Rule 3: SELF via explicit hook name
  if (EXPLICIT_SELF_HOOKS.has(name)) {
    return { kind: "SELF", reason: "listed in EXPLICIT_SELF_HOOKS" };
  }

  // Rule 4: UNCLASSIFIED
  return { kind: "UNCLASSIFIED" };
}

// ─────────────────────────────────────────────────────────────────────────────
// File walker
// ─────────────────────────────────────────────────────────────────────────────

function walkDir(dir, cb) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full, cb);
    else if (st.isFile() && (extname(entry) === ".ts" || extname(entry) === ".tsx")) cb(full);
  }
}

function collectBlocks(rootDir, scanDirs) {
  const blocks = [];
  for (const rel of scanDirs) {
    walkDir(join(rootDir, rel), (filePath) => {
      const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
      if (TEST_FILE_RE.test(relPath)) return;
      const src = readFileSync(filePath, "utf8");
      if (!src.includes("useMutation(") && !src.includes("useAuthorizedMutation(")) return;
      blocks.push(...extractMutationBlocks(src, relPath));
    });
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test
// ─────────────────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test for check-command-catalog...\n");

  const goodAuthorized = `
    export function useCreateFoo() {
      return useAuthorizedMutation("foo:create", { mutationFn: (d) => apiClient.post("/foo", d) });
    }
  `;
  const goodSelfMe = `
    export function useUpdateProfile() {
      return useMutation({ mutationFn: (d) => apiClient.patch("/me/profile", d) });
    }
  `;
  const goodSelfNotif = `
    export function useMarkRead() {
      return useMutation({ mutationFn: (id) => apiClient.patch(\`/notifications/\${id}/read\`) });
    }
  `;
  const badUnclassified = `
    export function usePatchInvoice() {
      return useMutation({ mutationFn: (d) => apiClient.patch("/accounting/invoices", d) });
    }
  `;
  const badMixedWithGood = `
    export function useDoSomethingBad() {
      return useMutation({ mutationFn: (d) => apiClient.delete("/hr/records/" + d.id) });
    }
    export function useDoSomethingGood() {
      return useAuthorizedMutation("hr:employees:delete", {
        mutationFn: (id) => apiClient.delete("/hr/employees/" + id)
      });
    }
  `;

  function classify(src, name) {
    const blocks = extractMutationBlocks(src, "test.ts");
    const block = blocks.find(b => b.name === name);
    if (!block) return null;
    return classifyBlock(block);
  }

  // (a) useAuthorizedMutation → PERMISSIONED
  const r1 = classify(goodAuthorized, "useCreateFoo");
  assert(r1?.kind === "PERMISSIONED", `(a) useAuthorizedMutation → expected PERMISSIONED, got ${r1?.kind}`);
  assert(r1?.key === "foo:create", `(a) key → expected foo:create, got ${r1?.key}`);
  console.log("  (a) useAuthorizedMutation hook                          → PERMISSIONED");

  // (b) /me/ endpoint → SELF
  const r2 = classify(goodSelfMe, "useUpdateProfile");
  assert(r2?.kind === "SELF", `(b) /me/ endpoint → expected SELF, got ${r2?.kind}`);
  console.log("  (b) useMutation with /me/ endpoint                      → SELF");

  // (c) /notifications/ endpoint → SELF
  const r3 = classify(goodSelfNotif, "useMarkRead");
  assert(r3?.kind === "SELF", `(c) /notifications/ endpoint → expected SELF, got ${r3?.kind}`);
  console.log("  (c) useMutation with /notifications/ endpoint           → SELF");

  // (d) raw useMutation with non-self endpoint → UNCLASSIFIED
  const r4 = classify(badUnclassified, "usePatchInvoice");
  assert(r4?.kind === "UNCLASSIFIED", `(d) unclassified → expected UNCLASSIFIED, got ${r4?.kind}`);
  console.log("  (d) useMutation with non-self endpoint                  → UNCLASSIFIED (detected)");

  // (e) UNCLASSIFIED hook in a mixed file is still caught
  const blocks5 = extractMutationBlocks(badMixedWithGood, "test.ts");
  const bad5 = blocks5.find(b => b.name === "useDoSomethingBad");
  const good5 = blocks5.find(b => b.name === "useDoSomethingGood");
  assert(classifyBlock(bad5).kind === "UNCLASSIFIED",
    `(e) mixed file bad hook → expected UNCLASSIFIED, got ${classifyBlock(bad5).kind}`);
  assert(classifyBlock(good5).kind === "PERMISSIONED",
    `(e) mixed file good hook → expected PERMISSIONED, got ${classifyBlock(good5).kind}`);
  console.log("  (e) mixed file — bad hook detected, good hook passed    → correct");

  // (f) Self-test proves a false negative would fail: extract with wrong name returns null
  const r6 = classify(goodAuthorized, "useNonExistent");
  assert(r6 === null, `(f) unknown hook name should return null`);
  console.log("  (f) unknown hook name returns null (scan is not vacuous) → correct");

  console.log("\n✔ All command-catalog fixtures passed — check-command-catalog is live.\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scan
// ─────────────────────────────────────────────────────────────────────────────

function runMainScan() {
  console.log("Building mutation hook graph (scanning hooks/api + features)...\n");

  const blocks = collectBlocks(ROOT, SCAN_DIRS);

  if (blocks.length < SCAN_FLOOR.minHooks) {
    console.error(
      `FAIL: scan floor not met — found only ${blocks.length} mutation hooks ` +
      `(expected ≥${SCAN_FLOOR.minHooks}). The scanner is broken or the wrong directory was scanned.`
    );
    process.exit(1);
  }

  const classified = { PERMISSIONED: [], SELF: [], UNCLASSIFIED: [] };
  const staleExplicit = new Set(EXPLICIT_SELF_HOOKS);

  for (const block of blocks) {
    const result = classifyBlock(block);
    if (result.kind === "SELF" && result.reason === "listed in EXPLICIT_SELF_HOOKS") {
      staleExplicit.delete(block.name);
    }
    classified[result.kind].push({ ...block, classification: result });
  }

  const permissionedCount = classified.PERMISSIONED.length;
  const selfCount = classified.SELF.length;
  const unclassifiedCount = classified.UNCLASSIFIED.length;
  const total = blocks.length;

  console.log(`=== Mutation Hook Classification ===`);
  console.log(`Total hooks scanned:  ${total}`);
  console.log(`PERMISSIONED:         ${permissionedCount}`);
  console.log(`SELF:                 ${selfCount}`);
  console.log(`UNCLASSIFIED:         ${unclassifiedCount}`);
  console.log();

  if (unclassifiedCount > 0 && unclassifiedCount <= BASELINE.unclassified) {
    console.log(`=== Unclassified (pending migration to useAuthorizedMutation) ===`);
    const byFile = new Map();
    for (const b of classified.UNCLASSIFIED) {
      const list = byFile.get(b.file) ?? [];
      list.push(b.name);
      byFile.set(b.file, list);
    }
    let shown = 0;
    for (const [file, names] of byFile) {
      if (shown >= 30) { console.log(`  ... and ${byFile.size - shown} more files`); break; }
      console.log(`  ${file}: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` (+${names.length - 5})` : ""}`);
      shown++;
    }
    console.log();
  } else if (unclassifiedCount > 0) {
    console.log(`=== Newly Unclassified (REGRESSION — these need classification) ===`);
    for (const b of classified.UNCLASSIFIED) {
      console.log(`  ${b.file}: ${b.name}`);
    }
    console.log();
  }

  console.log(`=== Baseline: unclassified=${BASELINE.unclassified} ===`);
  console.log(`=== Current:  unclassified=${unclassifiedCount} ===`);

  if (staleExplicit.size > 0) {
    console.error(
      `\nFAIL: ${staleExplicit.size} stale EXPLICIT_SELF_HOOKS entr${staleExplicit.size === 1 ? "y" : "ies"} ` +
      `(hook no longer exists — remove from EXPLICIT_SELF_HOOKS):`
    );
    for (const name of staleExplicit) console.error(`  ${name}`);
    process.exit(1);
  }

  if (unclassifiedCount > BASELINE.unclassified) {
    console.error(
      `\nFAIL: ${unclassifiedCount - BASELINE.unclassified} new unclassified mutation hook(s). ` +
      `Either migrate them to useAuthorizedMutation or add them to EXPLICIT_SELF_HOOKS.`
    );
    process.exit(1);
  }

  console.log("\nPASS: no new unclassified mutation hooks.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  runMainScan();
}
