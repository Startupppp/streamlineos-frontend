#!/usr/bin/env node
/**
 * Vendor-copy freshness gate for `contracts/db-enums.generated.ts`.
 *
 * Modelled on `check-contract-vendor.mjs` (openapi.json) and
 * `check-permission-catalog.mjs` (permission-catalog.json) — same artifact
 * class, same resolution, same exit-code contract.
 *
 * WHY. `check:contract-parity` compares the frontend contract against the
 * backend contract, so it cannot see an enum both sides got wrong, and it
 * cannot see a `z.string()` standing in for an enum at all, because `string` is
 * a superset of every member list. The generated module is the one place the
 * member list is true; a vendored copy that silently goes stale turns "the
 * schema added a member" into a green run and an `ApiContractError` on the
 * first row that carries it.
 *
 * Two rules. The first needs nothing but this repository:
 *
 *   1. Well-formed — the vendored module exists, declares `DB_ENUMS ... as
 *      const`, and holds at least MIN_ENUMS entries. A truncated or empty
 *      artifact cannot satisfy this, so an empty sweep cannot pass.
 *   2. Byte-identical to the backend's copy. Needs the backend beside this
 *      repo; otherwise reported NOT RUN and the run ends INCONCLUSIVE (exit 2),
 *      which does NOT mask rule 1.
 *
 * Exit codes follow every other cross-repository gate here: 0 pass, 1 real
 * violation, 2 inconclusive (a named prerequisite is absent).
 *
 * Flags:
 *   --self-test   Run assertions over synthetic inputs and exit.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACKEND_ROOT,
  backendAvailable,
  backendPath,
  backendUnreachableReason,
} from "./check-repo-paths.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const VENDORED = join(FRONTEND_ROOT, "contracts", "db-enums.generated.ts");

/**
 * The schema declared 466 pgEnums when this gate was written. The floor sits
 * well below that so ordinary schema work never trips it, and well above zero
 * so a truncated write cannot read as a pass.
 */
const MIN_ENUMS = 400;

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Line endings are normalised before hashing. Git may hand back CRLF on a
 * Windows checkout of one repository and LF on the other, and reporting that
 * as a stale vendor would make the gate permanently red on one platform while
 * saying nothing true about the enums.
 */
export function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

export function countEnums(source) {
  const body = source.match(/export const DB_ENUMS = \{([\s\S]*?)\n\} as const;/);
  if (body === null) return null;
  return [...body[1].matchAll(/^\s{2}[A-Za-z0-9_]+: \[/gm)].length;
}

export function checkWellFormed(source, minEnums = MIN_ENUMS) {
  const count = countEnums(source);
  if (count === null) {
    return { ok: false, count: 0, reason: "no `export const DB_ENUMS = { ... } as const;` block" };
  }
  if (count < minEnums) {
    return { ok: false, count, reason: `only ${count} enums, below the floor of ${minEnums}` };
  }
  return { ok: true, count };
}

export function compareSources(a, b) {
  const ha = sha256(normalise(a));
  const hb = sha256(normalise(b));
  return ha === hb ? { outcome: "match", hash: ha } : { outcome: "mismatch", hashA: ha, hashB: hb };
}

function runSelfTest() {
  const cases = [];
  const assert = (description, passes) => cases.push({ description, passes });

  const wellFormed = (entries) =>
    `export const DB_ENUMS = {\n${entries.map((n) => `  ${n}: ["A"],`).join("\n")}\n} as const;\n`;
  const four = wellFormed(["a", "b", "c", "d"]);

  {
    assert("a module with enough enums is well-formed", checkWellFormed(four, 4).ok);
    assert(
      "a module below the floor is a violation, so a truncated write cannot read as a pass",
      checkWellFormed(four, 5).ok === false,
    );
    assert(
      "a module with no DB_ENUMS block is a violation, not a zero count that quietly passes",
      checkWellFormed("export const OTHER = {};\n", 0).ok === false,
    );
    assert(
      "the enum count reads every entry, not just the first",
      countEnums(wellFormed(["a", "b", "c"])) === 3,
    );
    assert(
      "a nested array member is not miscounted as an enum entry",
      countEnums('export const DB_ENUMS = {\n  a: ["A", "B"],\n} as const;\n') === 1,
    );
    assert("two identical sources match", compareSources(four, four).outcome === "match");
    assert(
      "a source with one extra member is a mismatch — the exact defect class this gate exists for",
      compareSources(
        'export const DB_ENUMS = {\n  a: ["A"],\n} as const;\n',
        'export const DB_ENUMS = {\n  a: ["A", "B"],\n} as const;\n',
      ).outcome === "mismatch",
    );
    assert(
      "a CRLF copy of an LF original is NOT reported as a stale vendor",
      compareSources(four, four.replace(/\n/g, "\r\n")).outcome === "match",
    );
    assert(
      "the committed vendored module passes rule 1 on this checkout",
      existsSync(VENDORED) && checkWellFormed(readFileSync(VENDORED, "utf8")).ok,
    );

    const failures = cases.filter((c) => !c.passes);
    for (const c of cases) if (c.passes) console.log(`OK   self-test passed: ${c.description}`);
    for (const f of failures) console.error(`FAIL self-test FAILED: ${f.description}`);
    if (failures.length > 0) process.exit(1);
    console.log(`\nAll ${cases.length} self-test cases passed — check-db-enums-vendor is live.`);
  }
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

if (!existsSync(VENDORED)) {
  console.error("check:db-enums-vendor FAILED — frontend/contracts/db-enums.generated.ts is missing.");
  console.error("   Vendor it from the backend:");
  console.error("     pnpm -C backend generate:db-enums");
  console.error("     pnpm -C frontend generate:db-enums");
  process.exit(1);
}

const vendoredSource = readFileSync(VENDORED, "utf8");
const wellFormed = checkWellFormed(vendoredSource);
if (!wellFormed.ok) {
  console.error(`check:db-enums-vendor FAILED — the vendored module is malformed: ${wellFormed.reason}.`);
  console.error("   Re-vendor it:  pnpm -C backend generate:db-enums && pnpm -C frontend generate:db-enums");
  process.exit(1);
}
console.log(`rule 1 OK — vendored module is well-formed (${wellFormed.count} enums).`);

if (!backendAvailable) {
  console.error("INCONCLUSIVE — check:db-enums-vendor: rule 2 NOT RUN.");
  console.error(`   ${backendUnreachableReason()}`);
  console.error("   The vendored copy was NOT compared against the backend's copy, so a stale");
  console.error("   artifact would not have been detected. Set STREAMLINE_BACKEND_ROOT to the");
  console.error("   backend checkout, or accept rule 1 only in a frontend-only CI checkout.");
  process.exit(2);
}

const backendArtifact = backendPath("src", "db", "enums.generated.ts");
if (!existsSync(backendArtifact)) {
  console.error("INCONCLUSIVE — check:db-enums-vendor: rule 2 NOT RUN.");
  console.error(`   A backend checkout was found at ${BACKEND_ROOT}, but it has no generated`);
  console.error(`   enum module at ${backendArtifact}.`);
  console.error("   Generate it there first:  pnpm -C backend generate:db-enums");
  process.exit(2);
}

const result = compareSources(vendoredSource, readFileSync(backendArtifact, "utf8"));
if (result.outcome === "match") {
  console.log(`rule 2 OK — matches ${backendArtifact}`);
  console.log(`   sha256: ${result.hash.slice(0, 16)}...`);
  process.exit(0);
}

console.error("check:db-enums-vendor FAILED — frontend/contracts/db-enums.generated.ts is STALE.");
console.error(`   It does not match ${backendArtifact}.`);
console.error(`   frontend hash: ${result.hashA.slice(0, 16)}...`);
console.error(`   backend  hash: ${result.hashB.slice(0, 16)}...`);
console.error("");
console.error("   A pgEnum changed. Every frontend contract reading the vendored module still");
console.error("   describes the old column, so the first row carrying a new member throws.");
console.error("   Re-vendor:  pnpm -C backend generate:db-enums && pnpm -C frontend generate:db-enums");
process.exit(1);
