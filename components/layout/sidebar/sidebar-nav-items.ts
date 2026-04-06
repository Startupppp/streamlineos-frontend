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
  BookOpen,
  Heart,
  UserMinus,
  Target,
  Megaphone,
  Mail,
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
          label: "HR",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Deal Approvals", icon: Briefcase, href: "/crm/deals/approvals" },
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
            { label: "Quotas", icon: Target, href: "/sales/quotas" },
            { label: "Commissions", icon: DollarSign, href: "/sales/commissions" },
            { label: "Customer Exec", icon: Handshake, href: "/customer-executive" },
          ],
        },
        {
          label: "Marketing",
          routes: [
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns" },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns" },
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
          label: "HR",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Analytics", icon: BarChart3, href: "/hr/analytics" },
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
            { label: "My Commissions", icon: DollarSign, href: "/sales/commissions" },
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
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
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
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
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns" },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns" },
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
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
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
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
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
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
          ],
        },
      ];
  }
}
