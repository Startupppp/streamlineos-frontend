/**
 * Regenerate `contracts/permission-catalog.json` from the backend repository.
 *
 * Run this after any change to the backend RBAC catalogue, the module registry,
 * the role defaults or the owner-only operation list, and commit the result:
 *
 *   pnpm -C frontend generate:permission-catalog
 *
 * `check:permission-catalog` fails if the committed file and a fresh
 * regeneration differ, so a stale vendored copy cannot pass unnoticed on any
 * checkout that has the backend beside it.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backendAvailable, backendPath, backendUnreachableReason } from "./check-repo-paths.mjs";
import {
  buildCatalog,
  isPermissionCatalogFile,
  serializeCatalog,
} from "./permission-catalog-extract.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const CATALOG_PATH = join(FRONTEND_ROOT, "contracts", "permission-catalog.json");

export function readBackendCatalog() {
  const permissionsDir = backendPath("src", "modules", "rbac", "permissions");
  return buildCatalog({
    permissionSources: readdirSync(permissionsDir)
      .filter(isPermissionCatalogFile)
      .sort()
      .map((fileName) => readFileSync(join(permissionsDir, fileName), "utf8")),
    moduleRegistrySource: readFileSync(
      backendPath("src", "common", "rbac", "module-registry.ts"),
      "utf8",
    ),
    roleDefaultsSource: readFileSync(join(permissionsDir, "role-defaults.ts"), "utf8"),
    ownerOnlyOperationsSource: readFileSync(
      backendPath("src", "common", "rbac", "owner-only-operations.ts"),
      "utf8",
    ),
  });
}

function main() {
  if (!backendAvailable) {
    console.error(`Cannot regenerate the permission catalogue. ${backendUnreachableReason()}`);
    process.exit(2);
  }
  const catalog = readBackendCatalog();
  writeFileSync(CATALOG_PATH, serializeCatalog(catalog), "utf8");
  console.log(
    `Wrote contracts/permission-catalog.json — ${catalog.permissions.length} permissions, ` +
      `${catalog.delegableModuleIds.length} delegable modules, ` +
      `${catalog.memberDefaultPermissions.length} member defaults, ` +
      `${Object.keys(catalog.ownerOnlyOperations).length} owner-only operations.`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
