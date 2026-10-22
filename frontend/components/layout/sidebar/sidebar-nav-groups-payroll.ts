import { LayoutDashboard, Users, Clock, FileText, IndianRupee, BarChart3, ShieldCheck, Award, FileCheck, Coins, Landmark, RefreshCcw, SlidersHorizontal, LayoutTemplate, Calculator, PlayCircle, ListChecks } from "lucide-react";
import type { NavGroup, NavRoute } from "./sidebar-nav-types";

const PAYROLL_ROUTES: NavRoute[] = [
  {
    label: "Team Payroll",
    icon: Users,
    href: "/payroll/team",
    requiredPermission: "self:payroll",
  },
  {
    label: "Payroll home",
    icon: LayoutDashboard,
    href: "/payroll",
    exact: true,
    requiredPermission: "payroll:runs:view",
  },
  {
    label: "Before you run payroll",
    icon: ListChecks,
    href: "/payroll/readiness",
    requiredPermission: "payroll:runs:view",
  },
  {
    label: "Run Payroll",
    icon: PlayCircle,
    href: "/payroll/runs",
    requiredPermission: "payroll:runs:view",
  },
  {
    label: "Employees",
    icon: Users,
    href: "/payroll/employees",
    requiredPermission: "payroll:salaries:view",
  },
  {
    label: "Salary Structures",
    icon: IndianRupee,
    href: "/payroll/salary-structures",
    requiredPermission: "hr:salary:view",
  },
  {
    label: "Templates",
    icon: LayoutTemplate,
    href: "/payroll/templates",
    requiredPermission: "payroll:templates:view",
  },
  {
    label: "Components",
    icon: SlidersHorizontal,
    href: "/payroll/components",
    requiredPermission: "payroll:components:view",
  },
  {
    label: "Attendance Inputs",
    icon: Clock,
    href: "/payroll/inputs",
    requiredPermission: "hr:payroll:view",
  },
  {
    label: "Reimbursements",
    icon: RefreshCcw,
    href: "/payroll/reimbursements",
    requiredPermission: "hr:payroll:view",
  },
  {
    label: "Bonuses & Incentives",
    icon: Award,
    href: "/payroll/bonuses",
    requiredPermission: "hr:payroll:view",
  },
  {
    label: "Loans & Advances",
    icon: Coins,
    href: "/payroll/loans",
    requiredPermission: "hr:payroll:view",
  },
  {
    label: "Taxes & Statutory",
    icon: Calculator,
    href: "/payroll/taxes",
    requiredPermission: "payroll:tax:view",
  },
  {
    label: "Bank Transfers",
    icon: Landmark,
    href: "/payroll/bank-transfers",
    requiredPermission: "payroll:bank:manage",
  },
  {
    label: "Payslips",
    icon: FileText,
    href: "/payroll/payslips",
    requiredPermission: "payroll:payslips:view",
  },
  {
    label: "Final settlement",
    icon: FileCheck,
    href: "/payroll/fnf",
    requiredPermission: "payroll:fnf:view",
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/payroll/reports",
    requiredPermission: "payroll:reports:view",
  },
  {
    label: "Access",
    icon: ShieldCheck,
    href: "/payroll/access",
    requiredPermission: "payroll:access:view",
  },
  {
    label: "Settings",
    icon: SlidersHorizontal,
    href: "/payroll/settings",
    requiredPermission: "payroll:settings:manage",
    children: [
      {
        label: "Policy",
        icon: SlidersHorizontal,
        href: "/payroll/settings",
        exact: true,
        requiredPermission: "payroll:settings:manage",
      },
      {
        label: "Export",
        icon: FileText,
        href: "/payroll/settings/import-export",
        requiredPermission: "payroll:reports:view",
      },
    ],
  },
];

function routesFor(hrefs: readonly string[]): NavRoute[] {
  return hrefs.flatMap((href) => PAYROLL_ROUTES.filter((route) => route.href === href));
}

// Four short groups instead of one flat list of nineteen: run it, set up
// salaries, pay out and report, configure. Each route keeps its own permission,
// so regrouping changes no route gate.
const PAYROLL_GROUP_BASE = {
  module: "payroll",
  requiredPermission: ["payroll:runs:view", "payroll:salaries:view", "self:payroll"],
} satisfies Omit<NavGroup, "label" | "routes">;

export const PAYROLL_NAV_GROUPS: NavGroup[] = [
  {
    ...PAYROLL_GROUP_BASE,
    label: "Payroll",
    routes: routesFor(["/payroll/team", "/payroll", "/payroll/readiness", "/payroll/runs", "/payroll/inputs"]),
  },
  {
    ...PAYROLL_GROUP_BASE,
    label: "Salaries",
    routes: routesFor([
      "/payroll/employees",
      "/payroll/salary-structures",
      "/payroll/templates",
      "/payroll/components",
      "/payroll/reimbursements",
      "/payroll/bonuses",
      "/payroll/loans",
    ]),
  },
  {
    ...PAYROLL_GROUP_BASE,
    label: "Payslips & reports",
    routes: routesFor(["/payroll/taxes", "/payroll/bank-transfers", "/payroll/payslips", "/payroll/fnf", "/payroll/reports"]),
  },
  {
    ...PAYROLL_GROUP_BASE,
    label: "Payroll settings",
    routes: routesFor(["/payroll/access", "/payroll/settings"]),
  },
];
