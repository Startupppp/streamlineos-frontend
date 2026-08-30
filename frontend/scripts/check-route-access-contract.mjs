import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");

const SOURCE_DIRS = [
  join(FRONTEND_ROOT, "components", "layout", "sidebar"),
  join(FRONTEND_ROOT, "lib", "rbac", "route-access"),
];

const PERMISSION_SHAPE = /^[a-z][a-z0-9-]*(?::[a-z0-9-]+)+$/;
const LITERAL = /["'`]([a-z][a-z0-9-]*(?::[a-z0-9-]+)+)["'`]/g;

// A module-access rung is never a @RequirePermission key, so it is never stamped as
// x-permission. backend/CLAUDE.md §5: assertModuleAccessPolicy answers both rungs from
// resolveModuleManagementStanding, and those routes declare @AuthorizedInService instead.
// Treating them as ghosts produced 13 false positives on the first run of this check.
const GENERATED_ACCESS_RUNG = /^[a-z][a-z0-9-]*:access:[a-z-]+$/;

// Not permission keys at all: node: import specifiers and the registry's own sentinels.
const NON_PERMISSION_PREFIXES = ["node:", "route:"];

// Anti-vacuity floors. A walk that resolves nothing would otherwise report a clean tree,
// which is the failure mode these scans have had every time they were wrong.
const MIN_SOURCE_KEYS = 150;
const MIN_CONTRACT_KEYS = 500;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

function contractPermissions(doc) {
  const keys = new Set();
  for (const pathItem of Object.values(doc.paths ?? {}))
    for (const operation of Object.values(pathItem))
      if (operation && typeof operation === "object" && typeof operation["x-permission"] === "string")
        keys.add(operation["x-permission"]);
  return keys;
}

function isCheckable(key) {
  if (NON_PERMISSION_PREFIXES.some((p) => key.startsWith(p))) return false;
  if (GENERATED_ACCESS_RUNG.test(key)) return false;
  return PERMISSION_SHAPE.test(key);
}

function collectSourceKeys(files) {
  const found = new Map();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(LITERAL)) {
      const key = match[1];
      if (!found.has(key)) found.set(key, file.slice(FRONTEND_ROOT.length).split("\\").join("/"));
    }
  }
  return found;
}

function vacuityFailure(contractCount, sourceCount) {
  if (contractCount < MIN_CONTRACT_KEYS)
    return `only ${contractCount} x-permission keys in the contract (floor ${MIN_CONTRACT_KEYS})`;
  if (sourceCount < MIN_SOURCE_KEYS)
    return `only ${sourceCount} permission keys found in the navigation sources (floor ${MIN_SOURCE_KEYS})`;
  return null;
}

function runSelfTest() {
  const backend = new Set(["hr:employees:view", "build:tickets:view"]);
  const source = new Map([
    ["hr:employees:view", "a.ts"],
    ["build:tickets:view", "b.ts"],
    ["hr:employees:export", "c.ts"],
    ["build:access:view", "d.ts"],
    ["node:fs", "e.ts"],
    ["route:unresolved", "f.ts"],
  ]);

  const checkable = [...source].filter(([k]) => isCheckable(k));
  const ghosts = checkable.filter(([k]) => !backend.has(k));

  const cases = [
    {
      description: "a nav key with no backing endpoint is reported as a ghost",
      passes: ghosts.length === 1 && ghosts[0][0] === "hr:employees:export",
    },
    {
      description: "a generated <module>:access:* rung is excluded, not reported",
      passes: !checkable.some(([k]) => k === "build:access:view"),
    },
    {
      description: "node: import specifiers are excluded",
      passes: !checkable.some(([k]) => k.startsWith("node:")),
    },
    {
      description: "registry sentinels are excluded",
      passes: !checkable.some(([k]) => k.startsWith("route:")),
    },
    {
      description: "a key backed by an endpoint is not reported",
      passes: !ghosts.some(([k]) => k === "hr:employees:view"),
    },
    {
      description: "a broken source walk refuses to report a pass",
      passes: vacuityFailure(MIN_CONTRACT_KEYS, 0) !== null,
    },
    {
      description: "a truncated contract refuses to report a pass",
      passes: vacuityFailure(0, MIN_SOURCE_KEYS) !== null,
    },
    {
      description: "healthy counts pass the vacuity floors",
      passes: vacuityFailure(MIN_CONTRACT_KEYS, MIN_SOURCE_KEYS) === null,
    },
  ];

  const failures = cases.filter((c) => !c.passes);
  for (const c of cases) {
    if (c.passes) console.log(`✔  self-test passed: ${c.description}`);
    else console.error(`✖  self-test FAILED: ${c.description}`);
  }
  if (failures.length > 0) process.exit(1);
  console.log("\n✔  All self-test cases passed — check-route-access-contract bites.");
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

if (!existsSync(CONTRACT)) {
  console.error("✖  frontend/contracts/openapi.json is missing — vendor it first.");
  console.error("   pnpm --filter streamlineos-api openapi:generate");
  console.error("   cp backend/openapi.json frontend/contracts/openapi.json");
  process.exit(1);
}

const backendKeys = contractPermissions(JSON.parse(readFileSync(CONTRACT, "utf8")));
const files = SOURCE_DIRS.flatMap((dir) => walk(dir));
const sourceKeys = collectSourceKeys(files);
const checkable = [...sourceKeys].filter(([key]) => isCheckable(key));
const excluded = sourceKeys.size - checkable.length;

const vacuous = vacuityFailure(backendKeys.size, checkable.length);
if (vacuous !== null) {
  console.error(`✖  ${vacuous}.`);
  console.error(`   Scanned ${files.length} navigation source file(s).`);
  console.error("   A scan that resolves nothing must not report a clean tree — refusing to pass.");
  process.exit(1);
}

const ghosts = checkable.filter(([key]) => !backendKeys.has(key));

console.log(`Navigation source files   ${files.length}`);
console.log(`Permission keys checked   ${checkable.length} (${excluded} excluded as access rungs or non-permissions)`);
console.log(`x-permission in contract  ${backendKeys.size}`);
console.log("");

if (ghosts.length === 0) {
  console.log("✔  every route-access permission names an endpoint in the generated contract.");
  process.exit(0);
}

console.error(`✖  ${ghosts.length} route-access permission(s) name no endpoint in the generated contract:`);
for (const [key, file] of ghosts) console.error(`   ${key}  <-  ${file}`);
console.error("");
console.error("   A navigation gate on a key no endpoint enforces is false forever: the route is");
console.error("   hidden from everyone who is not an owner, and no backend guard ever runs.");
console.error("   Either add the key to the backend catalog and gate an endpoint with it, or");
console.error("   correct the navigation entry. If the contract is stale, run:");
console.error("     pnpm --filter streamlineos-api openapi:generate && pnpm check:contract-vendor");
process.exit(1);
