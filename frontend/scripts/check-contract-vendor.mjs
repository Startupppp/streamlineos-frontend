import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");

const FRONTEND_CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");

/**
 * Where the backend's generated artifact lives depends on the checkout layout.
 * A monorepo checkout puts it at `<repo>/backend/`; two sibling clones put it at
 * `<repo>/../streamlineos-backend/`. Hardcoding only the first made this gate
 * exit 1 with "missing" on a sibling layout — loud, but still a gate that never
 * compared the two files. Resolve the candidates and report which one was used,
 * so a green result names the artifact it actually read.
 */
const BACKEND_CANDIDATES = [
  process.env.STREAMLINEOS_BACKEND_ROOT ? join(process.env.STREAMLINEOS_BACKEND_ROOT, "openapi.json") : null,
  join(REPO_ROOT, "backend", "openapi.json"),
  join(REPO_ROOT, "..", "streamlineos-backend", "openapi.json"),
  join(REPO_ROOT, "..", "backend", "openapi.json"),
].filter((p) => p !== null);

export function resolveBackendArtifact(candidates, exists) {
  return candidates.find((p) => exists(p)) ?? null;
}

const BACKEND_ARTIFACT = resolveBackendArtifact(BACKEND_CANDIDATES, existsSync);

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

    const seen = new Set([fa, fc]);
    const has = (p) => seen.has(p);
    cases.push(
      {
        description: "the backend artifact resolves through the first candidate that exists",
        passes: resolveBackendArtifact([missing, fc, fa], has) === fc,
      },
      {
        description: "a sibling-layout candidate is found when the monorepo path is absent",
        passes: resolveBackendArtifact([join(dir, "repo", "backend", "openapi.json"), fa], has) === fa,
      },
      {
        description: "no candidate existing returns null, never a path that is not there",
        passes: resolveBackendArtifact([missing, join(dir, "nope.json")], has) === null,
      },
    );

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

if (BACKEND_ARTIFACT === null) {
  console.error("✖  the backend's openapi.json is missing — cannot verify vendored copy.");
  console.error("   This check requires both repos to be checked out. Looked in:");
  for (const c of BACKEND_CANDIDATES) console.error(`     ${c}`);
  console.error("   Set STREAMLINEOS_BACKEND_ROOT to point at the backend checkout, or");
  console.error("   in a frontend-only CI checkout skip this check and run");
  console.error("   check-contract-drift.mjs against the vendored copy instead.");
  process.exit(1);
}

const result = compareFiles(FRONTEND_CONTRACT, BACKEND_ARTIFACT);

if (result.outcome === "match") {
  console.log(`✔  frontend/contracts/openapi.json matches ${BACKEND_ARTIFACT}`);
  console.log(`   sha256: ${result.hash.slice(0, 16)}...`);
  process.exit(0);
}

console.error(`✖  frontend/contracts/openapi.json is STALE — it does not match ${BACKEND_ARTIFACT}.`);
console.error(`   frontend hash: ${result.hashA.slice(0, 16)}...`);
console.error(`   backend  hash: ${result.hashB.slice(0, 16)}...`);
console.error("");
console.error("   To vendor the latest contract:");
console.error("     pnpm --filter streamlineos-api openapi:generate");
console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
process.exit(1);
