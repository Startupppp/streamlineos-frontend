import {
  LayoutDashboard,
  Briefcase,
  Clock,
  CalendarDays,
  FileText,
  Contact2,
  MessageSquareText,
  ListChecks,
  Receipt,
  Inbox,
  Megaphone,
  BellDot,
  LifeBuoy,
  LogOut,
  Users,
} from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const HOME_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    product: "home",
    routes: [{ label: "Home", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Communication",
    product: "home",
    routes: [
      {
        label: "Inbox",
        href: "/inbox",
        icon: BellDot,
        badge: "inbox" as const,
      },
      {
        label: "Mail",
        href: "/mail",
        icon: Inbox,
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        inactivePrefixes: ["/calendar/settings", "/calendar/resource-approvals"],
      },
      {
        label: "Calendar resource approvals",
        href: "/calendar/resource-approvals",
        icon: ListChecks,
        requiredPermission: ["calendar:admin:manage", "hr:assets:manage", "inventory:warehouses:manage"],
      },
      {
        label: "Chat",
        href: "/chat",
        icon: MessageSquareText,
      },
    ],
  },
  {
    label: "For Me",
    product: "home",
    routes: [
      {
        label: "My Team",
        href: "/me/team",
        icon: Users,
      },
      {
        label: "Attendance & Time Off",
        href: "/me/workday",
        modulesAny: ["hrms"],
        icon: Clock,
        badge: "leaves" as const,
      },
      {
        label: "Documents & Onboarding",
        href: "/me/records",
        icon: FileText,
      },
      {
        label: "Pay & Expenses",
        href: "/me/money",
        modulesAny: ["hrms", "payroll"],
        icon: Receipt,
      },
      {
        label: "Career",
        href: "/me/career",
        modulesAny: ["hrms"],
        icon: Briefcase,
      },
      {
        label: "Resignation",
        href: "/me/resignation",
        modulesAny: ["hrms"],
        icon: LogOut,
      },
      {
        label: "Support",
        href: "/me/support",
        icon: LifeBuoy,
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
        modulesAny: ["hrms"],
        icon: Megaphone,
      },
      {
        label: "People",
        href: "/directory",
        icon: Contact2,
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
