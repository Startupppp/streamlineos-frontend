import type { NavGroup, NavRoute } from "../sidebar/sidebar-nav-items";

export const MAX_MOBILE_MODULE_TABS = 5;

export const MOBILE_MODULE_CONTENT_PADDING_CLASS =
  "pb-[calc(4rem+env(safe-area-inset-bottom))]";

export function getMobileModuleBottomTabs(
  navGroups: NavGroup[],
  maxTabs: number = MAX_MOBILE_MODULE_TABS,
): NavRoute[] {
  const tabs: NavRoute[] = [];
  const seen = new Set<string>();

  for (const group of navGroups) {
    for (const route of group.routes) {
      if (seen.has(route.href)) continue;
      seen.add(route.href);
      tabs.push(route);
      if (tabs.length >= maxTabs) return tabs;
    }
  }

  return tabs;
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
