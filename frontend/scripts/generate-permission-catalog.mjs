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

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backendAvailable, backendPath, backendUnreachableReason } from "./check-repo-paths.mjs";
import {
  buildCatalog,
  isPermissionCatalogFile,
  isRoleTemplateFile,
  serializeCatalog,
  serializePermissionKeyTs,
} from "./permission-catalog-extract.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const CATALOG_PATH = join(FRONTEND_ROOT, "contracts", "permission-catalog.json");
export const PERMISSION_KEY_TS_PATH = join(
  FRONTEND_ROOT,
  "contracts",
  "permission-key.generated.ts",
);

export function readBackendCatalog() {
  const permissionsDir = backendPath("src", "modules", "rbac", "permissions");
  const rbacDir = backendPath("src", "modules", "rbac");
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
    roleTemplateSources: readdirSync(rbacDir)
      .filter(isRoleTemplateFile)
      .sort()
      .map((fileName) => readFileSync(join(rbacDir, fileName), "utf8")),
  });
}

const RUNTIME_PROBE = [
  'const { PERMISSIONS, UNIVERSAL_MEMBER_PERMISSION_GRANTS } = require("./src/modules/rbac/permissions");',
  "const scopes = new Map(UNIVERSAL_MEMBER_PERMISSION_GRANTS.map((g) => [g.permissionKey, g.scope]));",
  "const rows = PERMISSIONS.map((p) => (scopes.has(p.name) ? { ...p, baselineScope: scopes.get(p.name) } : p));",
  "process.stdout.write(JSON.stringify(rows));",
].join("\n");

export function readBackendRuntimePermissions() {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register/transpile-only", "-e", RUNTIME_PROBE],
    { cwd: backendPath(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(`Evaluating the backend PERMISSIONS failed: ${result.stderr || result.error}`);
  return JSON.parse(result.stdout);
}

function main() {
  if (!backendAvailable) {
    console.error(`Cannot regenerate the permission catalogue. ${backendUnreachableReason()}`);
    process.exit(2);
  }
  const catalog = readBackendCatalog();
  writeFileSync(CATALOG_PATH, serializeCatalog(catalog), "utf8");
  writeFileSync(PERMISSION_KEY_TS_PATH, serializePermissionKeyTs(catalog), "utf8");
  console.log(
    `Wrote contracts/permission-catalog.json — ${catalog.permissions.length} permissions, ` +
      `${catalog.delegableModuleIds.length} delegable modules, ` +
      `${catalog.memberDefaultPermissions.length} member defaults, ` +
      `${Object.keys(catalog.ownerOnlyOperations).length} owner-only operations.`,
  );
  console.log(
    `Wrote contracts/permission-key.generated.ts — ${catalog.permissions.length} keys with metadata.`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
