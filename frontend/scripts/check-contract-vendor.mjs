import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");

const FRONTEND_CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");
const BACKEND_ARTIFACT = join(REPO_ROOT, "backend", "openapi.json");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function runSelfTest() {
  const identical = "content";
  const different = "different-content";

  const hash1 = sha256(identical);
  const hash2 = sha256(identical);
  const hash3 = sha256(different);

  const cases = [
    {
      description: "identical content produces a match",
      passes: hash1 === hash2,
    },
    {
      description: "different content produces a mismatch",
      passes: hash1 !== hash3,
    },
  ];

  const failures = cases.filter((c) => !c.passes);
  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f.description}`);
    process.exit(1);
  }

  for (const c of cases) console.log(`✔  self-test passed: ${c.description}`);

  console.log("\n✔  All self-test cases passed — check-contract-vendor is live.");
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
}

if (!existsSync(FRONTEND_CONTRACT)) {
  console.error("✖  frontend/contracts/openapi.json is missing.");
  console.error("   Vendor it from the backend:");
  console.error("     pnpm --filter streamlineos-api openapi:generate");
  console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
  process.exit(1);
}

if (!existsSync(BACKEND_ARTIFACT)) {
  console.error("✖  backend/openapi.json is missing — cannot verify vendored copy.");
  console.error("   This check requires both repos to be checked out.");
  console.error("   In a frontend-only CI checkout, skip this check and run");
  console.error("   check-contract-drift.mjs against the vendored copy instead.");
  process.exit(1);
}

const frontendContent = readFileSync(FRONTEND_CONTRACT, "utf8");
const backendContent = readFileSync(BACKEND_ARTIFACT, "utf8");

const frontendHash = sha256(frontendContent);
const backendHash = sha256(backendContent);

if (frontendHash === backendHash) {
  console.log("✔  frontend/contracts/openapi.json matches backend/openapi.json");
  console.log(`   sha256: ${frontendHash.slice(0, 16)}...`);
  process.exit(0);
}

console.error("✖  frontend/contracts/openapi.json is STALE — it does not match backend/openapi.json.");
console.error(`   frontend hash: ${frontendHash.slice(0, 16)}...`);
console.error(`   backend  hash: ${backendHash.slice(0, 16)}...`);
console.error("");
console.error("   To vendor the latest contract:");
console.error("     pnpm --filter streamlineos-api openapi:generate");
console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
process.exit(1);
