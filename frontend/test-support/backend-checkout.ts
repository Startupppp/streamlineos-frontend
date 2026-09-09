import fs from "node:fs";
import path from "node:path";

/**
 * Where the backend repository is checked out, relative to this one.
 *
 * Six cross-repo specs hardcoded a sibling `backend/`. This workspace clones the
 * two as `streamlineos-frontend/` and `streamlineos-backend/`, so every one of
 * them died on `ENOENT` — a layout failure that reads as a catalog drift.
 *
 * `null` when there is no backend beside this repo, which lets a spec skip
 * loudly instead of asserting against an empty sweep.
 */
const CANDIDATES = ["backend", "../streamlineos-backend"] as const;

/**
 * The backend worktree paired with this frontend one.
 *
 * The candidate list above finds *a* backend, and that turned out to be worse
 * than finding none. This repository is checked out more than once — a git
 * worktree per feature branch, named `<prefix>-frontend` beside
 * `<prefix>-backend` — and from `inv-wt-frontend` the list resolved to
 * `streamlineos-backend`, which was on an unrelated branch some two hundred
 * migrations behind.
 *
 * The catalog-sync guard then reported twenty-two inventory permission keys as
 * phantoms. They were not phantoms; they were present in the backend this
 * frontend is actually built against, and absent from the one the guard
 * happened to open. A cross-repo drift check reading the wrong repo does not
 * fail quietly — it fails confidently, which is worse, because the obvious
 * response is to delete the keys it names.
 *
 * So a worktree pairing is tried before the generic siblings.
 */
function pairedWorktree(here: string): string | null {
  // `here` is the frontend package; its parent is the checkout, and the
  // checkout is what carries the `-frontend` suffix. Candidates are resolved
  // against that checkout, so a sibling of it needs the `../` the generic ones
  // already carry.
  const name = path.basename(path.resolve(here, ".."));
  if (!name.endsWith("-frontend")) return null;
  return `../${name.slice(0, -"-frontend".length)}-backend`;
}

export function backendRoot(): string | null {
  const here = path.resolve(__dirname, "..");
  const paired = pairedWorktree(here);
  const candidates = paired === null ? CANDIDATES : [paired, ...CANDIDATES];

  for (const candidate of candidates) {
    const root = path.resolve(here, "..", candidate);
    if (fs.existsSync(path.join(root, "src", "modules"))) return root;
  }
  return null;
}

/** A path inside the backend checkout, or `null` if there is no checkout. */
export function backendPath(...segments: string[]): string | null {
  const root = backendRoot();
  return root === null ? null : path.join(root, ...segments);
}
