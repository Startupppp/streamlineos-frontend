import {
  LayoutDashboard,
  Briefcase,
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  FileText,
  Contact2,
  MessageSquareText,
  Wallet,
  ListChecks,
  Inbox,
  Video,
  Megaphone,
  BellDot,
  LifeBuoy,
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
        inactivePrefixes: ["/calendar/settings"],
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
        label: "Time Off",
        href: "/me/time-off",
        icon: CalendarCheck,
        badge: "leaves" as const,
      },
      {
        label: "Attendance",
        href: "/me/attendance",
        icon: Clock,
      },
      {
        label: "Expenses",
        href: "/me/expenses",
        icon: Receipt,
      },
      {
        label: "Pay",
        href: "/me/pay",
        icon: Wallet,
      },
      {
        label: "My Documents",
        href: "/me/documents",
        icon: FileText,
      },
      {
        label: "Onboarding Tasks",
        href: "/me/onboarding",
        icon: ListChecks,
      },
      {
        label: "Recruitment",
        href: "/me/recruitment",
        icon: Video,
      },
      {
        label: "Job Openings",
        href: "/me/job-openings",
        icon: Briefcase,
      },
      {
        label: "My Referrals",
        href: "/me/referrals",
        icon: Contact2,
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
