import permissionCatalog from "@/contracts/permission-catalog.json";
import type { Permission } from "./types";

type PermissionMeta = Omit<Permission, "name">;

function isKnownKey(
  key: string,
  map: Record<string, unknown>,
): key is keyof typeof permissionCatalog.permissionDetails {
  return Object.prototype.hasOwnProperty.call(map, key);
}

export const PERMISSIONS: readonly Permission[] = permissionCatalog.permissions.flatMap(
  (name) => {
    if (!isKnownKey(name, permissionCatalog.permissionDetails)) return [];
    const meta: PermissionMeta = permissionCatalog.permissionDetails[name];
    return [{ name, ...meta }];
  },
);
