import type { NavGroup } from "./sidebar-nav-types";
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

export const HR_NAV_GROUPS: NavGroup[] = [
  {
    label: "HR Overview",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:employees:view",
      "hr:attendance:view",
      "hr:leaves:view",
      "hr:workflows:approve",
      "hr:leaves:approve",
    ],
    routes: HR_OVERVIEW_ROUTES,
  },
  {
    label: "HR People",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:employees:view",
      "hr:positions:view",
      "hr:reporting-lines:review",
      "hr:reporting-lines:manage",
    ],
    routes: HR_PEOPLE_ROUTES,
  },
  {
    label: "Lifecycle",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:onboarding:manage",
      "hr:exit:view",
      "hr:exit:manage",
      "hr:payroll:approve",
      "hr:assets:view",
    ],
    routes: HR_LIFECYCLE_ROUTES,
  },
  {
    label: "Time",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:attendance:view",
      "hr:attendance:manage",
      "hr:leaves:view",
      "hr:leaves:manage",
      "hr:biometric:manage",
      "self:leaves",
      "self:attendance",
    ],
    routes: HR_TIME_ROUTES,
  },
  {
    label: "Documents",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:documents:view",
      "hr:documents:manage",
      "hr:email-templates:manage",
      "hr:sensitive:view",
    ],
    routes: HR_DOCUMENTS_ROUTES,
  },
  {
    label: "People Ops",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:cases:view",
      "hr:helpdesk:view",
      "hr:engagement:view",
      "hr:accommodations:view",
      "hr:expenses:view",
      "hr:expenses:manage",
      "hr:payroll:view",
      "hr:benefits:view",
      "hr:compensation:manage",
      "hr:equity:view",
    ],
    routes: HR_PEOPLE_OPS_ROUTES,
  },
  {
    label: "Insights",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:analytics:read",
      "hr:contracts:view",
      "hr:performance:manage",
      "hr:performance:view",
      "hr:feedback:view",
    ],
    routes: HR_INSIGHTS_ROUTES,
  },
  {
    label: "Settings",
    product: "hrms",
    module: "hrms",
    requiredPermission: [
      "hr:policies:view",
      "hr:identity:view",
      "hr:access:view",
      "hr:compliance:manage",
    ],
    routes: HR_SETTINGS_ROUTES,
  },
];
