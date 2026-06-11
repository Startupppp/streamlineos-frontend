
import {
  LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays,
  Receipt, FileText, Laptop, Timer, DollarSign, Handshake,
  Contact2, Trophy, BarChart3, UserCheck, Network, ClipboardList, MessageSquareText,
  Shield, ShieldCheck, CreditCard, Wallet, Star, HeadphonesIcon, UserSearch,
  TrendingUp, BookOpen, Heart, UserMinus, Target, Megaphone, Mail, Package,
  Share2, Video, Globe,
  Bell, GraduationCap, ClipboardCheck, PackageMinus, Gift, Award, Scale,
  MailOpen, Smile, FileCheck, Coins, Map, Landmark, RefreshCcw, Zap,
  ListChecks, PartyPopper, History, BarChart2, LifeBuoy, Inbox,
  GitBranch, Building2, UserCog, SlidersHorizontal, UserX,
  Activity, FlaskConical, Sparkles, Brain, Copy, Search, ShieldAlert, Sliders,
  FormInput, CalendarRange, FileSearch, LayoutTemplate, Grid3X3, Calculator,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  isSubItem?: boolean;
  requiredPermission?: string | string[];
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
  defaultCollapsed?: boolean;
  requiredPermission?: string | string[];
}

const SELF_SERVICE: NavRoute[] = [
  { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves", requiredPermission: ["self:leaves", "hr:leaves:view"] },
  { label: "Expenses", icon: Receipt, href: "/hr/expenses", requiredPermission: ["self:expenses", "hr:expenses:view"] },
  { label: "Attendance", icon: Clock, href: "/hr/attendance", requiredPermission: ["self:attendance", "hr:attendance:view"] },
  { label: "Payslips", icon: Wallet, href: "/hr/my-payslips", requiredPermission: ["self:payslips", "hr:payroll:view"] },
  { label: "Onboarding Tasks", icon: ClipboardList, href: "/hr/onboarding/my-tasks", isSubItem: true, requiredPermission: ["self:attendance"] },
  { label: "Loans", icon: Landmark, href: "/hr/loans", requiredPermission: ["self:attendance"] },
  { label: "Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements", requiredPermission: ["self:expenses"] },
  { label: "Exit", icon: UserMinus, href: "/hr/exit", requiredPermission: ["self:attendance"] },
  { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk", requiredPermission: ["self:attendance"] },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core",
    routes: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "System Health", icon: Activity, href: "/dashboard/admin-health", requiredPermission: "settings:manage" },
      { label: "Branch Center", icon: Building2, href: "/dashboard/branches", requiredPermission: "settings:manage" },
      { label: "AI Hub", icon: Sparkles, href: "/ai", requiredPermission: "settings:manage" },
      { label: "Calendar", icon: CalendarDays, href: "/calendar" },
      { label: "Chat", icon: MessageSquareText, href: "/chat" },
      { label: "Notifications", icon: Bell, href: "/notifications" },
    ],
  },
  {
    label: "HR – People",
    requiredPermission: ["hr:employees:view", "hr:attendance:view", "hr:leaves:view", "hr:documents:view"],
    routes: [
      { label: "Employees", icon: Users, href: "/hr", requiredPermission: "hr:employees:view" },
      { label: "Skills Matrix", icon: Grid3X3, href: "/hr/employees/skills-matrix", isSubItem: true, requiredPermission: "hr:employees:view" },
      { label: "Find Expert", icon: Search, href: "/hr/employees/find-expert", isSubItem: true, requiredPermission: "hr:employees:view" },
      { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "Doc Types", icon: FileCheck, href: "/hr/document-types", isSubItem: true, requiredPermission: "hr:documents:manage" },
      { label: "Doc Review", icon: FileText, href: "/hr/document-review", isSubItem: true, requiredPermission: "hr:documents:manage" },
      { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true, requiredPermission: "hr:employees:view" },
      { label: "Attendance", icon: Clock, href: "/hr/attendance", requiredPermission: "hr:attendance:view" },
      { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves", requiredPermission: "hr:leaves:view" },
      { label: "Payroll", icon: CreditCard, href: "/hr/payroll", requiredPermission: "hr:payroll:view" },
      { label: "Expenses", icon: Receipt, href: "/hr/expenses", requiredPermission: "hr:expenses:view" },
      { label: "Documents", icon: FileText, href: "/hr/documents", requiredPermission: "hr:documents:view" },
      { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true, requiredPermission: "hr:documents:view" },
      { label: "Devices", icon: Laptop, href: "/hr/devices", requiredPermission: "hr:assets:view" },
      { label: "Assets", icon: Package, href: "/hr/assets", requiredPermission: "hr:assets:view" },
      { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true, requiredPermission: "hr:assets:manage" },
      { label: "Work Logs", icon: History, href: "/hr/work-logs", requiredPermission: ["hr:attendance:view", "self:attendance"] },
      { label: "Exit", icon: UserMinus, href: "/hr/exit", requiredPermission: "hr:employees:update" },
      { label: "Termination", icon: UserX, href: "/hr/termination", isSubItem: true, requiredPermission: "hr:employees:delete" },
      { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk", requiredPermission: "hr:employees:view" },
      { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates", requiredPermission: "hr:employees:update" },
      { label: "HR Analytics", icon: BarChart3, href: "/hr/analytics", requiredPermission: "hr:employees:view" },
    ],
  },
  {
    label: "HR – Growth",
    defaultCollapsed: true,
    requiredPermission: ["hr:performance:view", "hr:goals:view"],
    routes: [
      { label: "Performance", icon: Star, href: "/hr/performance", requiredPermission: "hr:performance:view" },
      { label: "Training", icon: BookOpen, href: "/hr/training", requiredPermission: "hr:performance:view" },
      { label: "Recognition", icon: Heart, href: "/hr/recognition", requiredPermission: "hr:performance:view" },
      { label: "Assessments", icon: ClipboardCheck, href: "/hr/assessments", requiredPermission: "hr:performance:manage" },
      { label: "Certifications", icon: Award, href: "/hr/certifications", requiredPermission: "hr:performance:view" },
      { label: "Skills", icon: Zap, href: "/hr/skills", requiredPermission: "hr:performance:view" },
      { label: "Learning Paths", icon: Map, href: "/hr/learning-paths", requiredPermission: "hr:performance:view" },
      { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders", requiredPermission: "hr:performance:view" },
      { label: "eNPS", icon: Smile, href: "/hr/enps", requiredPermission: "hr:performance:view" },
      { label: "Surveys", icon: ListChecks, href: "/hr/surveys", requiredPermission: "hr:performance:view" },
      { label: "Team Events", icon: PartyPopper, href: "/hr/team-events", requiredPermission: "hr:employees:view" },
      { label: "Alumni", icon: GraduationCap, href: "/hr/alumni", requiredPermission: "hr:employees:view" },
    ],
  },
  {
    label: "HR – Compensation",
    defaultCollapsed: true,
    requiredPermission: ["hr:salary:view", "hr:payroll:view"],
    routes: [
      { label: "Bonuses", icon: Gift, href: "/hr/bonuses", requiredPermission: "hr:salary:manage" },
      { label: "Incentives", icon: Coins, href: "/hr/incentives", requiredPermission: "crm:incentives:read" },
      { label: "Loans", icon: Landmark, href: "/hr/loans", requiredPermission: "hr:payroll:view" },
      { label: "Reimbursements", icon: RefreshCcw, href: "/hr/reimbursements", requiredPermission: "hr:expenses:view" },
      { label: "Full & Final", icon: FileCheck, href: "/hr/fnf", requiredPermission: "hr:payroll:approve" },
      { label: "Background Check", icon: ShieldCheck, href: "/hr/background-verification", requiredPermission: "hr:documents:manage" },
      { label: "Compliance", icon: Scale, href: "/hr/compliance", requiredPermission: "hr:documents:manage" },
    ],
  },
  {
    label: "Recruitment",
    requiredPermission: ["hr:employees:create"],
    routes: [
      { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment", requiredPermission: "hr:employees:create" },
      { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "Scorecard Templates", icon: ClipboardList, href: "/hr/recruitment/scorecard-templates", isSubItem: true, requiredPermission: "hr:employees:create" },
      { label: "SLA Config", icon: Clock, href: "/hr/recruitment/sla", isSubItem: true, requiredPermission: "hr:employees:create" },
    ],
  },
  {
    label: "CRM",
    requiredPermission: ["crm:leads:view", "crm:targets:view", "crm:clients:read"],
    routes: [
      { label: "CRM Hub", icon: Contact2, href: "/crm", requiredPermission: "crm:leads:view" },
      { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads", requiredPermission: "crm:leads:view" },
      { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", isSubItem: true, requiredPermission: "crm:leads:view" },
      { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true, requiredPermission: "crm:leads:assign" },
      { label: "Source Report", icon: BarChart2, href: "/crm/leads/source-report", isSubItem: true, requiredPermission: "crm:reports:view" },
      { label: "Duplicate Detection", icon: Copy, href: "/crm/leads/duplicates", isSubItem: true, requiredPermission: "crm:leads:update" },
      { label: "Deals", icon: Handshake, href: "/crm/deals", requiredPermission: "crm:leads:view" },
      { label: "Deal Approvals", icon: Briefcase, href: "/crm/deals/approvals", isSubItem: true, requiredPermission: "crm:leads:update" },
      { label: "Deal Aging", icon: Clock, href: "/crm/deals/aging", isSubItem: true, requiredPermission: "crm:leads:view" },
      { label: "Win/Loss Analysis", icon: TrendingUp, href: "/crm/deals/win-loss", isSubItem: true, requiredPermission: "crm:reports:view" },
      { label: "Organizations", icon: Network, href: "/crm/organizations", requiredPermission: "crm:clients:read" },
      { label: "Clients", icon: UserCheck, href: "/crm/clients", requiredPermission: "crm:clients:read" },
      { label: "Territories", icon: Map, href: "/crm/territories", isSubItem: true, requiredPermission: "branch:read" },
      { label: "Targets", icon: Trophy, href: "/crm/targets", requiredPermission: "crm:targets:view" },
      { label: "Analytics", icon: BarChart3, href: "/crm/analytics", requiredPermission: "crm:reports:view" },
      { label: "CRM Reports", icon: BarChart2, href: "/crm/reports", requiredPermission: "crm:reports:view" },
      { label: "Quotes", icon: FileText, href: "/crm/quotes", requiredPermission: "crm:leads:view" },
      { label: "Web Forms", icon: FormInput, href: "/crm/web-forms", isSubItem: true, requiredPermission: "crm:leads:create" },
    ],
  },
  {
    label: "CRM Settings",
    defaultCollapsed: true,
    requiredPermission: "settings:manage",
    routes: [
      { label: "Assignment Rules", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules", requiredPermission: "settings:manage" },
      { label: "Email Templates", icon: MailOpen, href: "/crm/settings/email-templates", requiredPermission: "settings:manage" },
      { label: "Scoring Rules", icon: Star, href: "/crm/settings/scoring-rules", requiredPermission: "settings:manage" },
      { label: "SLA Rules", icon: Clock, href: "/crm/settings/sla", requiredPermission: "settings:manage" },
    ],
  },
  {
    label: "Finance",
    requiredPermission: ["settings:manage", "dashboard:sales:view", "dashboard:customer-executive:view"],
    routes: [
      { label: "Billing", icon: CreditCard, href: "/billing", requiredPermission: "settings:manage" },
      { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Sales", icon: BarChart3, href: "/sales", requiredPermission: "dashboard:sales:view" },
      { label: "Activity Dashboard", icon: Activity, href: "/sales/activity", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Quotas", icon: Target, href: "/sales/quotas", isSubItem: true, requiredPermission: "crm:targets:view" },
      { label: "Commissions", icon: DollarSign, href: "/sales/commissions", isSubItem: true, requiredPermission: "crm:incentives:read" },
      { label: "Customer Exec", icon: Handshake, href: "/customer-executive", requiredPermission: "dashboard:customer-executive:view" },
      { label: "Renewal Pipeline", icon: RefreshCcw, href: "/customer-executive/renewals", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "Upsell Tracker", icon: TrendingUp, href: "/customer-executive/upsell", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "Client Onboarding", icon: ClipboardList, href: "/customer-executive/client-onboarding", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "CSAT Surveys", icon: Star, href: "/customer-executive/surveys", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "Sentiment Analysis", icon: Brain, href: "/customer-executive/sentiment", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "SLA Compliance", icon: ShieldAlert, href: "/customer-executive/sla", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "Account Summary", icon: FileText, href: "/customer-executive/account-summary", isSubItem: true, requiredPermission: "dashboard:customer-executive:view" },
      { label: "Forecast Report", icon: TrendingUp, href: "/sales/forecast-report", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Sales Playbook", icon: BookOpen, href: "/sales/playbook", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "AI Sales Tools", icon: Sparkles, href: "/sales/ai-tools", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Report Narrator", icon: FileSearch, href: "/sales/report-narrator", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Meeting Prep", icon: CalendarCheck, href: "/sales/meeting-prep", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Cohort Analysis", icon: BarChart3, href: "/sales/cohort-analysis", isSubItem: true, requiredPermission: "dashboard:sales:view" },
      { label: "Rep Comparison", icon: Users, href: "/sales/rep-comparison", isSubItem: true, requiredPermission: "dashboard:sales:view" },
    ],
  },
  {
    label: "Accounting",
    requiredPermission: ["accounting:view"],
    routes: [
      { label: "Overview", icon: Calculator, href: "/accounting", requiredPermission: "accounting:view" },
      { label: "Chart of Accounts", icon: BookOpen, href: "/accounting/coa", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Journal", icon: FileText, href: "/accounting/journal", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Trial Balance", icon: Scale, href: "/accounting/trial-balance", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Profit & Loss", icon: TrendingUp, href: "/accounting/profit-loss", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Balance Sheet", icon: Landmark, href: "/accounting/balance-sheet", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Customer Ledgers", icon: Users, href: "/accounting/customers", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Aged Receivables", icon: Clock, href: "/accounting/aged-receivables", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Purchase Bills", icon: Receipt, href: "/accounting/purchase-bills", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Vendor Ledgers", icon: Users, href: "/accounting/vendors", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "Aged Payables", icon: Clock, href: "/accounting/aged-payables", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "GSTR-1", icon: FileText, href: "/accounting/gstr-1", isSubItem: true, requiredPermission: "accounting:view" },
      { label: "GSTR-3B", icon: BarChart2, href: "/accounting/gstr-3b", isSubItem: true, requiredPermission: "accounting:view" },
    ],
  },
  {
    label: "Marketing",
    defaultCollapsed: true,
    requiredPermission: ["dm:campaigns:read", "dm:leads:read"],
    routes: [
      { label: "Marketing Hub", icon: Megaphone, href: "/marketing", requiredPermission: "dm:campaigns:read" },
      { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "A/B Testing", icon: FlaskConical, href: "/marketing/ab-testing", isSubItem: true, requiredPermission: "dm:campaigns:update" },
      { label: "Marketing Calendar", icon: CalendarDays, href: "/marketing/calendar", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Content Calendar", icon: CalendarRange, href: "/marketing/content-calendar", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Landing Pages", icon: BarChart2, href: "/marketing/landing-pages", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Content Brief", icon: FileText, href: "/marketing/content-brief", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Social Analytics", icon: BarChart2, href: "/marketing/social-analytics", isSubItem: true, requiredPermission: "dm:social:read" },
      { label: "AI Insights", icon: Sparkles, href: "/marketing/ai-insights", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Digital Marketing", icon: BarChart3, href: "/digital-marketing", requiredPermission: "dm:leads:read" },
      { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true, requiredPermission: "dm:campaigns:read" },
      { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true, requiredPermission: "dm:leads:read" },
      { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true, requiredPermission: "dm:social:read" },
    ],
  },
  {
    label: "Projects & Time",
    requiredPermission: ["projects:view", "projects:timesheets:view"],
    routes: [
      { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true, requiredPermission: "projects:view" },
      { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", isSubItem: true, requiredPermission: "projects:create" },
      { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", isSubItem: true, requiredPermission: "projects:update" },
      { label: "Timesheets", icon: Timer, href: "/timesheets/team", requiredPermission: "projects:timesheets:view" },
    ],
  },
  {
    label: "Support",
    requiredPermission: ["projects:tickets:view"],
    routes: [
      { label: "All Tickets", icon: LifeBuoy, href: "/support", requiredPermission: "projects:tickets:view" },
      { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true, requiredPermission: "projects:tickets:view" },
      { label: "Ticket Analytics", icon: BarChart2, href: "/crm/analytics", requiredPermission: "crm:reports:view" },
    ],
  },
  {
    label: "Self-Service",
    defaultCollapsed: true,
    routes: SELF_SERVICE,
  },
  {
    label: "System",
    defaultCollapsed: true,
    requiredPermission: ["settings:view", "settings:manage", "settings:rbac:manage"],
    routes: [
      { label: "Settings", icon: Settings, href: "/settings", requiredPermission: "settings:view" },
      { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Branches", icon: GitBranch, href: "/settings/branches", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Roles & Permissions", icon: Shield, href: "/settings/roles", requiredPermission: "settings:rbac:manage" },
      { label: "Permission Matrix", icon: ShieldAlert, href: "/settings/permissions", isSubItem: true, requiredPermission: "settings:rbac:manage" },
      { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log", requiredPermission: "settings:manage" },
      { label: "Webhooks", icon: Zap, href: "/settings/webhooks", requiredPermission: "settings:manage" },
      { label: "AI Settings", icon: Brain, href: "/settings/ai", requiredPermission: "settings:manage" },
      { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Data Hub", icon: FileText, href: "/settings/data-hub", requiredPermission: "settings:manage" },
      { label: "Recruitment Integrations", icon: Globe, href: "/settings/integrations/recruitment", isSubItem: true, requiredPermission: "settings:manage" },
      { label: "Reports", icon: BarChart2, href: "/reports", requiredPermission: "reports:view" },
    ],
  },
];

function matchesPermission(
  required: string | string[] | undefined,
  granted: Set<string>,
): boolean {
  if (!required) return true;
  const reqs = Array.isArray(required) ? required : [required];
  if (reqs.length === 0) return true;
  return reqs.some((p) => granted.has(p));
}

export function getNavGroupsForUser(
  role: string | undefined,
  permissions: string[] | undefined,
): NavGroup[] {
  if (!role) return [];

  const isOwner = role === "OWNER";
  const granted = new Set(permissions ?? []);

  return NAV_GROUPS
    .map((group) => {
      const visibleRoutes = group.routes.filter((r) =>
        isOwner || matchesPermission(r.requiredPermission, granted),
      );
      return { ...group, routes: visibleRoutes };
    })
    .filter((group) => {
      if (group.routes.length === 0) return false;
      if (isOwner) return true;
      return matchesPermission(group.requiredPermission, granted);
    });
}

export function getNavGroupsForRole(role: string | undefined): NavGroup[] {
  return getNavGroupsForUser(role, role === "OWNER" ? undefined : []);
}
