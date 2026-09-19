import { AlarmClock, Users, Receipt, Timer, BarChart3, ShieldCheck, ListChecks, SlidersHorizontal, ShieldAlert, Banknote } from "lucide-react";
import { buildOrganizationNavGroups } from "@/lib/build/build-nav-groups";
import type { NavGroup } from "./sidebar-nav-types";

const TIMESHEETS_NAV_GROUPS: NavGroup[] = [
{
    label: "Timesheets",
    product: "timesheets",
    module: "timesheets",
    requiredPermission: [
      "timesheets:entries:view",
      "timesheets:team:view",
      "timesheets:approvals:view",
      "timesheets:exceptions:view",
      "timesheets:billing:view",
      "timesheets:payroll:view",
      "timesheets:reports:view",
      "timesheets:settings:view",
      "timesheets:access:view",
    ],
    routes: [
      {
        label: "My Time",
        icon: Timer,
        href: "/timesheets",
        exact: true,
        requiredPermission: "timesheets:entries:view",
      },
      {
        label: "Team",
        icon: Users,
        href: "/timesheets/team",
        requiredPermission: "timesheets:team:view",
      },
      {
        label: "Approvals",
        icon: ListChecks,
        href: "/timesheets/approvals",
        requiredPermission: "timesheets:approvals:view",
      },
      {
        label: "Overdue",
        icon: AlarmClock,
        href: "/timesheets/overdue",
        requiredPermission: "timesheets:approvals:view",
      },
      {
        label: "Exceptions",
        icon: ShieldAlert,
        href: "/timesheets/exceptions",
        requiredPermission: "timesheets:exceptions:view",
      },
      {
        label: "Billing",
        icon: Receipt,
        href: "/timesheets/billing",
        requiredPermission: "timesheets:billing:view",
      },
      {
        label: "Payroll",
        icon: Banknote,
        href: "/timesheets/payroll",
        requiredPermission: "timesheets:payroll:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/timesheets/reports",
        requiredPermission: "timesheets:reports:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/timesheets/settings",
        requiredPermission: "timesheets:settings:view",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/timesheets/access",
        requiredPermission: "timesheets:access:view",
      },
    ],
  },
];

export const WORK_MANAGEMENT_NAV_GROUPS: NavGroup[] = [
  ...TIMESHEETS_NAV_GROUPS,
  ...buildOrganizationNavGroups(),
];
