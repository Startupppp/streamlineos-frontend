#!/usr/bin/env node
/**
 * measure-route-bundles — produce the numbers `check-route-bundle-budget` reads.
 *
 * `contracts/route-bundle-manifest.json` carried measured bytes with nothing in
 * the repository that produced them, so they could not be reproduced or refreshed
 * after a change. This implements the method the manifest documents:
 *
 *   gzip level 9, summed over all unique chunks referenced in each route's
 *   page_client-reference-manifest.js from a production build.
 *
 * `measuredPageChunkBytes` is the route-specific additive: chunks that route
 * references and the /dashboard baseline does not.
 *
 *   pnpm build && node scripts/measure-route-bundles.mjs          # report only
 *   node scripts/measure-route-bundles.mjs --write                # update the manifest
 *   node scripts/measure-route-bundles.mjs --self-test
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = join(ROOT, ".next");
const MANIFEST_PATH = join(ROOT, "contracts", "route-bundle-manifest.json");
const BASELINE_ROUTE = "/dashboard";

/** Every chunk path referenced by a route's client-reference manifest. */
export function chunksFromManifestSource(source) {
  // Skip the `globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};` preamble —
  // its `{}` would otherwise parse cleanly and measure every route as zero.
  const assignment = /__RSC_MANIFEST\s*\[[^\]]*\]\s*=\s*/.exec(source);
  if (!assignment) return null;
  const start = source.indexOf("{", assignment.index + assignment[0].length - 1);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  let parsed;
  try {
    parsed = JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
  const chunks = new Set();
  for (const group of ["clientModules", "ssrModuleMapping", "edgeSSRModuleMapping"]) {
    const entries = parsed[group];
    if (!entries || typeof entries !== "object") continue;
    for (const entry of Object.values(entries)) {
      if (!entry || typeof entry !== "object") continue;
      if (Array.isArray(entry.chunks))
        for (const c of entry.chunks) if (typeof c === "string") chunks.add(c);
    }
  }
  return chunks;
}

/** Resolve `/_next/static/chunks/x.js` to a path under `.next/`. */
function chunkFile(chunk) {
  const trimmed = chunk.replace(/^\/_next\//, "").replace(/^_next\//, "");
  return join(NEXT_DIR, trimmed);
}

function gzipBytes(file) {
  if (!existsSync(file)) return 0;
  return gzipSync(readFileSync(file), { level: 9 }).length;
}

/** Locate the built manifest for a route, whatever route group it sits in. */
function findRouteManifest(route) {
  const appDir = join(NEXT_DIR, "server", "app");
  if (!existsSync(appDir)) return null;
  const wanted = route.replace(/^\//, "").split("/").filter(Boolean);
  let found = null;
  (function walk(dir, segments) {
    if (found) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      // A parenthesised route group contributes no URL segment.
      const next = /^\(.*\)$/.test(entry) ? segments : [...segments, entry];
      if (
        next.length === wanted.length &&
        next.every((s, i) => s === wanted[i]) &&
        existsSync(join(full, "page_client-reference-manifest.js"))
      ) {
        found = join(full, "page_client-reference-manifest.js");
        return;
      }
      if (next.length <= wanted.length && next.every((s, i) => s === wanted[i])) walk(full, next);
    }
  })(appDir, []);
  return found;
}

function measureRoute(route) {
  const manifestFile = findRouteManifest(route);
  if (!manifestFile) return { route, error: "no page_client-reference-manifest.js in .next" };
  const chunks = chunksFromManifestSource(readFileSync(manifestFile, "utf8"));
  if (!chunks) return { route, error: "manifest could not be parsed" };
  let bytes = 0;
  let missing = 0;
  for (const chunk of chunks) {
    const size = gzipBytes(chunkFile(chunk));
    if (size === 0) missing++;
    bytes += size;
  }
  return { route, chunks, chunkCount: chunks.size, missing, firstLoadJsBytes: bytes };
}

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test for measure-route-bundles...\n");

  const source =
    'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\n' +
    'globalThis.__RSC_MANIFEST["/(authenticated)/inbox/page"] = ' +
    JSON.stringify({
      moduleLoading: { prefix: "", crossOrigin: "none" },
      clientModules: {
        "a.js": { id: 1, name: "*", chunks: ["/_next/static/chunks/shared.js"], async: false },
        "b.js": { id: 2, name: "*", chunks: ["/_next/static/chunks/shared.js", "/_next/static/chunks/page.js"] },
      },
    }) +
    ";\n";

  const chunks = chunksFromManifestSource(source);
  assert(chunks !== null, "(a) a real manifest shape must parse");
  assert(chunks.size === 2, `(a) expected 2 unique chunks, got ${chunks.size}`);
  console.log("  (a) chunks are collected and de-duplicated → 2");

  assert(
    chunksFromManifestSource("globalThis.__RSC_MANIFEST = {not json;") === null,
    "(b) an unparseable manifest must return null, not an empty set",
  );
  console.log("  (b) an unparseable manifest returns null rather than measuring 0");

  const braceInString = chunksFromManifestSource(
    'globalThis.__RSC_MANIFEST["/x"] = ' +
      JSON.stringify({ clientModules: { "a}b{c.js": { chunks: ["/_next/static/chunks/x.js"] } } }) +
      ";",
  );
  assert(braceInString !== null && braceInString.size === 1, "(c) a brace inside a module name must not end the object");
  console.log("  (c) a brace inside a string does not truncate the manifest");

  const empty = chunksFromManifestSource(
    'globalThis.__RSC_MANIFEST["/x"] = ' + JSON.stringify({ clientModules: {} }) + ";",
  );
  assert(empty !== null && empty.size === 0, "(d) an empty manifest is 0 chunks, not an error");
  console.log("  (d) an empty client-module map measures 0 chunks");

  console.log("\n✔ 4 measurement fixtures passed — measure-route-bundles is live.\n");
}

function runMeasure() {
  if (!existsSync(NEXT_DIR)) {
    console.error("FAIL: .next/ not found — run `pnpm build` first. Measured bytes must come from a production build.");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const routes = Object.keys(manifest.budgets ?? {});
  const baseline = measureRoute(BASELINE_ROUTE);
  if (baseline.error) {
    console.error(`FAIL: baseline route ${BASELINE_ROUTE} could not be measured — ${baseline.error}`);
    process.exit(1);
  }

  console.log(`Baseline ${BASELINE_ROUTE}: ${baseline.chunkCount} chunks, ${baseline.firstLoadJsBytes} bytes gzip(9)\n`);

  const results = [];
  for (const route of routes) {
    const measured = measureRoute(route);
    if (measured.error) {
      console.log(`  ${route.padEnd(18)} SKIPPED — ${measured.error}`);
      results.push({ route, skipped: true });
      continue;
    }
    let pageOnly = 0;
    for (const chunk of measured.chunks)
      if (!baseline.chunks.has(chunk)) pageOnly += gzipBytes(chunkFile(chunk));

    const prev = manifest.budgets[route] ?? {};
    const before = prev.measuredFirstLoadJsBytes;
    const delta = typeof before === "number" ? measured.firstLoadJsBytes - before : null;
    const ceiling = prev.maxFirstLoadJsBytes ?? manifest.defaults?.maxFirstLoadJsBytes;
    const verdict = measured.firstLoadJsBytes > ceiling ? `OVER by ${measured.firstLoadJsBytes - ceiling}` : "within";
    console.log(
      `  ${route.padEnd(18)} ${String(measured.firstLoadJsBytes).padStart(7)} bytes  ` +
        `(page-only ${String(pageOnly).padStart(6)}, ${measured.chunkCount} chunks)  ` +
        `${delta === null ? "no prior" : `${delta >= 0 ? "+" : ""}${delta} vs recorded`}  — ${verdict}`,
    );
    if (measured.missing > 0)
      console.log(`      note: ${measured.missing} referenced chunk(s) were not found on disk and counted as 0`);
    results.push({ route, firstLoadJsBytes: measured.firstLoadJsBytes, pageOnly });
  }

  if (!process.argv.includes("--write")) {
    console.log("\nReport only. Pass --write to record these into contracts/route-bundle-manifest.json.");
    return;
  }

  for (const r of results) {
    if (r.skipped) continue;
    manifest.budgets[r.route].measuredFirstLoadJsBytes = r.firstLoadJsBytes;
    manifest.budgets[r.route].measuredPageChunkBytes = r.pageOnly;
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("\nWrote measured bytes into contracts/route-bundle-manifest.json.");
}

if (process.argv.includes("--self-test")) runSelfTest();
else runMeasure();
