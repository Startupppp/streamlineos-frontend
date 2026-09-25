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
import { isModuleEnabled, PRODUCT_MODULE_KEY } from "./sidebar-products";
import { matchesOrgModule } from "@/lib/org-module-keys";

type GrantedScopes = Readonly<Record<string, unknown>>;
type GrantedPredicate = (permissionKey: string) => boolean;

const grantedFrom =
  (scopes: GrantedScopes | undefined): GrantedPredicate =>
  (permissionKey) =>
    scopes !== undefined && permissionKey in scopes;
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
  isModuleEnabled,
  MODULE_ACCENTS,
  PRODUCT_DEFINITIONS,
  PRODUCT_DESCRIPTIONS,
  PRODUCT_MODULE_KEY,
} from "./sidebar-products";
export type { ModuleAccent, ProductDefinition } from "./sidebar-products";

export interface ProductPathException {
  prefix: string;
  product: ProductKey;
  reason: string;
}

/** Paths with no navigation entry to derive from. Longest prefix wins over these too. */
export const PRODUCT_PATH_EXCEPTIONS: ProductPathException[] = [
  { prefix: "/me", product: "home", reason: "Self-service index; only its children are navigable." },
  { prefix: "/knowledge", product: "documents", reason: "Knowledge index; nav lists /knowledge/chat and /knowledge/wiki." },
  { prefix: "/support/kb", product: "documents", reason: "Knowledge base served under the support prefix." },
  { prefix: "/sales", product: "crm", reason: "CRM operational surface with no nav entry." },
  { prefix: "/customer-executive", product: "crm", reason: "CRM operational surface with no nav entry." },
  { prefix: "/billing/invoices", product: "finance", reason: "The org's own customer invoicing, not platform billing." },
  { prefix: "/portal", product: "build", reason: "Client portal for delivery work." },
  { prefix: "/client-portal", product: "home", reason: "Portal surfaces a client sees outside a product." },
  { prefix: "/accept-invitation", product: "home", reason: "Portal surfaces a client sees outside a product." },
];

/** The root and any path the navigation does not own answer Home. */
const PRODUCT_FALLBACK: ProductKey = "home";

let productPrefixIndex: { prefix: string; product: ProductKey }[] | null = null;

function getProductPrefixIndex(): { prefix: string; product: ProductKey }[] {
  if (productPrefixIndex) return productPrefixIndex;
  const fromNavigation = [...NAV_GROUPS, ...HOME_NAV_GROUPS].flatMap((group) =>
    flattenNavRoutes(group.routes).map((route) => ({
      prefix: route.href,
      product: group.product,
    })),
  );
  const fromExceptions = PRODUCT_PATH_EXCEPTIONS.map(({ prefix, product }) => ({
    prefix,
    product,
  }));
  productPrefixIndex = [...fromNavigation, ...fromExceptions].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  return productPrefixIndex;
}

export function getProductFromPathname(pathname: string): ProductKey {
  for (const entry of getProductPrefixIndex()) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`))
      return entry.product;
  }
  return PRODUCT_FALLBACK;
}

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
  granted: GrantedPredicate,
): boolean {
  if (!required) return true;
  const reqs = Array.isArray(required) ? required : [required];
  if (reqs.length === 0) return true;
  return reqs.some((p) => granted(p));
}

function isPlanLocked(product: ProductKey, lockedModules: string[]): boolean {
  const moduleKey = PRODUCT_MODULE_KEY[product];
  if (!moduleKey) return false;
  return matchesOrgModule(lockedModules, moduleKey);
}

function filterRoute(
  route: NavRoute,
  isOwner: boolean,
  granted: GrantedPredicate,
  enabledModules: string[],
  lockedModules: string[],
  inheritedPermission?: PermissionRequirement,
  inheritedLocked = false,
): NavRoute[] {
  const lockedByPlan =
    inheritedLocked ||
    (route.module !== undefined && isPlanLocked(route.module, lockedModules));

  if (route.module && !lockedByPlan && !isModuleEnabled(route.module, enabledModules))
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
      lockedModules,
      effectivePermission,
      lockedByPlan,
    ),
  );

  if (!isOwner && !matchesPermission(effectivePermission, granted)) {
    return children;
  }

  const resolved = lockedByPlan ? { ...route, locked: true } : route;
  return [
    children.length > 0
      ? { ...resolved, children }
      : { ...resolved, children: undefined },
  ];
}

export function filterNavGroupsForUser(
  groups: NavGroup[],
  role: string | undefined,
  scopes: GrantedScopes | undefined,
  enabledModules: string[] = [],
  lockedModules: string[] = [],
): NavGroup[] {
  if (!role) return [];

  const isOwner = role === ROLES.OWNER;
  const granted = grantedFrom(scopes);

  return groups.filter(
    (group) =>
      !group.module ||
      isPlanLocked(group.module, lockedModules) ||
      isModuleEnabled(group.module, enabledModules),
  )
    .map((group) => {
      const groupLocked =
        group.module !== undefined && isPlanLocked(group.module, lockedModules);
      const visibleRoutes = group.routes
        .flatMap((route) =>
          filterRoute(
            route,
            isOwner,
            granted,
            enabledModules,
            lockedModules,
            group.requiredPermission,
            groupLocked,
          ),
        );
      return { ...group, routes: visibleRoutes };
    })
    .filter((group) => group.routes.length > 0);
}

export function getNavGroupsForUser(
  role: string | undefined,
  scopes: GrantedScopes | undefined,
  enabledModules: string[] = [],
  lockedModules: string[] = [],
): NavGroup[] {
  return filterNavGroupsForUser(
    NAV_GROUPS,
    role,
    scopes,
    enabledModules,
    lockedModules,
  );
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
  // `(portal)` is a route group, so the invitation page answers `/accept-invitation` — not
  // `/portal/accept-invitation`, which only ever matched `(authenticated)/portal/[projectId]`.
  if (
    pathname.startsWith("/client-portal") ||
    pathname.startsWith("/accept-invitation")
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

export function resolveProductSidebarChrome({
  sessionReady,
  emptyNav,
  isWikiPath,
  isPortalPath,
}: {
  sessionReady: boolean;
  emptyNav: boolean;
  isWikiPath: boolean;
  isPortalPath: boolean;
}): { hideSidebar: boolean; showSidebarToggle: boolean } {
  const hideSidebar =
    sessionReady && (emptyNav || isWikiPath || isPortalPath);
  const showSidebarToggle =
    !sessionReady || isWikiPath || (!emptyNav && !isPortalPath);
  return { hideSidebar, showSidebarToggle };
}

function routeOwnsPath(route: NavRoute, pathname: string): boolean {
  if (pathname === route.href) return true;
  if (route.href === "/hr") return false;
  if (
    route.inactivePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) return false;
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
  scopes: GrantedScopes | undefined,
  enabledModules: string[],
  lockedModules: string[],
): NavGroup[] {
  const isOwner = role === ROLES.OWNER;
  const granted = grantedFrom(scopes);

  return HOME_NAV_GROUPS.map((group) => {
    const groupLocked =
      group.module !== undefined && isPlanLocked(group.module, lockedModules);
    return {
      ...group,
      routes: group.routes.flatMap((route) =>
        filterRoute(
          route,
          isOwner,
          granted,
          enabledModules,
          lockedModules,
          group.requiredPermission,
          groupLocked,
        ),
      ),
    };
  }).filter((group) => group.routes.length > 0);
}

export function getNavGroupsForProduct(
  productKey: ProductKey,
  role: string | undefined,
  scopes: GrantedScopes | undefined,
  enabledModules: string[] = [],
  lockedModules: string[] = [],
): NavGroup[] {
  if (productKey === "home")
    return getHomeNavGroups(role, scopes, enabledModules, lockedModules);

  const allGroups = getNavGroupsForUser(role, scopes, enabledModules, lockedModules);
  return allGroups.filter((group) => group.product === productKey);
}
