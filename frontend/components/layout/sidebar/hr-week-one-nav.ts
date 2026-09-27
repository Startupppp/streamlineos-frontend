import type { NavGroup, NavRoute } from "./sidebar-nav-types";

/** Routes a brand-new HR org does not need until Settings → Advanced. */
const WEEK_ONE_HIDDEN_LABELS = new Set([
  "Compensation & Benefits",
  "Performance",
  "Assets",
  "Workforce",
  "HR operations",
  "Compliance & Risk",
  "Access & governance",
  "Exit Management",
  "People analytics",
  "HR access",
]);

const WEEK_ONE_HIDDEN_CHILD_HREFS = new Set([
  "/hr/employees/skills-matrix",
  "/hr/employees/find-expert",
  "/hr/employees/manager-coverage",
  "/hr/employees/reporting-requests",
  "/hr/employees/reporting-changes",
  "/hr/org",
  "/hr/positions",
  "/hr/rosters",
  "/hr/overtime",
  "/hr/geofencing",
  "/hr/biometric",
  "/hr/devices",
  "/hr/work-logs",
  "/hr/handbook",
  "/hr/background-verification",
]);

function trimChildren(route: NavRoute): NavRoute {
  if (!route.children?.length) return route;
  const children = route.children.filter((child) => !WEEK_ONE_HIDDEN_CHILD_HREFS.has(child.href));
  return { ...route, children: children.length > 0 ? children : undefined };
}

/** Hide enterprise HR nav until the admin turns on Advanced in HR settings. */
export function applyHrWeekOneNav(groups: NavGroup[], showAdvanced: boolean): NavGroup[] {
  if (showAdvanced) return groups;
  return groups.map((group) => ({
    ...group,
    routes: group.routes
      .filter((route) => !WEEK_ONE_HIDDEN_LABELS.has(route.label))
      .map(trimChildren),
  }));
}
