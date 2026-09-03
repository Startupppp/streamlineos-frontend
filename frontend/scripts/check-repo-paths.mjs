/**
 * Shared repository-root resolution for the frontend `check:*` gates.
 *
 * A gate that hardcodes `<frontend>/../backend` silently degrades to a green
 * "SKIPPED" on any checkout where the two repositories are siblings named
 * something else. This searches upward for a directory carrying the marker
 * instead of guessing a relative depth, and treats an explicit
 * STREAMLINE_BACKEND_ROOT as authoritative so a wrong override fails loudly
 * rather than silently resolving elsewhere.
 *
 * The .ts twin used by Jest specs is `frontend/test-utils/backend-repo.ts`;
 * keep the two in step.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const MARKER = join("src", "modules", "rbac", "permissions");
const SIBLING_NAMES = ["backend", "streamlineos-backend"];

function isBackendRoot(candidate) {
  return existsSync(join(candidate, MARKER));
}

function candidateRoots() {
  const roots = [];
  let dir = SCRIPT_DIR;
  for (let depth = 0; depth < 8; depth++) {
    for (const name of SIBLING_NAMES) roots.push(join(dir, name));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

function resolveBackendRoot() {
  const override = process.env.STREAMLINE_BACKEND_ROOT;
  if (override) {
    const resolved = resolve(override);
    return isBackendRoot(resolved) ? { root: resolved, overridden: true } : { root: null, overridden: true };
  }
  for (const candidate of candidateRoots())
    if (isBackendRoot(candidate)) return { root: candidate, overridden: false };
  return { root: null, overridden: false };
}

const resolved = resolveBackendRoot();

export const BACKEND_ROOT = resolved.root;
export const backendAvailable = resolved.root !== null;
export const backendRootWasOverridden = resolved.overridden;

export function backendPath(...segments) {
  if (BACKEND_ROOT === null) throw new Error(backendUnreachableReason());
  return join(BACKEND_ROOT, ...segments);
}

export function backendUnreachableReason() {
  if (resolved.overridden)
    return `STREAMLINE_BACKEND_ROOT is set to "${String(process.env.STREAMLINE_BACKEND_ROOT)}" but that directory does not contain ${MARKER}.`;
  return `Backend repository not found. Searched for a directory containing ${MARKER} beside or above ${SCRIPT_DIR}. Set STREAMLINE_BACKEND_ROOT to override.`;
}

/**
 * A gate that cannot reach the backend must say INCONCLUSIVE and exit non-zero
 * unless the operator has explicitly opted into a frontend-only run. A green
 * tick for a comparison that never happened is the defect this exists to stop.
 */
export function reportBackendUnreachable(gateName, whatIsSkipped) {
  const allowed = process.env.STREAMLINE_ALLOW_FRONTEND_ONLY === "1";
  const stream = allowed ? console.warn : console.error;
  stream(`${allowed ? "PARTIAL" : "INCONCLUSIVE"} — ${gateName}: ${whatIsSkipped} could not run.`);
  stream(`  ${backendUnreachableReason()}`);
  if (allowed) {
    console.warn("  STREAMLINE_ALLOW_FRONTEND_ONLY=1 — downgraded to PARTIAL; this run proves nothing about the skipped rule.");
    return;
  }
  console.error("  Set STREAMLINE_BACKEND_ROOT, or set STREAMLINE_ALLOW_FRONTEND_ONLY=1 to accept a PARTIAL run.");
  process.exit(2);
}

/**
 * Directory-walk exclusion for every frontend source scan.
 *
 * A name-exact `.next` blocklist let `.next-buildmart` — 718 MB of minified
 * build output from an alternate distDir — into the corpus of every gate that
 * scans .js, producing findings in generated chunks. No frontend SOURCE
 * directory begins with a dot, so skipping dot-directories wholesale is both
 * safer and narrower than enumerating build outputs one at a time.
 */
export const SOURCE_SCAN_EXCLUDE_DIRS = new Set([
  "node_modules",
  "feedbucket-widget",
  "coverage",
  "out",
]);

export function isExcludedScanDir(name) {
  return name.startsWith(".") || SOURCE_SCAN_EXCLUDE_DIRS.has(name);
}

export function runScanDirSelfTest(assert) {
  assert("node_modules is excluded", isExcludedScanDir("node_modules") === true);
  assert("the default build dir is excluded", isExcludedScanDir(".next") === true);
  assert(
    "an alternate distDir is excluded — the defect that let 718MB of chunks into the corpus",
    isExcludedScanDir(".next-buildmart") === true,
  );
  assert("the swc cache is excluded", isExcludedScanDir(".swc") === true);
  assert("the scratch dir is excluded", isExcludedScanDir(".scratch") === true);
  assert("app/ is scanned", isExcludedScanDir("app") === false);
  assert("components/ is scanned", isExcludedScanDir("components") === false);
  assert("lib/ is scanned", isExcludedScanDir("lib") === false);
  assert("hooks/ is scanned", isExcludedScanDir("hooks") === false);
  assert("features/ is scanned", isExcludedScanDir("features") === false);
  assert(
    "the Build module route folder is NOT mistaken for a build output dir",
    isExcludedScanDir("build") === false,
  );
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const notRun = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  // Layout-independent. These prove the RESOLVER and hold in any checkout,
  // including the frontend-only checkout CI actually performs.
  assert(
    "the unreachable reason names the marker it searched for",
    backendUnreachableReason().includes(MARKER),
  );
  assert(
    "a candidate list is generated for every level up to the filesystem root",
    candidateRoots().length >= 2 && candidateRoots().some((c) => c.endsWith("streamlineos-backend")),
  );
  assert(
    "a directory without the marker is not accepted as a backend root",
    isBackendRoot(SCRIPT_DIR) === false,
  );
  runScanDirSelfTest(assert);

  // Cross-repository. Whether the backend is CHECKED OUT is an environment
  // fact, not a defect in the resolver, and asserting it unconditionally made
  // this self-test exit 1 in every frontend-only checkout -- which, as the
  // first blocking step of the `gates` job, skipped all 26 gates below it. When
  // the sibling is absent the ABSENCE CONTRACT is asserted instead, and the run
  // ends INCONCLUSIVE (exit 2) rather than OK, so a partial run can never be
  // read as a clean one.
  if (backendAvailable) {
    assert("the backend repository resolves in this checkout", backendAvailable);
    assert("the resolved backend root actually carries the marker", existsSync(join(BACKEND_ROOT, MARKER)));
    assert("backendPath composes onto the resolved root", backendPath("src").endsWith(join("src")));
    if (process.env.STREAMLINE_BACKEND_ROOT === undefined)
      assert("no override was needed on this layout", backendRootWasOverridden === false);
    else assert("an explicit STREAMLINE_BACKEND_ROOT is honoured as authoritative", backendRootWasOverridden === true);
  } else {
    notRun.push(
      "the backend repository resolves in this checkout",
      "the resolved backend root actually carries the marker",
      "backendPath composes onto the resolved root",
      "no override was needed on this layout",
    );
    assert("an absent backend resolves to null rather than a wrong directory", BACKEND_ROOT === null);
    assert("an absent backend is reported as unavailable", backendAvailable === false);
    assert(
      "backendPath throws and names the marker instead of composing onto a null root",
      (() => {
        try {
          backendPath("src");
          return false;
        } catch (error) {
          return String(error.message).includes(MARKER);
        }
      })(),
    );
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`  FAIL: ${f}`);
    console.error(`check-repo-paths self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }

  if (notRun.length > 0) {
    const allowed = process.env.STREAMLINE_ALLOW_FRONTEND_ONLY === "1";
    const stream = allowed ? console.warn : console.error;
    stream(
      `${allowed ? "PARTIAL" : "INCONCLUSIVE"} — check-repo-paths: ${passed} passed, ${notRun.length} cross-repository assertion(s) NOT RUN in this checkout.`,
    );
    for (const label of notRun) stream(`  NOT RUN: ${label}`);
    stream(`  ${backendUnreachableReason()}`);
    if (allowed) {
      console.warn("  STREAMLINE_ALLOW_FRONTEND_ONLY=1 — this run proves the resolver, and proves nothing about the sibling layout.");
      process.exit(0);
    }
    console.error("  Set STREAMLINE_BACKEND_ROOT, or set STREAMLINE_ALLOW_FRONTEND_ONLY=1 to accept a PARTIAL run.");
    process.exit(2);
  }

  console.log(`check-repo-paths self-tests: ${passed} passed`);
  process.exit(0);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly && process.argv.includes("--self-test")) runSelfTest();
