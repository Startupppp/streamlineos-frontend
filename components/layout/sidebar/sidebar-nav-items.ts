/**
 * Role-based navigation configuration.
 *
 * Pure data/logic module — no React, no JSX.
 * Import icons from lucide-react and define all nav groups here so the
 * sidebar component stays slim and this file can be tested in isolation.
 */

import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  FileText,
  Laptop,
  Timer,
  UserPlus,
  QrCode,
  DollarSign,
  Handshake,
  Contact2,
  Trophy,
  BarChart3,
  UserCheck,
  Network,
  ClipboardList,
  MessageSquareText,
  Shield,
  ShieldCheck,
  CreditCard,
  Wallet,
  Star,
  HeadphonesIcon,
  UserSearch,
  TrendingUp,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
}

/**
 * Role-based sidebar navigation.
 * Each role gets EXACTLY what they should see — nothing more.
 */
export function getNavGroupsForRole(role: string | undefined): NavGroup[] {
  if (!role) return [];

  switch (role) {
    case "CEO":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
          ],
        },
        {
          label: "HR Management",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Work Logs", icon: ClipboardList, href: "/hr/work-logs" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Incentives", icon: TrendingUp, href: "/hr/incentives" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          label: "Dashboards",
          routes: [
            { label: "Sales", icon: DollarSign, href: "/sales" },
            { label: "Customer Exec", icon: Handshake, href: "/customer-executive" },
          ],
        },
        {
          label: "Projects",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
            { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log" },
          ],
        },
      ];

    case "HR":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
          ],
        },
        {
          label: "HR Management",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Onboarding", icon: UserPlus, href: "/hr/onboarding" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Work Logs", icon: ClipboardList, href: "/hr/work-logs" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Incentives", icon: TrendingUp, href: "/hr/incentives" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          label: "Projects",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
          ],
        },
        // {
        //   label: "Support",
        //   routes: [
        //     { label: "Tickets", icon: Ticket, href: "/support" },
        //   ],
        // },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
          ],
        },
      ];

    case "SALES":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Sales Hub", icon: BarChart3, href: "/sales" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Leads", icon: Contact2, href: "/crm/leads" },
            { label: "My Deals", icon: Handshake, href: "/crm/deals" },
            { label: "My Targets", icon: Trophy, href: "/crm/targets" },
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    case "CUSTOMER_SUPPORT":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Support Hub", icon: BarChart3, href: "/customer-executive" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    case "DIGITAL_MARKETING":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Marketing Hub", icon: BarChart3, href: "/marketing" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];

    default:
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            // { label: "Tickets", icon: Ticket, href: "/support" },
            // { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
          ],
        },
      ];
  }
}
