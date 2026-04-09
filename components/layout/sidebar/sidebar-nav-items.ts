/**
 * Role-based navigation configuration.
 * Pure data/logic module — no React, no JSX.
 */

import {
  LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays,
  Receipt, FileText, Laptop, Timer, UserPlus, QrCode, DollarSign, Handshake,
  Contact2, Trophy, BarChart3, UserCheck, Network, ClipboardList, MessageSquareText,
  Shield, ShieldCheck, CreditCard, Wallet, Star, HeadphonesIcon, UserSearch,
  TrendingUp, BookOpen, Heart, UserMinus, Target, Megaphone, Mail, Package,
  Share2, Video, Globe,
  // New icons for missing routes
  Bell, GraduationCap, ClipboardCheck, PackageMinus, Gift, Award, Scale,
  MailOpen, Smile, FileCheck, Coins, Map, Landmark, RefreshCcw, Zap,
  ListChecks, PartyPopper, History, BarChart2, LifeBuoy, Inbox,
  GitBranch, Building2, UserCog, SlidersHorizontal,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  isSubItem?: boolean;
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
  /** Start collapsed by default */
  defaultCollapsed?: boolean;
}

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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "HR – People",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Add Employee", icon: UserPlus, href: "/hr/employees/new", isSubItem: true },
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", isSubItem: true },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            // Support is managed through HR – ticket system below helpdesk
            { label: "Support Tickets", icon: LifeBuoy, href: "/support", isSubItem: true },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates" },
            { label: "HR Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "HR – Growth",
          defaultCollapsed: true,
          routes: [
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Assessments", icon: ClipboardCheck, href: "/hr/assessments" },
            { label: "Certifications", icon: Award, href: "/hr/certifications" },
            { label: "Skills", icon: Zap, href: "/hr/skills" },
            { label: "Learning Paths", icon: Map, href: "/hr/learning-paths" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "eNPS", icon: Smile, href: "/hr/enps" },
            { label: "Surveys", icon: ListChecks, href: "/hr/surveys" },
            { label: "Team Events", icon: PartyPopper, href: "/hr/team-events" },
            { label: "Alumni", icon: GraduationCap, href: "/hr/alumni" },
          ],
        },
        {
          label: "HR – Compensation",
          defaultCollapsed: true,
          routes: [
            { label: "Bonuses", icon: Gift, href: "/hr/bonuses" },
            { label: "Incentives", icon: Coins, href: "/hr/incentives" },
            { label: "Loans", icon: Landmark, href: "/hr/loans" },
            { label: "Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Full & Final", icon: FileCheck, href: "/hr/fnf" },
            { label: "Background Check", icon: ShieldCheck, href: "/hr/background-verification" },
            { label: "Compliance", icon: Scale, href: "/hr/compliance" },
          ],
        },
        {
          label: "Recruitment",
          routes: [
            { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Resignation", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Deal Approvals", icon: Briefcase, href: "/crm/deals/approvals", isSubItem: true },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "CRM Reports", icon: BarChart2, href: "/crm/reports" },
          ],
        },
        {
          label: "CRM Settings",
          defaultCollapsed: true,
          routes: [
            { label: "Assignment Rules", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules" },
            { label: "Email Templates", icon: MailOpen, href: "/crm/settings/email-templates" },
            { label: "Scoring Rules", icon: Star, href: "/crm/settings/scoring-rules" },
            { label: "SLA Rules", icon: Clock, href: "/crm/settings/sla" },
          ],
        },
        {
          label: "Finance",
          routes: [
            { label: "Billing", icon: CreditCard, href: "/billing" },
            { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true },
            { label: "Sales", icon: BarChart3, href: "/sales" },
            { label: "Quotas", icon: Target, href: "/sales/quotas", isSubItem: true },
            { label: "Commissions", icon: DollarSign, href: "/sales/commissions", isSubItem: true },
            { label: "Customer Exec", icon: Handshake, href: "/customer-executive" },
          ],
        },
        {
          label: "Marketing",
          defaultCollapsed: true,
          routes: [
            { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true },
            { label: "Digital Marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Timesheets", icon: Timer, href: "/timesheets" },
            { label: "Team Timesheets", icon: Users, href: "/timesheets/team", isSubItem: true },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true },
            { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
            { label: "Branches", icon: GitBranch, href: "/settings/branches", isSubItem: true },
            { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
            { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log" },
            { label: "API Keys", icon: Zap, href: "/settings/api-keys" },
            { label: "Reports", icon: BarChart2, href: "/reports" },
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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "HR – People",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Add Employee", icon: UserPlus, href: "/hr/employees/new", isSubItem: true },
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", isSubItem: true },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true },
            { label: "Devices", icon: Laptop, href: "/hr/devices" },
            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Support Tickets", icon: LifeBuoy, href: "/support", isSubItem: true },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates" },
            { label: "HR Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "HR – Growth",
          defaultCollapsed: true,
          routes: [
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Assessments", icon: ClipboardCheck, href: "/hr/assessments" },
            { label: "Certifications", icon: Award, href: "/hr/certifications" },
            { label: "Skills", icon: Zap, href: "/hr/skills" },
            { label: "Learning Paths", icon: Map, href: "/hr/learning-paths" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "eNPS", icon: Smile, href: "/hr/enps" },
            { label: "Surveys", icon: ListChecks, href: "/hr/surveys" },
            { label: "Team Events", icon: PartyPopper, href: "/hr/team-events" },
            { label: "Alumni", icon: GraduationCap, href: "/hr/alumni" },
          ],
        },
        {
          label: "HR – Compensation",
          defaultCollapsed: true,
          routes: [
            { label: "Bonuses", icon: Gift, href: "/hr/bonuses" },
            { label: "Incentives", icon: Coins, href: "/hr/incentives" },
            { label: "Loans", icon: Landmark, href: "/hr/loans" },
            { label: "Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Full & Final", icon: FileCheck, href: "/hr/fnf" },
            { label: "Background Check", icon: ShieldCheck, href: "/hr/background-verification" },
            { label: "Compliance", icon: Scale, href: "/hr/compliance" },
          ],
        },
        {
          label: "Recruitment",
          routes: [
            { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
            { label: "Training", icon: BookOpen, href: "/hr/training" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Resignation", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          label: "Finance",
          routes: [
            { label: "Billing", icon: CreditCard, href: "/billing" },
            { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Timesheets", icon: Timer, href: "/timesheets" },
            { label: "Team Timesheets", icon: Users, href: "/timesheets/team", isSubItem: true },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true },
            { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
            { label: "Branches", icon: GitBranch, href: "/settings/branches", isSubItem: true },
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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          // Lead & deal pipeline — Sales' primary workspace
          label: "My Pipeline",
          routes: [
            { label: "My Leads", icon: Contact2, href: "/crm/leads" },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "My Deals", icon: Handshake, href: "/crm/deals" },
            { label: "My Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {
          // Revenue tracking — view-only for sales execs
          label: "My Revenue",
          routes: [
            { label: "My Targets", icon: Trophy, href: "/crm/targets" },
            { label: "My Commissions", icon: DollarSign, href: "/sales/commissions" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Loans", icon: Landmark, href: "/hr/loans" },
            { label: "My Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Onboarding", icon: ClipboardList, href: "/onboarding" },
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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          // Primary workspace — helpdesk & ticket management
          label: "Helpdesk",
          routes: [
            { label: "All Tickets", icon: LifeBuoy, href: "/support" },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "Ticket Analytics", icon: BarChart2, href: "/crm/analytics" },
          ],
        },
        {
          // Read-only access to customer info (linked to tickets)
          label: "Customers",
          routes: [
            { label: "Contacts", icon: UserCheck, href: "/crm/contacts" },
            { label: "Clients", icon: Users, href: "/crm/clients" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Loans", icon: Landmark, href: "/hr/loans" },
            { label: "My Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Onboarding", icon: ClipboardList, href: "/onboarding" },
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
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          // Campaign creation & tracking
          label: "Marketing",
          routes: [
            { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true },
            { label: "Digital Marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
          ],
        },
        {
          // Limited CRM access — upload/track leads, view pipeline & conversion analytics
          label: "CRM (Leads)",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: TrendingUp, href: "/crm/leads" },
            { label: "Lead Analytics", icon: BarChart2, href: "/crm/analytics" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Loans", icon: Landmark, href: "/hr/loans" },
            { label: "My Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Onboarding", icon: ClipboardList, href: "/onboarding" },
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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "Support", icon: LifeBuoy, href: "/support" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Loans", icon: Landmark, href: "/hr/loans" },
            { label: "My Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Onboarding", icon: ClipboardList, href: "/onboarding" },
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
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Timesheets", icon: Timer, href: "/timesheets" },
            { label: "Support", icon: LifeBuoy, href: "/support" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Loans", icon: Landmark, href: "/hr/loans" },
            { label: "My Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements" },
            { label: "Onboarding", icon: ClipboardList, href: "/onboarding" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];
  }
}
