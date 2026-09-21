import { LayoutDashboard, Users, Clock, FileText, IndianRupee, BarChart3, ShieldCheck, Award, FileCheck, Coins, Landmark, RefreshCcw, SlidersHorizontal, LayoutTemplate, Calculator, PlayCircle, ListChecks } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const PAYROLL_NAV_GROUPS: NavGroup[] = [
{
    label: "Payroll",
    product: "payroll",
    module: "payroll",
    requiredPermission: [
      "payroll:runs:view",
      "payroll:salaries:view",
      "self:payroll",
    ],
    routes: [
      {
        label: "Team Payroll",
        icon: Users,
        href: "/payroll/team",
        requiredPermission: "self:payroll",
      },
      {
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/payroll",
        exact: true,
        requiredPermission: "payroll:runs:view",
      },
      {
        label: "Readiness",
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
        requiredPermission: "hr:bonuses:manage",
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
        label: "FNF Settlement",
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
            label: "Import / Export",
            icon: FileText,
            href: "/payroll/settings/import-export",
            requiredPermission: "payroll:reports:view",
          },
        ],
      },
    ],
  },
];
