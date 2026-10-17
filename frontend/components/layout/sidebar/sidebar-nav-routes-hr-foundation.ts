import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ClipboardList,
  Network,
  Building2,
  Search,
  Grid3X3,
  UserCheck,
  MessageSquareWarning,
  Shuffle,
  UserMinus,
  UserX,
  FileCheck,
  Package,
  PackageMinus,
} from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_OVERVIEW_ROUTES: NavRoute[] = [
  {
    label: "Hub",
    icon: LayoutDashboard,
    href: "/hr",
    exact: true,
    requiredPermission: [
      "hr:employees:view",
      "hr:attendance:view",
      "hr:leaves:view",
    ],
  },
  {
    label: "Action Center",
    icon: ClipboardCheck,
    href: "/hr/approvals",
    searchTerms: ["approvals", "queue", "exceptions"],
    // V-044 / V-042. /hr/approvals is the single HR approvals queue and now
    // lists leave requests too, which are routed to a holder of
    // hr:leaves:approve — a BRANCH_HR or HR_ADMIN who is nobody's manager.
    // Gated on hr:workflows:approve alone, that approver was bounced to
    // /access-denied and never reached their own queue.
    requiredPermission: ["hr:workflows:approve", "hr:leaves:approve"],
  },
];

export const HR_PEOPLE_ROUTES: NavRoute[] = [
  {
    label: "People",
    icon: Users,
    href: "/hr/employees",
    requiredPermission: "hr:employees:view",
    children: [
      {
        label: "Org Chart",
        icon: Network,
        href: "/hr/org-chart",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Positions",
        icon: Network,
        href: "/hr/positions",
        requiredPermission: "hr:positions:view",
      },
      {
        label: "Job Architecture",
        icon: Building2,
        href: "/hr/org",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Manager coverage",
        icon: UserCheck,
        href: "/hr/employees/manager-coverage",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Reporting requests",
        icon: MessageSquareWarning,
        href: "/hr/employees/reporting-requests",
        requiredPermission: "hr:reporting-lines:review",
      },
      {
        label: "Reporting changes",
        icon: Shuffle,
        href: "/hr/employees/reporting-changes",
        requiredPermission: "hr:reporting-lines:manage",
      },
      {
        label: "Skills Matrix",
        icon: Grid3X3,
        href: "/hr/employees/skills-matrix",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Find Expert",
        icon: Search,
        href: "/hr/employees/find-expert",
        requiredPermission: "hr:employees:view",
      },
    ],
  },
];

export const HR_LIFECYCLE_ROUTES: NavRoute[] = [
  {
    label: "Onboarding",
    icon: ClipboardList,
    href: "/hr/onboarding",
    exact: true,
    requiredPermission: "hr:onboarding:manage",
  },
  {
    label: "Exit",
    icon: UserMinus,
    href: "/hr/exit",
    requiredPermission: "hr:exit:view",
    children: [
      {
        label: "Final settlement",
        icon: FileCheck,
        href: "/hr/fnf",
        requiredPermission: "hr:payroll:approve",
      },
      {
        label: "Termination",
        icon: UserX,
        href: "/hr/termination",
        requiredPermission: "hr:exit:manage",
      },
      {
        label: "Asset Returns",
        icon: PackageMinus,
        href: "/hr/asset-returns",
        requiredPermission: "hr:assets:view",
      },
    ],
  },
  {
    label: "Assets",
    icon: Package,
    href: "/hr/assets",
    requiredPermission: "hr:assets:view",
  },
];
