import type { NavGroup, NavRoute } from "../sidebar/sidebar-nav-items";

export const MAX_MOBILE_MODULE_TABS = 5;
export const MOBILE_PRIMARY_TABS_WHEN_OVERFLOW = 4;

export const MOBILE_MODULE_CONTENT_PADDING_CLASS =
  "pb-[calc(4rem+env(safe-area-inset-bottom))]";

export function getAllMobileModuleTabs(navGroups: NavGroup[]): NavRoute[] {
  const tabs: NavRoute[] = [];
  const seen = new Set<string>();
  for (const group of navGroups) {
    for (const route of group.routes) {
      if (seen.has(route.href)) continue;
      seen.add(route.href);
      tabs.push(route);
    }
  }
  return tabs;
}

function getPrimaryTabLimit(allCount: number, maxTabs: number): number {
  return allCount > maxTabs ? maxTabs - 1 : maxTabs;
}

export function getMobileModuleBottomTabs(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): NavRoute[] {
  const all = getAllMobileModuleTabs(navGroups);
  return all.slice(0, getPrimaryTabLimit(all.length, maxTabs));
}

export function getMobileModuleOverflowTabs(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): NavRoute[] {
  const all = getAllMobileModuleTabs(navGroups);
  if (all.length <= maxTabs) return [];
  return all.slice(getPrimaryTabLimit(all.length, maxTabs));
}

export function getOverflowTabsByGroup(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): { label: string; routes: NavRoute[] }[] {
  const overflowTabs = getMobileModuleOverflowTabs(navGroups, maxTabs);
  if (overflowTabs.length === 0) return [];
  const overflowHrefs = new Set(overflowTabs.map((r) => r.href));
  const result: { label: string; routes: NavRoute[] }[] = [];
  for (const group of navGroups) {
    const groupRoutes = group.routes.filter((r) => overflowHrefs.has(r.href));
    if (groupRoutes.length > 0)
      result.push({ label: group.label, routes: groupRoutes });
  }
  return result;
}

export function isMobileNavRouteActive(
  pathname: string,
  route: NavRoute,
  tabs: NavRoute[],
): boolean {
  if (route.exact || (route.children && route.children.length > 0)) {
    return pathname === route.href || pathname === `${route.href}/`;
  }

  const matches =
    pathname === route.href || pathname.startsWith(`${route.href}/`);
  if (!matches) return false;

  const longerMatch = tabs.some(
    (other) =>
      other.href !== route.href &&
      other.href.length > route.href.length &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
  return !longerMatch;
}

export function shouldShowMobileModuleBottomNav(
  navGroups: NavGroup[],
  options: { isChatRoute: boolean },
): boolean {
  if (options.isChatRoute) return false;
  return getMobileModuleBottomTabs(navGroups).length > 1;
}

export function getMobileModuleContentPaddingClassName(
  showModuleBottomNav: boolean,
): string | undefined {
  if (!showModuleBottomNav) return undefined;
  return MOBILE_MODULE_CONTENT_PADDING_CLASS;
}
