import type { NavGroup, NavRoute } from "./sidebar-nav-types";

export const HR_NAV_CHROME_KILLS: readonly string[] = [
  "/hr/service-delivery",
  "/hr/reimbursements",
  "/hr/simulator",
  "/hr/settings/company",
];

const CHROME_KILLS = new Set(HR_NAV_CHROME_KILLS);

export const HR_NAV_ADVANCED_HREFS: readonly string[] = [
  "/hr/assets",
  "/hr/expenses",
  "/hr/devices",
  "/hr/biometric",
  "/hr/employees/manager-coverage",
  "/hr/employees/reporting-requests",
  "/hr/employees/reporting-changes",
  "/hr/org",
  "/hr/rosters",
  "/hr/overtime",
  "/hr/geofencing",
  "/hr/work-logs",
  "/hr/handbook",
  "/hr/email-templates",
  "/hr/background-verification",
  "/hr/engagement",
  "/hr/accommodations",
  "/hr/compensation-planning",
  "/hr/equity",
  "/hr/workforce",
  "/hr/workforce-cost",
  "/hr/contingent",
  "/hr/performance",
  "/hr/performance/analytics",
  "/hr/goals",
  "/hr/kpis",
  "/hr/feedback",
  "/hr/compliance",
  "/hr/safety",
  "/hr/emergency",
  "/hr/labor-relations",
  "/hr/legal-holds",
  "/hr/retention",
  "/hr/event-stream",
];

const ADVANCED_HREFS = new Set(HR_NAV_ADVANCED_HREFS);

export function isHrNavChromeKilled(href: string): boolean {
  return CHROME_KILLS.has(href);
}

function isHidden(href: string, showAdvanced: boolean): boolean {
  if (CHROME_KILLS.has(href)) return true;
  return !showAdvanced && ADVANCED_HREFS.has(href);
}

function keepRoute(route: NavRoute, showAdvanced: boolean): NavRoute[] {
  if (isHidden(route.href, showAdvanced)) return [];
  if (!route.children?.length) return [route];
  const children = route.children.flatMap((child) => keepRoute(child, showAdvanced));
  return [{ ...route, children: children.length > 0 ? children : undefined }];
}

export function applyHrWeekOneNav(groups: NavGroup[], showAdvanced: boolean, isOrgOwner = true): NavGroup[] {
  const includeAdvanced = showAdvanced || !isOrgOwner;
  const visible = groups
    .map((group) => ({
      ...group,
      routes: group.routes.flatMap((route) => keepRoute(route, includeAdvanced)),
    }))
    .filter((group) => group.routes.length > 0);

  return visible;
}
