import fs from "node:fs";
import path from "node:path";

/**
 * Where the backend repository is, found by looking rather than by counting.
 *
 * Several cross-repo tests assert that this app and the API agree — on the
 * permission catalog, on owner-only operations, on route access keys, on the
 * dashboard cache key. Every one of them reached the backend by hardcoding a
 * chain of `..` segments, and every one of them was wrong in this checkout:
 * they resolved to `streamlineos-frontend/backend/...`, which does not exist.
 *
 * That is worse than a broken test. Each of those files guards itself with an
 * `existsSync` check and returns early when the path is missing, so the suites
 * stayed green while the drift they exist to catch went unwatched.
 * `catalog-sync.test.ts` documents this happening twice before and calls its own
 * guard "the guard against a third time" — it was the third time.
 *
 * The layout genuinely varies: `frontend/` and `backend/` inside one repository
 * in some checkouts, `streamlineos-frontend/` and `streamlineos-backend/` as
 * siblings in others. So resolve by trying both and taking whichever is on disk.
 * A caller that finds nothing should FAIL rather than skip, which is why this
 * returns the first candidate instead of null when none exists — the assertion
 * that the file is readable is the one that must break.
 */
const LAYOUTS = [
  // frontend/ and backend/ inside one repository.
  ["frontend", "backend"],
  // streamlineos-frontend/ and streamlineos-backend/ as sibling repositories.
  ["streamlineos-frontend", "streamlineos-backend"],
] as const;

/** The frontend package root, from anywhere under it. */
function frontendRoot(): string {
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json")) && path.basename(dir) === "frontend")
      return dir;
    dir = path.dirname(dir);
  }
  // Not under a directory called `frontend`; fall back to the package root.
  return path.resolve(__dirname, "../..");
}

/**
 * Resolve a path inside the backend repository.
 *
 * `relative` is relative to the backend repository root, e.g.
 * `"src/modules/rbac/permissions"`.
 */
export function backendPath(relative: string): string {
  const root = frontendRoot();
  const candidates = LAYOUTS.map(([frontendDir, backendDir]) =>
    path.resolve(root, "..", root.endsWith(frontendDir) ? backendDir : `../${backendDir}`, relative),
  );

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
}

/** Whether the backend repository is reachable at all, for a guard assertion. */
export function backendReachable(relative: string): boolean {
  return fs.existsSync(backendPath(relative));
}
