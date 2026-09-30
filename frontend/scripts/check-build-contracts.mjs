#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OPENAPI_PATH = join(FRONTEND_ROOT, "contracts", "openapi.json");
const GENERATED_PATH = join(FRONTEND_ROOT, "contracts", "build-contracts.generated.ts");

const MIN_SCHEMAS = 10;

function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

function sha256hex(content) {
  return createHash("sha256").update(normalise(content)).digest("hex");
}

export function extractOpenapiHash(source) {
  const match = source.match(/OPENAPI_HASH = "sha256:([0-9a-f]{64})" as const/);
  return match ? match[1] : null;
}

export function countGeneratedSchemas(source) {
  return [...source.matchAll(/^export const gen\w+Schema = /gm)].length;
}

export function checkWellFormed(source, minSchemas = MIN_SCHEMAS) {
  const hash = extractOpenapiHash(source);
  if (hash === null) return { ok: false, reason: "no OPENAPI_HASH constant found" };
  const count = countGeneratedSchemas(source);
  if (count < minSchemas) return { ok: false, reason: `only ${count} schemas, below the floor of ${minSchemas}` };
  return { ok: true, hash, count };
}

function runSelfTest() {
  const cases = [];
  const assert = (description, passes) => cases.push({ description, passes });

  const validHash = "a".repeat(64);
  const makeSource = (n = MIN_SCHEMAS) =>
    `export const OPENAPI_HASH = "sha256:${validHash}" as const;\n` +
    Array.from({ length: n }, (_, i) => `export const genFoo${i}Schema = z.unknown();\n`).join("");

  assert(
    "extracts a valid 64-character sha256 hex hash from the OPENAPI_HASH export",
    extractOpenapiHash(`export const OPENAPI_HASH = "sha256:${validHash}" as const;`) === validHash,
  );
  assert("returns null when no OPENAPI_HASH constant is present", extractOpenapiHash("no hash here") === null);
  assert(
    "rejects a hash shorter than 64 hex characters so a truncated write cannot pass",
    extractOpenapiHash(`export const OPENAPI_HASH = "sha256:abc" as const;`) === null,
  );
  assert("counts the correct number of generated schema exports", countGeneratedSchemas(makeSource(3)) === 3);
  assert("counts zero schemas in an empty file so a blank file cannot pass", countGeneratedSchemas("") === 0);
  assert(
    "a file with the minimum number of schemas and a valid hash is well-formed",
    checkWellFormed(makeSource(MIN_SCHEMAS)).ok,
  );
  assert(
    "a file below the schema floor is malformed so a truncated generate cannot pass",
    checkWellFormed(makeSource(MIN_SCHEMAS - 1)).ok === false,
  );
  assert(
    "a file with no OPENAPI_HASH is malformed even if it has enough schemas",
    checkWellFormed(
      Array.from({ length: MIN_SCHEMAS + 1 }, (_, i) => `export const genFoo${i}Schema = z.unknown();\n`).join(""),
    ).ok === false,
  );
  assert(
    "the committed generated file passes rule 1 on this checkout",
    existsSync(GENERATED_PATH) && checkWellFormed(readFileSync(GENERATED_PATH, "utf8")).ok,
  );

  const failures = cases.filter((c) => !c.passes);
  for (const c of cases) if (c.passes) console.log(`OK   self-test passed: ${c.description}`);
  for (const f of failures) console.error(`FAIL self-test FAILED: ${f.description}`);
  if (failures.length > 0) process.exit(1);
  console.log(`\nAll ${cases.length} self-test cases passed — check-build-contracts is live.`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

if (!existsSync(GENERATED_PATH)) {
  console.error("check:build-contracts FAILED — contracts/build-contracts.generated.ts is missing.");
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}

const generatedSource = readFileSync(GENERATED_PATH, "utf8");
const wellFormed = checkWellFormed(generatedSource);
if (!wellFormed.ok) {
  console.error(`check:build-contracts FAILED — generated file is malformed: ${wellFormed.reason}`);
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}
console.log(`rule 1 OK — ${wellFormed.count} generated schemas, OPENAPI_HASH present.`);

if (!existsSync(OPENAPI_PATH)) {
  console.error("INCONCLUSIVE — check:build-contracts: contracts/openapi.json not found.");
  console.error("  Vendor it: cp backend/openapi.json frontend/contracts/openapi.json");
  process.exit(2);
}

const currentHash = sha256hex(readFileSync(OPENAPI_PATH, "utf8"));
if (currentHash === wellFormed.hash) {
  console.log(`rule 2 OK — OPENAPI_HASH matches contracts/openapi.json (${currentHash.slice(0, 12)}...)`);
  process.exit(0);
}

console.error("check:build-contracts FAILED — contracts/build-contracts.generated.ts is STALE.");
console.error(`  The vendored openapi.json changed since the last generate:build-contracts run.`);
console.error(`  embedded hash: ${wellFormed.hash.slice(0, 16)}...`);
console.error(`  current hash:  ${currentHash.slice(0, 16)}...`);
console.error("  Run: pnpm generate:build-contracts");
process.exit(1);
