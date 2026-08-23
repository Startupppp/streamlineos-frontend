import { ROLES } from "@/lib/constants/roles";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { HR_NAV_GROUPS } from "./sidebar-nav-groups-hr";
import { WORKFLOWS_NAV_GROUPS } from "./sidebar-nav-groups-workflows";
import { RECRUITMENT_NAV_GROUPS } from "./sidebar-nav-groups-recruitment";
import { PAYROLL_NAV_GROUPS } from "./sidebar-nav-groups-payroll";
import { CRM_NAV_GROUPS } from "./sidebar-nav-groups-crm";
import { FINANCE_NAV_GROUPS } from "./sidebar-nav-groups-finance";
import { INVENTORY_NAV_GROUPS } from "./sidebar-nav-groups-inventory";
import { WORK_MANAGEMENT_NAV_GROUPS } from "./sidebar-nav-groups-work-management";
import { KNOWLEDGE_SUPPORT_NAV_GROUPS } from "./sidebar-nav-groups-knowledge-support";
import { ADMINISTRATION_NAV_GROUPS } from "./sidebar-nav-groups-administration";
import { isModuleEnabled } from "./sidebar-products";
import type {
  NavGroup,
  NavRoute,
  NavRouteAccess,
  PermissionRequirement,
  ProductKey,
} from "./sidebar-nav-types";

export type {
  NavGroup,
  NavRoute,
  NavRouteAccess,
  ProductKey,
} from "./sidebar-nav-types";
export {
  getProductFromPathname,
  isModuleEnabled,
  MODULE_ACCENTS,
  PRODUCT_DEFINITIONS,
  PRODUCT_DESCRIPTIONS,
} from "./sidebar-products";
export type { ModuleAccent, ProductDefinition } from "./sidebar-products";

export function isNavRouteActive(
  route: NavRoute,
  pathname: string,
): boolean {
  if (pathname === route.href) return true;
  if (
    route.inactivePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  if (
    route.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix),
    )
  ) {
    return true;
  }
  if (route.exact || (route.children && route.children.length > 0)) {
    return false;
  }
  return pathname.startsWith(`${route.href}/`);
}

export const NAV_GROUPS: NavGroup[] = [
  ...WORKFLOWS_NAV_GROUPS,
  ...HR_NAV_GROUPS,
  ...RECRUITMENT_NAV_GROUPS,
  ...PAYROLL_NAV_GROUPS,
  ...CRM_NAV_GROUPS,
  ...FINANCE_NAV_GROUPS,
  ...INVENTORY_NAV_GROUPS,
  ...WORK_MANAGEMENT_NAV_GROUPS,
  ...KNOWLEDGE_SUPPORT_NAV_GROUPS,
  ...ADMINISTRATION_NAV_GROUPS,
];

function matchesPermission(
  required: PermissionRequirement | undefined,
  granted: Set<string>,
): boolean {
  if (!required) return true;
  const reqs = Array.isArray(required) ? required : [required];
  if (reqs.length === 0) return true;
  return reqs.some((p) => granted.has(p));
}

function filterRoute(
  route: NavRoute,
  isOwner: boolean,
  granted: Set<string>,
  enabledModules: string[],
  inheritedPermission?: PermissionRequirement,
): NavRoute[] {
  if (route.module && !isModuleEnabled(route.module, enabledModules))
    return [];
  if (
    route.modulesAny &&
    !route.modulesAny.some((module) => isModuleEnabled(module, enabledModules))
  )
    return [];

  const effectivePermission =
    route.requiredPermission ?? inheritedPermission;
  const children = (route.children ?? []).flatMap((child) =>
    filterRoute(
      child,
      isOwner,
      granted,
      enabledModules,
      effectivePermission,
    ),
  );

  if (!isOwner && !matchesPermission(effectivePermission, granted)) {
    return children;
  }

  return [
    children.length > 0
      ? { ...route, children }
      : { ...route, children: undefined },
  ];
}

export function getNavGroupsForUser(
  role: string | undefined,
  permissions: string[] | undefined,
  enabledModules: string[] = [],
): NavGroup[] {
  if (!role) return [];

  const isOwner = role === ROLES.OWNER;
  const granted = new Set(permissions ?? []);

  return NAV_GROUPS.filter(
    (group) => !group.module || isModuleEnabled(group.module, enabledModules),
  )
    .map((group) => {
      const visibleRoutes = group.routes
        .flatMap((route) =>
          filterRoute(
            route,
            isOwner,
            granted,
            enabledModules,
            group.requiredPermission,
          ),
        );
      return { ...group, routes: visibleRoutes };
    })
    .filter((group) => group.routes.length > 0);
}

export function flattenNavRoutes(routes: NavRoute[]): NavRoute[] {
  const out: NavRoute[] = [];
  for (const r of routes) {
    out.push(r);
    if (r.children && r.children.length > 0) {
      out.push(...flattenNavRoutes(r.children));
    }
  }
  return out;
}

export function countNavLeaves(routes: NavRoute[]): number {
  let count = 0;
  for (const route of routes) {
    if (route.children && route.children.length > 0) {
      count += countNavLeaves(route.children);
    } else {
      count += 1;
    }
  }
  return count;
}

export function countProductNavLeaves(navGroups: NavGroup[]): number {
  return navGroups.reduce(
    (sum, group) => sum + countNavLeaves(group.routes),
    0,
  );
}

export function getAccessibleProductHref(
  navGroups: NavGroup[],
  fallbackHref: string,
): string {
  return navGroups[0]?.routes[0]?.href ?? fallbackHref;
}

export function shouldHideProductSidebar(navGroups: NavGroup[]): boolean {
  return countProductNavLeaves(navGroups) === 0;
}

export function isPortalChromelessPath(pathname: string): boolean {
  if (pathname === "/portal") return true;
  if (
    pathname.startsWith("/portal/projects") ||
    pathname.startsWith("/portal/accept-invitation")
  ) {
    return false;
  }
  return /^\/portal\/[^/]+/.test(pathname);
}

export function isKnowledgeWikiPath(pathname: string): boolean {
  return (
    pathname === "/knowledge/wiki" || pathname.startsWith("/knowledge/wiki/")
  );
}

function routeOwnsPath(route: NavRoute, pathname: string): boolean {
  if (pathname === route.href) return true;
  if (route.href === "/hr") return false;
  return pathname.startsWith(`${route.href}/`);
}

export function resolveNavRouteAccess(pathname: string): NavRouteAccess {
  let best:
    | (NavRouteAccess & { hrefLength: number })
    | undefined;

  function visit(
    routes: NavRoute[],
    inheritedPermission?: PermissionRequirement,
    inheritedModule?: ProductKey,
  ) {
    for (const route of routes) {
      const requiredPermission =
        route.requiredPermission ?? inheritedPermission;
      const requiredModule = route.module ?? inheritedModule;
      if (
        routeOwnsPath(route, pathname) &&
        (!best || route.href.length >= best.hrefLength)
      ) {
        best = {
          matched: true,
          module: requiredModule,
          requiredPermission,
          hrefLength: route.href.length,
        };
      }
      visit(route.children ?? [], requiredPermission, requiredModule);
    }
  }

  for (const group of NAV_GROUPS) {
    visit(group.routes, group.requiredPermission, group.module);
  }
  for (const group of HOME_NAV_GROUPS) {
    visit(group.routes, group.requiredPermission, group.module);
  }

  if (!best) return { matched: false };
  const { hrefLength: _hrefLength, ...access } = best;
  return access;
}

function getHomeNavGroups(
  role: string | undefined,
  permissions: string[] | undefined,
  enabledModules: string[],
): NavGroup[] {
  const isOwner = role === ROLES.OWNER;
  const granted = new Set(permissions ?? []);

  return HOME_NAV_GROUPS.map((group) => ({
    ...group,
    routes: group.routes.flatMap((route) =>
      filterRoute(
        route,
        isOwner,
        granted,
        enabledModules,
        group.requiredPermission,
      ),
    ),
  })).filter((group) => group.routes.length > 0);
}

export function getNavGroupsForProduct(
  productKey: ProductKey,
  role: string | undefined,
  permissions: string[] | undefined,
  enabledModules: string[] = [],
): NavGroup[] {
  if (productKey === "home")
    return getHomeNavGroups(role, permissions, enabledModules);

  const allGroups = getNavGroupsForUser(role, permissions, enabledModules);
  return allGroups.filter((group) => group.product === productKey);
}
