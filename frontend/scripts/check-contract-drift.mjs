import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildInterfaceFieldTypeMap,
  buildInterfaceMap,
  buildTypeAliasEnumMap,
  collectTypeContent,
  extractFrontendCalls,
} from "./contract-drift/frontend-calls.mjs";
import { checkResolutionFloor, checkSkippedComputedPaths, runChecks } from "./contract-drift/rules.mjs";
import { applyBaseline, driftKeyForEntry, printBaseline } from "./contract-drift/known-drift.mjs";
import { runSelfTest } from "./contract-drift/self-test.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = join(ROOT, "contracts", "openapi.json");
const FIXTURE_PATH = join(ROOT, "contracts", "__fixtures__", "timesheets-fixture.json");
const FEATURES_ROOT = join(ROOT, "features");
const HOOK_DIRS = [
  join(ROOT, "hooks", "api", "timesheets"),
  join(ROOT, "hooks", "api", "timesheets-core"),
];
/**
 * Every one of the 57 timesheets calls now resolves, so the floor is the state
 * itself rather than a number with slack under it. The old 0.40 sat 33 points
 * below the measurement it guarded: the count could halve and still report a
 * pass. A call that cannot be read is a call whose drift is invisible, which is
 * the one thing this gate exists to prevent — so it fails, and the message says
 * how to make the new call readable.
 */
const MIN_RESOLVED_FRACTION = 1.0;
/**
 * A scan that finds nothing must fail, not pass. `walkTs` swallows a missing
 * directory, so renaming or moving the timesheets hook folders would otherwise
 * yield zero calls, zero violations and a green tick. 57 calls are found today;
 * this floor is well under that so ordinary hook removal does not trip it, and
 * well over zero so a broken extractor cannot report success.
 */
const MIN_CALLS_SCANNED = 20;

if (process.argv.includes("--self-test")) {
  console.log("Running self-test...\n");
  runSelfTest();
}

const useFixture = process.argv.includes("--use-fixture");
const contractFile = useFixture ? FIXTURE_PATH : CONTRACT_PATH;

if (!existsSync(contractFile)) {
  if (useFixture) {
    console.error("✖  Fixture artifact is missing.");
    console.error(`   Expected: ${FIXTURE_PATH}`);
    process.exit(1);
  }
  console.error("✖  Contract artifact not yet vendored.");
  console.error(`   Expected: ${CONTRACT_PATH}`);
  console.error("");
  console.error("   To generate and vendor:");
  console.error("     pnpm --filter streamlineos-api openapi:generate");
  console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
  console.error("");
  console.error("   Until the artifact exists, this check cannot run and is a CI blocker.");
  process.exit(1);
}

const contract = JSON.parse(readFileSync(contractFile, "utf8"));

const allContent = collectTypeContent(HOOK_DIRS, FEATURES_ROOT);
const interfaceMap = buildInterfaceMap(allContent);
const typeAliasEnumMap = buildTypeAliasEnumMap(allContent);
const interfaceFieldTypeMap = buildInterfaceFieldTypeMap(allContent);

const { calls, skipped } = extractFrontendCalls(HOOK_DIRS, interfaceMap);
const resolved = calls.filter((c) => c.requestFields !== null);
const unresolved = calls.filter((c) => c.requestFields === null);

console.log(
  `Timesheets calls extracted: ${calls.length} (request shape resolved: ${resolved.length}, unresolved: ${unresolved.length}, skipped computed paths: ${skipped})`,
);

if (unresolved.length > 0 || process.argv.includes("--list")) {
  console.log(`\n  ${unresolved.length} call(s) whose request shape the scan cannot read — drift inside them is invisible:`);
  for (const c of unresolved) console.log(`    ${c.method} ${c.path}  (${c.file})`);
}

const { violations, narrowings } = runChecks(calls, contract, interfaceFieldTypeMap, typeAliasEnumMap);

printBaseline();

if (narrowings.length > 0) {
  console.log(
    `\n  ${narrowings.length} narrowing(s) — contract allows values the frontend type does not include (not a failure):`,
  );
  for (const n of narrowings) console.log(`    ${n}`);
}

const scanViolations = [
  checkResolutionFloor(calls, MIN_RESOLVED_FRACTION, MIN_CALLS_SCANNED),
  checkSkippedComputedPaths(skipped),
].filter((v) => v !== null);
const { newViolations, baselinedViolations, staleEntries } = applyBaseline(violations);
const allNewViolations = [...newViolations, ...scanViolations];

if (baselinedViolations.length > 0) {
  console.log(`\n  ${baselinedViolations.length} known drift(s) tracked in KNOWN_DRIFT baseline — not yet fixed, not failing CI:`);
  for (const v of baselinedViolations) console.log(`    ${v}`);
}

if (staleEntries.length > 0) {
  console.error(`\n✖  ${staleEntries.length} stale KNOWN_DRIFT entry(entries) — these no longer match any actual violation; delete them from KNOWN_DRIFT:`);
  for (const e of staleEntries) console.error(`    ${driftKeyForEntry(e)}`);
}

if (allNewViolations.length > 0) {
  console.error(`\n✖  ${allNewViolations.length} contract drift violation(s) not covered by KNOWN_DRIFT baseline:\n`);
  for (const v of allNewViolations) console.error(`  ${v}`);
}

if (allNewViolations.length === 0 && staleEntries.length === 0) {
  if (baselinedViolations.length > 0) {
    console.log(`\n⚠  ${baselinedViolations.length} known baselined drift(s) are tracked but not failing CI. Fix them when the product decision lands.`);
  }
  console.log("\n✔  No new timesheets contract drift detected.");
  process.exit(0);
} else {
  process.exit(1);
}
