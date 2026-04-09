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
  Package,
  Share2,
  Video,
  Globe,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  /** Indented row for a key child route (e.g. Add employee under Employees). */
  isSubItem?: boolean;
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
            { label: "Add employee", icon: UserPlus, href: "/hr/employees/new", isSubItem: true },
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", isSubItem: true },
            { label: "Org chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },

            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            {label:"Billing", icon: Receipt, href: "/billing"},
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
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
            { label: "Distribute leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
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
            { label: "Email campaigns", icon: Mail, href: "/marketing/email-campaigns" },
            { label: "Digital marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
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
            { label: "Add employee", icon: UserPlus, href: "/hr/employees/new", isSubItem: true },
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", isSubItem: true },
            { label: "Org chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Recruitment", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
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
            { label: "Distribute leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
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
            { label: "Distribute leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "My Deals", icon: Handshake, href: "/crm/deals" },
            { label: "My Targets", icon: Trophy, href: "/crm/targets" },
            { label: "My Commissions", icon: DollarSign, href: "/sales/commissions" },
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My onboarding", icon: ClipboardList, href: "/onboarding", isSubItem: true },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
            { label: "My onboarding", icon: ClipboardList, href: "/onboarding", isSubItem: true },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
            { label: "Email campaigns", icon: Mail, href: "/marketing/email-campaigns" },
            { label: "Digital marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "My onboarding", icon: ClipboardList, href: "/onboarding", isSubItem: true },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
            { label: "My onboarding", icon: ClipboardList, href: "/onboarding", isSubItem: true },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
            { label: "My onboarding", icon: ClipboardList, href: "/onboarding", isSubItem: true },
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];
  }
}
