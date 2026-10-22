import {
  LayoutDashboard,
  Briefcase,
  Clock,
  CalendarDays,
  FileText,
  Contact2,
  MessageSquareText,
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
        inactivePrefixes: [
          "/calendar/settings",
        ],
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
        hideForOwner: true,
      },
      {
        label: "Attendance & Time Off",
        href: "/me/workday",
        searchTerms: ["attendance", "time off", "leave", "work from home"],
        modulesAny: ["hrms"],
        icon: Clock,
        badge: "leaves" as const,
        hideForOwner: true,
      },
      {
        label: "Documents & Onboarding",
        href: "/me/records",
        searchTerms: ["my documents", "onboarding", "employee files"],
        icon: FileText,
      },
      {
        label: "Expenses & Pay",
        href: "/me/money",
        searchTerms: ["expenses", "pay", "payslips", "reimbursements"],
        modulesAny: ["hrms", "payroll"],
        icon: Receipt,
        hideForOwner: true,
      },
      {
        label: "Hiring & Referrals",
        href: "/me/career",
        searchTerms: ["interviews", "job openings", "recruitment", "referrals"],
        modulesAny: ["hrms"],
        icon: Briefcase,
        hideForOwner: true,
      },
      {
        label: "Resignation",
        href: "/me/resignation",
        modulesAny: ["hrms"],
        icon: LogOut,
        hideForOwner: true,
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
