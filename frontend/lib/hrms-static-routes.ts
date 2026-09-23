import { HOME_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-home-nav";
import {
  flattenNavRoutes,
  NAV_GROUPS,
} from "@/components/layout/sidebar/sidebar-nav-items";

export const HRMS_ROUTE_ROOT = "/hr";

export const HRMS_SMOKE_EXCLUDED_PREFIXES: readonly string[] = [
  "/hr/recruitment",
  "/payroll",
];

const DYNAMIC_SEGMENT = /\[[^\]]*\]/;

function isUnderPrefix(href: string, prefix: string): boolean {
  return href === prefix || href.startsWith(`${prefix}/`);
}

export function isHrmsStaticSmokeRoute(href: string): boolean {
  if (!isUnderPrefix(href, HRMS_ROUTE_ROOT)) return false;
  if (DYNAMIC_SEGMENT.test(href)) return false;
  return !HRMS_SMOKE_EXCLUDED_PREFIXES.some((prefix) =>
    isUnderPrefix(href, prefix),
  );
}

export const HRMS_STATIC_ROUTES: readonly string[] = [
  ...new Set(
    flattenNavRoutes(
      [...NAV_GROUPS, ...HOME_NAV_GROUPS].flatMap((group) => group.routes),
    )
      .map((route) => route.href)
      .filter(isHrmsStaticSmokeRoute),
  ),
];
