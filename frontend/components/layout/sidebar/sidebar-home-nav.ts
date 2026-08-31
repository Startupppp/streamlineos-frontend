import { LayoutDashboard, Briefcase, Clock, CalendarCheck, CalendarDays, Receipt, FileText, Contact2, MessageSquareText, Wallet, Bell, ListChecks, Inbox, Video, Megaphone, BellDot } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const HOME_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    product: "home",
    routes: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Communication",
    product: "home",
    routes: [
      {
        label: "Inbox",
        href: "/inbox",
        icon: BellDot,
      },
      {
        label: "Mail",
        href: "/mail",
        icon: Inbox,
        requiredPermission: "mail:inbox:view",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        requiredPermission: "calendar:read",
        inactivePrefixes: ["/calendar/settings"],
      },
      {
        label: "Chat",
        href: "/chat",
        icon: MessageSquareText,
        requiredPermission: "chat:channels:read",
        inactivePrefixes: ["/chat/settings", "/chat/moderation"],
      },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "For Me",
    product: "home",
    routes: [
      {
        label: "Time Off",
        href: "/me/time-off",
        icon: CalendarCheck,
        badge: "leaves" as const,
        requiredPermission: "self:leaves",
        module: "hrms",
      },
      {
        label: "Attendance",
        href: "/me/attendance",
        icon: Clock,
        requiredPermission: "self:attendance",
        module: "hrms",
      },
      {
        label: "Expenses",
        href: "/me/expenses",
        icon: Receipt,
        requiredPermission: "self:expenses",
        module: "hrms",
      },
      {
        label: "Pay",
        href: "/me/pay",
        icon: Wallet,
        requiredPermission: ["self:payroll", "self:payslips"],
        module: "payroll",
      },
      {
        label: "My Documents",
        href: "/me/documents",
        icon: FileText,
        requiredPermission: "self:onboarding-docs",
        module: "hrms",
      },
      {
        label: "Onboarding Tasks",
        href: "/me/onboarding",
        icon: ListChecks,
        requiredPermission: "self:onboarding-tasks",
        module: "hrms",
      },
      {
        label: "Recruitment",
        href: "/me/recruitment",
        icon: Video,
        requiredPermission: "self:recruitment",
        module: "hrms",
      },
    ],
  },
  {
    label: "Company",
    product: "home",
    routes: [
      {
        label: "Announcements",
        href: "/hr/announcements",
        icon: Megaphone,
      },
      {
        label: "People",
        href: "/directory",
        icon: Contact2,
        requiredPermission: "directory:people:view",
        exact: true,
        activePrefixes: ["/directory/"],
        inactivePrefixes: ["/directory/workers"],
      },
      {
        label: "Workers",
        href: "/directory/workers",
        icon: Briefcase,
        requiredPermission: "directory:workers:view",
        modulesAny: ["hrms", "payroll"],
      },
    ],
  },
];
