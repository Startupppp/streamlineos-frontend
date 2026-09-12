import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKEND_ROOT, backendRootWasOverridden, backendUnreachableReason } from "./check-repo-paths.mjs";
import { resolveBackendRoot } from "./lib/backend-root.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");

const FRONTEND_CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");

/**
 * Where the backend's generated artifact lives depends on the checkout layout.
 * This gate used to guess relative depths of its own AND read a private env var
 * `STREAMLINEOS_BACKEND_ROOT` -- one letter different from the
 * `STREAMLINE_BACKEND_ROOT` every other frontend gate honours, so the documented
 * override silently did nothing here while a hardcoded `../streamlineos-backend`
 * guess answered instead. Measured 2026-09-03: with STREAMLINE_BACKEND_ROOT
 * pointed at a nonexistent directory this gate still exited 0, comparing against
 * a checkout the operator had explicitly overridden away from.
 *
 * An explicit STREAMLINE_BACKEND_ROOT, read by the shared resolver in
 * check-repo-paths.mjs, is the first and authoritative source, so a wrong override
 * fails loudly rather than resolving elsewhere. The legacy env var and the monorepo
 * layout stay as fallbacks so an existing invocation keeps working, and the
 * resolved path is printed either way.
 *
 * Without an override, the worktree's OWN pair comes before the shared resolver's
 * upward search. `resolveBackendRoot` (scripts/lib/backend-root.mjs) maps
 * `ts-wt-frontend` → `ts-wt-backend`; the upward search looks for a sibling named
 * `backend` or `streamlineos-backend`, and from a worktree it finds
 * `streamlineos-backend`, which holds somebody else's branch — comparing against
 * that would report the difference between two branches as a stale vendor. On the
 * main checkout both rules name the same directory, so nothing changes there.
 */
function backendRootsInOrder() {
  if (backendRootWasOverridden) return [BACKEND_ROOT];
  return [resolveBackendRoot(FRONTEND_ROOT), BACKEND_ROOT];
}

const BACKEND_CANDIDATES = [
  ...backendRootsInOrder().map((root) => (root === null ? null : join(root, "openapi.json"))),
  process.env.STREAMLINEOS_BACKEND_ROOT ? join(process.env.STREAMLINEOS_BACKEND_ROOT, "openapi.json") : null,
  join(REPO_ROOT, "backend", "openapi.json"),
].filter((p, i, all) => p !== null && all.indexOf(p) === i);

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
  /**
   * Exit 2, not 1. Every cross-repository gate here uses 2 for INCONCLUSIVE -- the rule could
   * not be checked because a named prerequisite is absent -- and 1 only for a real violation.
   * This gate used to exit 1 for both, so CI had to wrap it in `continue-on-error: true` to
   * tolerate the frontend-only checkout, and that flag then also swallowed a genuinely STALE
   * vendored contract. Splitting the codes is what lets the step block again.
   */
  console.error("INCONCLUSIVE — check-contract-vendor: the backend's openapi.json could not be located,");
  console.error("   so the vendored copy was NOT compared against anything. Looked in:");
  for (const c of BACKEND_CANDIDATES) console.error(`     ${c}`);
  const foundRoot = backendRootsInOrder().find((root) => root !== null) ?? null;
  if (foundRoot === null) {
    console.error(`   ${backendUnreachableReason()}`);
  } else {
    console.error(`   A backend checkout was found at ${foundRoot}, but it has no generated openapi.json.`);
    console.error("   Generate the artifact there first:  pnpm openapi:generate");
  }
  console.error("   Set STREAMLINE_BACKEND_ROOT to point at the backend checkout, or");
  console.error("   in a frontend-only CI checkout rely on check:contract-drift, which is blocking");
  console.error("   and reads the vendored copy directly.");
  process.exit(2);
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
