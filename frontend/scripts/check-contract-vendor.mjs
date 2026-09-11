import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { backendPath, resolveBackendRoot } from "./lib/backend-root.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));

const FRONTEND_CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");
/**
 * Found by looking, not by counting `..` segments.
 *
 * This resolved `<repo-root>/backend/openapi.json` — a monorepo layout this
 * checkout does not use — so the gate whose entire job is catching a stale
 * vendored contract exited on "backend is missing" every single time it ran,
 * and the vendored copy drifted far enough to describe a version of the
 * accounting module that no longer exists.
 *
 * `resolveBackendRoot` also prefers a worktree's OWN pair
 * (`ts-wt-frontend` → `ts-wt-backend`) over `streamlineos-backend`, which in a
 * worktree holds somebody else's branch — comparing against that would report
 * the difference between two branches as a stale vendor.
 */
const BACKEND_ARTIFACT = backendPath(FRONTEND_ROOT, "openapi.json");

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
  console.error(`     cp ${BACKEND_ARTIFACT ?? "<backend>/openapi.json"} frontend/contracts/openapi.json`);
  process.exit(1);
}

if (BACKEND_ARTIFACT === null || !existsSync(BACKEND_ARTIFACT)) {
  const root = resolveBackendRoot(FRONTEND_ROOT);
  console.error(
    root === null
      ? "✖  No backend repository found beside this one — cannot verify the vendored copy."
      : `✖  ${BACKEND_ARTIFACT} is missing — cannot verify the vendored copy.`,
  );
  if (root !== null) {
    console.error(`   Backend found at: ${root}`);
    console.error("   Generate the artifact there first:  pnpm openapi:generate");
  }
  console.error("   This check requires both repos to be checked out.");
  console.error("   In a frontend-only CI checkout, skip this check and run");
  console.error("   check-contract-drift.mjs against the vendored copy instead.");
  /*
   * Exit 2, not 1. A prerequisite that is absent is not a violation, and
   * conflating the two is how this gate spent its whole life reporting a
   * failure nobody could act on.
   */
  process.exit(2);
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
console.error(`     cp ${BACKEND_ARTIFACT} frontend/contracts/openapi.json`);
process.exit(1);
