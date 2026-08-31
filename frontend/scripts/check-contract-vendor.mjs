import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");

const FRONTEND_CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");
const BACKEND_ARTIFACT = join(REPO_ROOT, "backend", "openapi.json");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Compares two files by SHA-256 hash.
 * Returns { outcome: "match", hash } | { outcome: "mismatch", hashA, hashB } |
 *         { outcome: "missing" } when either path does not exist.
 */
function compareFiles(pathA, pathB) {
  if (!existsSync(pathA) || !existsSync(pathB)) return { outcome: "missing" };
  const hashA = sha256(readFileSync(pathA, "utf8"));
  const hashB = sha256(readFileSync(pathB, "utf8"));
  return hashA === hashB
    ? { outcome: "match", hash: hashA }
    : { outcome: "mismatch", hashA, hashB };
}

function runSelfTest() {
  const dir = join(tmpdir(), `contract-check-test-${Date.now()}`);
  try {
    mkdirSync(dir, { recursive: true });
    const fa = join(dir, "a.json");
    const fb = join(dir, "b.json");
    const fc = join(dir, "c.json");
    const missing = join(dir, "missing.json");
    writeFileSync(fa, '{"v":1}');
    writeFileSync(fb, '{"v":1}');
    writeFileSync(fc, '{"v":2}');

    const cases = [
      {
        description: "identical files produce a match",
        passes: compareFiles(fa, fb).outcome === "match",
      },
      {
        description: "different files produce a mismatch",
        passes: compareFiles(fa, fc).outcome === "mismatch",
      },
      {
        description: "a missing file produces missing, not a pass",
        passes: compareFiles(fa, missing).outcome === "missing",
      },
    ];

    const failures = cases.filter((c) => !c.passes);
    if (failures.length > 0) {
      for (const f of failures) console.error(`✖  self-test FAILED: ${f.description}`);
      process.exit(1);
    }

    for (const c of cases) console.log(`✔  self-test passed: ${c.description}`);
    console.log("\n✔  All self-test cases passed — check-contract-vendor is live.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

const result = compareFiles(FRONTEND_CONTRACT, BACKEND_ARTIFACT);

if (result.outcome === "match") {
  console.log("✔  frontend/contracts/openapi.json matches backend/openapi.json");
  console.log(`   sha256: ${result.hash.slice(0, 16)}...`);
  process.exit(0);
}

console.error("✖  frontend/contracts/openapi.json is STALE — it does not match backend/openapi.json.");
console.error(`   frontend hash: ${result.hashA.slice(0, 16)}...`);
console.error(`   backend  hash: ${result.hashB.slice(0, 16)}...`);
console.error("");
console.error("   To vendor the latest contract:");
console.error("     pnpm --filter streamlineos-api openapi:generate");
console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
process.exit(1);
