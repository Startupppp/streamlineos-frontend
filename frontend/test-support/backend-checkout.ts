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

export function backendRoot(): string | null {
  const here = path.resolve(__dirname, "..");
  for (const candidate of CANDIDATES) {
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
