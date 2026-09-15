import permissionCatalog from "@/contracts/permission-catalog.json";
import { moduleByProductKey } from "@/lib/module-manifest";
import type { ProductKey } from "../sidebar/sidebar-nav-items";

const MEMBER_DEFAULT_PERMISSIONS = new Set(
  permissionCatalog.memberDefaultPermissions,
);

export function hasAssignedProductAccess(
  productKey: ProductKey,
  scopes: Readonly<Record<string, unknown>> | undefined,
): boolean {
  if (productKey === "home") return true;
  if (!scopes) return false;
  const moduleDefinition = moduleByProductKey(productKey);
  if (!moduleDefinition) return false;
  const namespaces = new Set([
    moduleDefinition.id,
    ...moduleDefinition.administersNamespaces,
    ...moduleDefinition.cacheNamespaces,
  ]);

  return Object.keys(scopes).some((permission) => {
    if (MEMBER_DEFAULT_PERMISSIONS.has(permission)) return false;
    const separator = permission.indexOf(":");
    const namespace = separator === -1 ? permission : permission.slice(0, separator);
    return namespaces.has(namespace);
  });
}
