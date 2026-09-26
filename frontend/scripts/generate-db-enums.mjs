/**
 * Re-vendor `contracts/db-enums.generated.ts` from the backend repository.
 *
 * Run this after any `pgEnum` change in the backend schema, and commit the
 * result:
 *
 *   pnpm -C backend generate:db-enums
 *   pnpm -C frontend generate:db-enums
 *
 * `check:db-enums-vendor` fails if the committed copy and the backend's copy
 * differ, so a stale vendored module cannot pass unnoticed on any checkout that
 * has the backend beside it.
 *
 * This copies rather than re-derives on purpose. Two parsers of the same schema
 * can disagree; one generator and a byte comparison cannot.
 */

import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backendAvailable, backendPath, backendUnreachableReason } from "./check-repo-paths.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const VENDORED_PATH = join(FRONTEND_ROOT, "contracts", "db-enums.generated.ts");

function main() {
  if (!backendAvailable) {
    console.error(`Cannot re-vendor the database enum module. ${backendUnreachableReason()}`);
    process.exit(2);
  }
  const source = backendPath("src", "db", "enums.generated.ts");
  if (!existsSync(source)) {
    console.error(`The backend has no generated enum module at ${source}.`);
    console.error("Generate it there first:  pnpm -C backend generate:db-enums");
    process.exit(2);
  }
  copyFileSync(source, VENDORED_PATH);
  console.log(`Wrote contracts/db-enums.generated.ts from ${source}`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
