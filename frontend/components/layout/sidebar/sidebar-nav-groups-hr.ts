import type { NavGroup } from "./sidebar-nav-types";
import { HR_FOUNDATION_ROUTES } from "./sidebar-nav-routes-hr-foundation";
import { HR_EMPLOYEE_EXPERIENCE_ROUTES } from "./sidebar-nav-routes-hr-employee-experience";
import { HR_GOVERNANCE_ROUTES } from "./sidebar-nav-routes-hr-governance";
import { HR_SETTINGS_ROUTES } from "./sidebar-nav-routes-hr-settings";

export const HR_NAV_GROUPS: NavGroup[] = [
{
    label: "HR – People",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:employees:view",
      "hr:attendance:view",
      "hr:leaves:view",
    ],
    routes: [
      ...HR_FOUNDATION_ROUTES,
      ...HR_EMPLOYEE_EXPERIENCE_ROUTES,
      ...HR_GOVERNANCE_ROUTES,
      ...HR_SETTINGS_ROUTES,
    ],
  },
];
