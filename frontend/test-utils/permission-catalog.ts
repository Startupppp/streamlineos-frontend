import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface VendoredPermissionCatalog {
  readonly permissions: readonly string[];
  readonly delegableModuleIds: readonly string[];
  readonly memberDefaultPermissions: readonly string[];
  readonly ownerOnlyOperations: Readonly<Record<string, string>>;
  readonly roleTemplatePermissions: readonly string[];
}

export const PERMISSION_CATALOG_PATH = resolve(
  __dirname,
  "..",
  "contracts",
  "permission-catalog.json",
);

let cached: VendoredPermissionCatalog | null = null;

export function permissionCatalog(): VendoredPermissionCatalog {
  if (cached === null)
    cached = JSON.parse(
      readFileSync(PERMISSION_CATALOG_PATH, "utf8"),
    ) as VendoredPermissionCatalog;
  return cached;
}

export function backendPermissionNames(): Set<string> {
  return new Set(permissionCatalog().permissions);
}

export function delegableModuleIds(): readonly string[] {
  return permissionCatalog().delegableModuleIds;
}

export function roleTemplatePermissions(): Set<string> {
  return new Set(permissionCatalog().roleTemplatePermissions);
}

export function memberDefaultPermissions(): Set<string> {
  return new Set(permissionCatalog().memberDefaultPermissions);
}

export function ownerOnlyOperations(): Map<string, string> {
  return new Map(Object.entries(permissionCatalog().ownerOnlyOperations));
}
