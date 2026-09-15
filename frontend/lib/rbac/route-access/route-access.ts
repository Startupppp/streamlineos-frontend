import { resolveNavRouteAccess } from "@/components/layout/sidebar/sidebar-nav-items";
import type {
  PermissionRequirement,
  ProductKey,
} from "@/components/layout/sidebar/sidebar-nav-types";
import { moduleByProductKey } from "@/lib/module-manifest";
import permissionCatalog from "@/contracts/permission-catalog.json";
import { matchRouteAccessExtension } from "./route-access-extensions";
import { matchUniversalRoute } from "./universal-routes";

export type RouteAccessDecision =
  | { kind: "universal"; reason: string }
  | {
      kind: "permission";
      orgModuleKey: string | null;
      permission: PermissionRequirement | null;
    }
  | { kind: "unknown" };

const ALWAYS_ENABLED_PRODUCTS: ReadonlySet<ProductKey> = new Set<ProductKey>([
  "home",
  "administration",
]);

const MEMBER_DEFAULT_PERMISSIONS = new Set(
  permissionCatalog.memberDefaultPermissions,
);

export function orgModuleKeyForProduct(product: ProductKey): string | null {
  if (ALWAYS_ENABLED_PRODUCTS.has(product)) return null;
  return moduleByProductKey(product)?.id ?? null;
}

export function hasAssignedProductAccess(
  product: ProductKey,
  scopes: Readonly<Record<string, unknown>> | undefined,
): boolean {
  if (product === "home") return true;
  if (!scopes) return false;
  const manifestModule = moduleByProductKey(product);
  if (!manifestModule) return false;
  const namespaces = new Set([
    manifestModule.id,
    ...manifestModule.administersNamespaces,
    ...manifestModule.cacheNamespaces,
  ]);
  return Object.keys(scopes).some((permission) => {
    if (MEMBER_DEFAULT_PERMISSIONS.has(permission)) return false;
    const separator = permission.indexOf(":");
    const namespace =
      separator === -1 ? permission : permission.slice(0, separator);
    return namespaces.has(namespace);
  });
}

export function resolveRouteAccess(pathname: string): RouteAccessDecision {
  const extension = matchRouteAccessExtension(pathname);
  if (extension) {
    const orgModuleKey = extension.product
      ? orgModuleKeyForProduct(extension.product)
      : null;
    const permission = extension.permission ?? null;
    if (orgModuleKey !== null || permission !== null)
      return { kind: "permission", orgModuleKey, permission };
  }

  const universal = matchUniversalRoute(pathname);
  if (universal) return { kind: "universal", reason: universal.reason };

  const nav = resolveNavRouteAccess(pathname);
  if (nav.matched) {
    const orgModuleKey = nav.module ? orgModuleKeyForProduct(nav.module) : null;
    const permission = nav.requiredPermission ?? null;
    if (orgModuleKey !== null || permission !== null)
      return { kind: "permission", orgModuleKey, permission };
  }

  return { kind: "unknown" };
}

export function describeRouteAccess(decision: RouteAccessDecision): string {
  switch (decision.kind) {
    case "universal":
      return "universal";
    case "permission": {
      const parts: string[] = [];
      if (decision.orgModuleKey) parts.push(`module:${decision.orgModuleKey}`);
      if (decision.permission) {
        const keys = Array.isArray(decision.permission)
          ? decision.permission
          : [decision.permission];
        parts.push(keys.join(","));
      }
      return parts.join(" + ");
    }
    case "unknown":
      return "unknown";
  }
}
