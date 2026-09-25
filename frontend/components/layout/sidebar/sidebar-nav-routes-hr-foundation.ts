import { LayoutDashboard, Users, Clock, CalendarCheck, CalendarDays, FileText, Timer, BarChart3, Network, ClipboardList, ClipboardCheck, Map, RefreshCcw, History, Building2, Search, Grid3X3, LayoutGrid, Smartphone, UserCheck } from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_FOUNDATION_ROUTES: NavRoute[] = [
{
        label: "Overview",
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
        label: "Approvals",
        icon: ClipboardCheck,
        href: "/hr/approvals",
        // V-044 / V-042. /hr/approvals is the single HR approvals queue and now
        // lists leave requests too, which are routed to a holder of
        // hr:leaves:approve — a BRANCH_HR or HR_ADMIN who is nobody's manager.
        // Gated on hr:workflows:approve alone, that approver was bounced to
        // /access-denied and never reached their own queue.
        requiredPermission: ["hr:workflows:approve", "hr:leaves:approve"],
      },
{
        label: "People",
        icon: Users,
        href: "/hr/employees",
        requiredPermission: "hr:employees:view",
        children: [
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
          {
            label: "Org Chart",
            icon: Network,
            href: "/hr/org-chart",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Manager coverage",
            icon: UserCheck,
            href: "/hr/employees/manager-coverage",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Job Architecture",
            icon: Building2,
            href: "/hr/org",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Positions",
            icon: Network,
            href: "/hr/positions",
            requiredPermission: "hr:positions:view",
          },
          {
            label: "Onboarding",
            icon: ClipboardList,
            href: "/hr/onboarding",
            exact: true,
            requiredPermission: "hr:onboarding:manage",
          },
        ],
      },
{
        label: "Attendance",
        icon: Clock,
        href: "/hr/attendance",
        requiredPermission: "hr:attendance:view",
        children: [
          {
            label: "Shifts",
            icon: CalendarDays,
            href: "/hr/shifts",
            requiredPermission: "hr:attendance:manage",
          },
          {
            label: "Rosters",
            icon: LayoutGrid,
            href: "/hr/rosters",
            requiredPermission: "hr:attendance:manage",
          },
          {
            label: "Overtime",
            icon: Timer,
            href: "/hr/overtime",
            requiredPermission: "hr:attendance:view",
          },
          {
            label: "Geofencing",
            icon: Map,
            href: "/hr/geofencing",
            requiredPermission: "hr:attendance:manage",
          },
          {
            label: "Biometric",
            icon: Smartphone,
            href: "/hr/biometric",
            requiredPermission: "hr:attendance:manage",
          },
          {
            label: "Time Clock Devices",
            icon: Clock,
            href: "/hr/devices",
            requiredPermission: "hr:biometric:manage",
          },
          {
            label: "Work Logs",
            icon: History,
            href: "/hr/work-logs",
            requiredPermission: ["hr:attendance:view", "self:attendance"],
          },
        ],
      },
{
        label: "Leave",
        icon: CalendarCheck,
        href: "/hr/leaves",
        badge: "leaves" as const,
        requiredPermission: ["self:leaves", "hr:leaves:view"],
        children: [
          {
            label: "Policies",
            icon: FileText,
            href: "/hr/leave-policies",
            requiredPermission: "hr:leaves:manage",
          },
          {
            label: "Holiday Calendar",
            icon: CalendarDays,
            href: "/hr/holidays",
            requiredPermission: "self:attendance",
          },
          {
            label: "Comp-off",
            icon: RefreshCcw,
            href: "/hr/comp-off",
            requiredPermission: "hr:leaves:view",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            href: "/hr/leaves/analytics",
            requiredPermission: "hr:leaves:view",
          },
        ],
      },
];
