import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileText,
  Timer,
  BarChart3,
  Map,
  RefreshCcw,
  History,
  LayoutGrid,
  Smartphone,
  FileCheck,
  FileSearch,
  BookOpen,
  MailOpen,
  ShieldCheck,
  LifeBuoy,
  Scale,
  Sparkles,
  HeartHandshake,
  Receipt,
  Globe,
  CheckSquare,
  Wallet,
  Coins,
  TrendingUp,
} from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_TIME_ROUTES: NavRoute[] = [
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
        label: "Leave types & policies",
        icon: FileText,
        href: "/hr/leave-policies",
        searchTerms: ["leave types", "leave policy", "leave policies", "accrual", "carry forward"],
        requiredPermission: "hr:leaves:manage",
      },
      {
        label: "Holiday Calendar",
        icon: CalendarDays,
        href: "/hr/holidays",
        searchTerms: ["holidays", "public holidays", "leave calendar"],
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
        searchTerms: ["leave analytics", "leave report", "absence trends"],
        requiredPermission: "hr:leaves:view",
      },
    ],
  },
  {
    label: "Time clocks",
    icon: Clock,
    href: "/hr/devices",
    searchTerms: ["devices", "biometric", "punch", "kiosk"],
    requiredPermission: "hr:biometric:manage",
    children: [
      {
        label: "Devices",
        icon: Clock,
        href: "/hr/devices",
        requiredPermission: "hr:biometric:manage",
      },
      {
        label: "Biometric",
        icon: Smartphone,
        href: "/hr/biometric",
        requiredPermission: "hr:attendance:manage",
      },
    ],
  },
];

export const HR_DOCUMENTS_ROUTES: NavRoute[] = [
  {
    label: "Documents",
    icon: FileText,
    href: "/hr/documents",
    requiredPermission: "hr:documents:view",
    children: [
      {
        label: "Doc Types",
        icon: FileCheck,
        href: "/hr/document-types",
        requiredPermission: "hr:documents:manage",
      },
      {
        label: "Doc Review",
        icon: FileSearch,
        href: "/hr/document-review",
        requiredPermission: "hr:documents:view",
      },
      {
        label: "Handbook",
        icon: BookOpen,
        href: "/hr/handbook",
        requiredPermission: "hr:documents:manage",
      },
      {
        label: "Email Templates",
        icon: MailOpen,
        href: "/hr/email-templates",
        requiredPermission: "hr:email-templates:manage",
      },
      {
        label: "Background Checks",
        icon: ShieldCheck,
        href: "/hr/background-verification",
        requiredPermission: "hr:sensitive:view",
      },
    ],
  },
];

export const HR_PEOPLE_OPS_ROUTES: NavRoute[] = [
  {
    label: "Cases",
    icon: Scale,
    href: "/hr/cases",
    requiredPermission: "hr:cases:view",
    children: [
      {
        label: "Employee support",
        icon: LifeBuoy,
        href: "/hr/helpdesk",
        requiredPermission: "hr:helpdesk:view",
      },
      {
        label: "Service Delivery",
        icon: LifeBuoy,
        href: "/hr/service-delivery",
        requiredPermission: ["hr:cases:view", "hr:helpdesk:view"],
      },
      {
        label: "Polls & engagement",
        icon: Sparkles,
        href: "/hr/engagement",
        requiredPermission: "hr:engagement:view",
      },
      {
        label: "Accommodations",
        icon: HeartHandshake,
        href: "/hr/accommodations",
        requiredPermission: "hr:accommodations:view",
      },
    ],
  },
  {
    label: "Expenses",
    icon: Receipt,
    href: "/hr/expenses",
    requiredPermission: "hr:expenses:view",
    children: [
      {
        label: "Travel",
        icon: Globe,
        href: "/hr/travel",
        exact: true,
        requiredPermission: "hr:travel:view",
      },
      {
        label: "Travel Approvals",
        icon: CheckSquare,
        href: "/hr/travel/approvals",
        requiredPermission: "hr:travel:manage",
      },
    ],
  },
  {
    label: "Compensation & Benefits",
    icon: Wallet,
    href: "/hr/benefits",
    requiredPermission: [
      "hr:benefits:view",
      "hr:compensation:manage",
      "hr:equity:view",
    ],
    children: [
      {
        label: "Compensation Planning",
        icon: Coins,
        href: "/hr/compensation-planning",
        requiredPermission: "hr:compensation:manage",
      },
      {
        label: "Equity & ESOP",
        icon: TrendingUp,
        href: "/hr/equity",
        requiredPermission: "hr:equity:view",
      },
    ],
  },
];
