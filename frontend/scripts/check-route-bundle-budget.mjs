#!/usr/bin/env node
/**
 * check-route-bundle-budget.mjs — enforces contracts/route-bundle-manifest.json.
 *
 * The sibling gate backend/src/scripts/check-route-budgets.mjs enforces the API
 * route budgets (DB calls, latency, response bytes). It reads a different file
 * and never sees this manifest, so measured bundle bytes were recorded here
 * without anything comparing them to their ceiling.
 *
 * SELF-TEST (--self-test) feeds a known-bad fixture and requires a non-zero
 * finding, including the case where a measured value is absent entirely.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const ALLOW_PENDING = argv.includes("--allow-pending");

const FRONTEND_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const MANIFEST_PATH = join(FRONTEND_ROOT, "contracts", "route-bundle-manifest.json");

const MEASURED_PAIRS = [
  ["measuredFirstLoadJsBytes", "maxFirstLoadJsBytes"],
  ["measuredPageChunkBytes", "maxPageChunkBytes"],
  ["measuredCssBytes", "maxCssBytes"],
  ["measuredImageBytes", "maxImageBytes"],
  ["measuredFontBytes", "maxFontBytes"],
  ["measuredThirdPartyBytes", "maxThirdPartyBytes"],
  ["measuredServerPayloadBytes", "maxServerPayloadBytes"],
];

const REQUIRED_MEASURE = "measuredFirstLoadJsBytes";

export function findExceededBundles(manifest) {
  const violations = [];
  const defaults = manifest.defaults ?? {};

  for (const [route, entry] of Object.entries(manifest.budgets ?? {})) {
    for (const [measuredField, maxField] of MEASURED_PAIRS) {
      const measured = entry[measuredField];
      if (measured === null || measured === undefined) continue;
      const max = entry[maxField] ?? defaults[maxField];
      if (typeof measured !== "number" || typeof max !== "number") continue;
      if (measured > max)
        violations.push({
          route,
          measuredField,
          measured,
          max,
          over: measured - max,
        });
    }
  }
  return violations;
}

export function findPendingBundles(manifest) {
  return Object.entries(manifest.budgets ?? {})
    .filter(([, entry]) => entry[REQUIRED_MEASURE] === null || entry[REQUIRED_MEASURE] === undefined)
    .map(([route]) => route);
}

function selfTest() {
  let failed = false;
  const pass = (label) => process.stdout.write(`  [pass] ${label}\n`);
  const fail = (label, detail) => {
    process.stderr.write(`  [FAIL] ${label}: ${detail}\n`);
    failed = true;
  };

  const breaching = {
    defaults: { maxFirstLoadJsBytes: 524288 },
    budgets: {
      "/over": { maxFirstLoadJsBytes: 524288, measuredFirstLoadJsBytes: 559642 },
      "/under": { maxFirstLoadJsBytes: 614400, measuredFirstLoadJsBytes: 591215 },
      "/inherits-default": { measuredFirstLoadJsBytes: 600000 },
    },
  };

  const exceeded = findExceededBundles(breaching);
  if (exceeded.length !== 2)
    fail("breach-detected", `expected 2 breaches (/over, /inherits-default), got ${exceeded.length}`);
  else pass("breach-detected — measured > ceiling fires, including via defaults inheritance");

  const clean = findExceededBundles({
    defaults: {},
    budgets: { "/under": { maxFirstLoadJsBytes: 614400, measuredFirstLoadJsBytes: 591215 } },
  });
  if (clean.length !== 0) fail("within-budget-passes", `expected 0, got ${clean.length}`);
  else pass("within-budget-passes — measured ≤ ceiling produces no violation");

  const nonJs = findExceededBundles({
    defaults: { maxFontBytes: 100, maxServerPayloadBytes: 100 },
    budgets: {
      "/fonts-over": { measuredFontBytes: 101 },
      "/payload-over": { measuredServerPayloadBytes: 101 },
      "/both-under": { measuredFontBytes: 100, measuredServerPayloadBytes: 100 },
    },
  });
  if (nonJs.length !== 2)
    fail("font-and-payload-detected", `expected 2 breaches (font, server payload), got ${nonJs.length}`);
  else pass("font-and-payload-detected — font bytes and server payload bytes are governed, not just JS");

  const pending = findPendingBundles({
    budgets: {
      "/measured": { measuredFirstLoadJsBytes: 1 },
      "/pending": { measuredFirstLoadJsBytes: null },
      "/absent": {},
    },
  });
  if (pending.length !== 2)
    fail("pending-detected", `expected 2 pending (/pending, /absent), got ${JSON.stringify(pending)}`);
  else pass("pending-detected — null and absent measurements both count as unmeasured");

  if (failed) {
    process.stderr.write("\nSELF-TEST FAILED\n");
    process.exit(1);
  }
  process.stdout.write("\nSELF-TEST PASSED\n");
  process.exit(0);
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    process.stderr.write(`check-route-bundle-budget: manifest not found at ${MANIFEST_PATH}\n`);
    process.exit(2);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err) {
    process.stderr.write(`check-route-bundle-budget: manifest is not valid JSON: ${err.message}\n`);
    process.exit(2);
  }

  const exceeded = findExceededBundles(manifest);
  const pending = findPendingBundles(manifest);
  const routeCount = Object.keys(manifest.budgets ?? {}).length;

  process.stdout.write(
    `check-route-bundle-budget: ${String(routeCount)} route(s), ` +
      `${String(routeCount - pending.length)} measured, ${String(pending.length)} pending\n`,
  );

  for (const route of pending) process.stdout.write(`  PENDING  ${route} — no measured first-load bytes\n`);

  for (const { route, measuredField, measured, max, over } of exceeded)
    process.stderr.write(
      `  BREACH   ${route} — ${measuredField}=${String(measured)} exceeds ${String(max)} by ${String(over)} bytes\n`,
    );

  if (exceeded.length > 0) {
    process.stderr.write(
      `\ncheck-route-bundle-budget: FAIL — ${String(exceeded.length)} route bundle budget breach(es)\n`,
    );
    process.exit(1);
  }

  if (pending.length > 0 && !ALLOW_PENDING) {
    process.stderr.write(
      `\ncheck-route-bundle-budget: FAIL — ${String(pending.length)} route(s) declare a budget but were never measured.\n` +
        `  Run the production build measurement, or pass --allow-pending to accept an incomplete run.\n`,
    );
    process.exit(1);
  }

  process.stdout.write("  OK — every measured route bundle is within its declared ceiling\n");
  process.exit(0);
}

if (SELF_TEST) selfTest();
else main();
