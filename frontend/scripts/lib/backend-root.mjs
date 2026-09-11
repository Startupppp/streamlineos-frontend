import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

/**
 * Where the backend repository is, found by looking rather than by counting.
 *
 * The `.mjs` twin of `lib/test-support/backend-path.ts`, which exists because
 * five cross-repo *tests* hardcoded a chain of `..` segments, resolved to a
 * directory that does not exist in this checkout, and — guarding themselves
 * with `existsSync` — skipped in silence while the drift they exist to catch
 * went unwatched. The build scripts have the same bug and the same consequence:
 * `check-contract-vendor.mjs` looks for `<repo-root>/backend/openapi.json`,
 * finds nothing, and reports "missing". A gate whose entire job is catching a
 * stale vendored contract has never once fired here.
 *
 * Two things make the resolution non-obvious, and both are load-bearing:
 *
 * 1. **The layout varies.** `frontend/` and `backend/` inside one repository in
 *    some checkouts; `streamlineos-frontend/` and `streamlineos-backend/` as
 *    siblings in others.
 * 2. **A worktree must prefer its own pair.** A feature worktree lives at
 *    `<feature>-frontend/frontend` with its backend at `<feature>-backend`,
 *    while `streamlineos-backend` sits beside them holding *somebody else's
 *    branch*. Resolving to that one compares this branch against an unrelated
 *    branch and reports the difference as drift. So `ts-wt-frontend` →
 *    `ts-wt-backend` is tried first; on the main checkout the same rule yields
 *    `streamlineos-frontend` → `streamlineos-backend`, so nothing changes there.
 *
 * Returns `null` when nothing is found. A caller must then say so out loud —
 * skipping silently is the failure this file exists to end.
 */
const LAYOUTS = [
  ["frontend", "backend"],
  ["streamlineos-frontend", "streamlineos-backend"],
];

function pairedSibling(frontendRoot) {
  const repoDir = dirname(frontendRoot);
  const repoName = basename(repoDir);
  if (!repoName.endsWith("-frontend")) return null;
  const paired = `${repoName.slice(0, -"-frontend".length)}-backend`;
  return resolve(dirname(repoDir), paired);
}

/** The backend repository root, or null when none is on disk. */
export function resolveBackendRoot(frontendRoot) {
  const candidates = [];
  const paired = pairedSibling(frontendRoot);
  if (paired) candidates.push(paired);
  for (const [frontendDir, backendDir] of LAYOUTS) {
    candidates.push(
      resolve(
        frontendRoot,
        "..",
        frontendRoot.endsWith(frontendDir) ? backendDir : `../${backendDir}`,
      ),
    );
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/** A path inside the backend repository, or null when the backend is absent. */
export function backendPath(frontendRoot, relative) {
  const root = resolveBackendRoot(frontendRoot);
  return root === null ? null : resolve(root, relative);
}
