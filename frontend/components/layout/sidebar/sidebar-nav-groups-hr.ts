import type { NavGroup, NavRoute } from "./sidebar-nav-types";
import {
  HR_OVERVIEW_ROUTES,
  HR_PEOPLE_ROUTES,
  HR_LIFECYCLE_ROUTES,
} from "./sidebar-nav-routes-hr-foundation";
import {
  HR_TIME_ROUTES,
  HR_DOCUMENTS_ROUTES,
  HR_PEOPLE_OPS_ROUTES,
} from "./sidebar-nav-routes-hr-employee-experience";
import { HR_INSIGHTS_ROUTES } from "./sidebar-nav-routes-hr-governance";
import { HR_SETTINGS_ROUTES } from "./sidebar-nav-routes-hr-settings";

function routeFor(routes: NavRoute[], href: string): NavRoute {
  const route = routes.find((candidate) => candidate.href === href);
  if (!route) throw new Error(`Missing HR navigation route: ${href}`);
  return route;
}

export const HR_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    module: "hrms",
    routes: [
      ...HR_OVERVIEW_ROUTES,
      routeFor(HR_INSIGHTS_ROUTES, "/hr/analytics"),
    ],
  },
  {
    label: "People",
    module: "hrms",
    routes: [
      ...HR_PEOPLE_ROUTES,
      ...HR_LIFECYCLE_ROUTES,
      routeFor(HR_PEOPLE_OPS_ROUTES, "/hr/benefits"),
    ],
  },
  {
    label: "Time & Leave",
    module: "hrms",
    routes: HR_TIME_ROUTES,
  },
  {
    label: "Services",
    module: "hrms",
    routes: [
      ...HR_DOCUMENTS_ROUTES,
      routeFor(HR_PEOPLE_OPS_ROUTES, "/hr/cases"),
      routeFor(HR_PEOPLE_OPS_ROUTES, "/hr/expenses"),
    ],
  },
  {
    label: "Talent & Planning",
    module: "hrms",
    routes: [
      routeFor(HR_INSIGHTS_ROUTES, "/hr/performance"),
      routeFor(HR_INSIGHTS_ROUTES, "/hr/workforce"),
    ],
  },
  {
    label: "Settings",
    module: "hrms",
    routes: HR_SETTINGS_ROUTES,
  },
];
