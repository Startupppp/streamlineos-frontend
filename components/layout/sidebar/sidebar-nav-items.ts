import {
  LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays,
  Receipt, FileText, Laptop, Timer, DollarSign, Handshake,
  Contact2, Trophy, BarChart3, UserCheck, Network, ClipboardList, MessageSquareText,
  Shield, ShieldCheck, CreditCard, Wallet, Star, HeadphonesIcon, UserSearch,
  TrendingUp, BookOpen, Heart, UserMinus, Target, Package,
  Share2, Video, Globe,
  Bell, GraduationCap, ClipboardCheck, PackageMinus, Gift, Award, Scale,
  MailOpen, Smile, FileCheck, Coins, Map, Landmark, RefreshCcw, Zap,
  ListChecks, PartyPopper, History, BarChart2, LifeBuoy, Inbox,
  GitBranch, Building2, UserCog, SlidersHorizontal, UserX,
  Sparkles, Brain, Copy, Search, ShieldAlert, Sliders,
  FormInput, FileSearch, LayoutTemplate, Grid3X3, Calculator,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  requiredPermission?: string | string[];
  children?: NavRoute[];
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
  defaultCollapsed?: boolean;
  requiredPermission?: string | string[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core",
    routes: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
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
      {
        label: "Employees", icon: Users, href: "/hr", requiredPermission: "hr:employees:view",
        children: [
          { label: "Skills Matrix", icon: Grid3X3, href: "/hr/employees/skills-matrix", requiredPermission: "hr:employees:view" },
          { label: "Find Expert", icon: Search, href: "/hr/employees/find-expert", requiredPermission: "hr:employees:view" },
          { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding", requiredPermission: "hr:employees:create" },
          { label: "My Onboarding Tasks", icon: ClipboardList, href: "/hr/onboarding/my-tasks", requiredPermission: ["self:attendance"] },
          { label: "Org Chart", icon: Network, href: "/hr/org-chart", requiredPermission: "hr:employees:view" },
        ],
      },
      { label: "Attendance", icon: Clock, href: "/hr/attendance", requiredPermission: "hr:attendance:view" },
      { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves", requiredPermission: "hr:leaves:view" },
      { label: "Payroll", icon: CreditCard, href: "/hr/payroll", requiredPermission: "hr:payroll:view" },
      { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips", requiredPermission: ["self:payslips", "hr:payroll:view"] },
      { label: "Expenses", icon: Receipt, href: "/hr/expenses", requiredPermission: "hr:expenses:view" },
      {
        label: "Documents", icon: FileText, href: "/hr/documents", requiredPermission: "hr:documents:view",
        children: [
          { label: "Doc Types", icon: FileCheck, href: "/hr/document-types", requiredPermission: "hr:documents:manage" },
          { label: "Doc Review", icon: FileText, href: "/hr/document-review", requiredPermission: "hr:documents:manage" },
          { label: "Handbook", icon: BookOpen, href: "/hr/handbook", requiredPermission: "hr:documents:view" },
        ],
      },
      { label: "Devices", icon: Laptop, href: "/hr/devices", requiredPermission: "hr:assets:view" },
      {
        label: "Assets", icon: Package, href: "/hr/assets", requiredPermission: "hr:assets:view",
        children: [
          { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", requiredPermission: "hr:assets:manage" },
        ],
      },
      { label: "Work Logs", icon: History, href: "/hr/work-logs", requiredPermission: ["hr:attendance:view", "self:attendance"] },
      {
        label: "Exit", icon: UserMinus, href: "/hr/exit", requiredPermission: "hr:employees:update",
        children: [
          { label: "Termination", icon: UserX, href: "/hr/termination", requiredPermission: "hr:employees:delete" },
        ],
      },
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
      {
        label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment", requiredPermission: "hr:employees:create",
        children: [
          { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", requiredPermission: "hr:employees:create" },
          { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", requiredPermission: "hr:employees:create" },
          { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", requiredPermission: "hr:employees:create" },
          { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", requiredPermission: "hr:employees:create" },
          { label: "Question Bank", icon: BookOpen, href: "/hr/recruitment/question-bank", requiredPermission: "hr:employees:create" },
          { label: "Scorecard Templates", icon: ClipboardList, href: "/hr/recruitment/scorecard-templates", requiredPermission: "hr:employees:create" },
          { label: "SLA Config", icon: Clock, href: "/hr/recruitment/sla", requiredPermission: "hr:employees:create" },
        ],
      },
    ],
  },
  {
    label: "CRM",
    requiredPermission: ["crm:leads:view", "crm:targets:view", "crm:clients:read"],
    routes: [
      { label: "Overview", icon: LayoutDashboard, href: "/crm", requiredPermission: "crm:leads:view" },
      {
        label: "Leads", icon: Contact2, href: "/crm/leads", requiredPermission: "crm:leads:view",
        children: [
          { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", requiredPermission: "crm:leads:view" },
          { label: "Web Forms", icon: FormInput, href: "/crm/web-forms", requiredPermission: "crm:leads:create" },
          { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", requiredPermission: "crm:leads:assign" },
          { label: "Duplicate Detection", icon: Copy, href: "/crm/leads/duplicates", requiredPermission: "crm:leads:update" },
          { label: "Source Report", icon: BarChart2, href: "/crm/leads/source-report", requiredPermission: "crm:reports:view" },
        ],
      },
      {
        label: "Deals", icon: Handshake, href: "/crm/deals", requiredPermission: "crm:leads:view",
        children: [
          { label: "Deal Approvals", icon: Briefcase, href: "/crm/deals/approvals", requiredPermission: "crm:leads:update" },
          { label: "Deal Aging", icon: Clock, href: "/crm/deals/aging", requiredPermission: "crm:leads:view" },
          { label: "Win/Loss Analysis", icon: TrendingUp, href: "/crm/deals/win-loss", requiredPermission: "crm:reports:view" },
        ],
      },
      { label: "Quotes", icon: FileText, href: "/crm/quotes", requiredPermission: "crm:leads:view" },
      { label: "Contacts", icon: Users, href: "/crm/contacts", requiredPermission: "crm:clients:read" },
      {
        label: "Clients", icon: UserCheck, href: "/crm/clients", requiredPermission: "crm:clients:read",
        children: [
          { label: "Organizations", icon: Network, href: "/crm/organizations", requiredPermission: "crm:clients:read" },
          { label: "Territories", icon: Map, href: "/crm/territories", requiredPermission: "branch:read" },
        ],
      },
      { label: "Targets", icon: Trophy, href: "/crm/targets", requiredPermission: "crm:targets:view" },
      {
        label: "Analytics", icon: BarChart3, href: "/crm/analytics", requiredPermission: "crm:reports:view",
        children: [
          { label: "Reports", icon: BarChart2, href: "/crm/reports", requiredPermission: "crm:reports:view" },
        ],
      },
      {
        label: "Settings", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules", requiredPermission: "settings:manage",
        children: [
          { label: "Assignment Rules", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules", requiredPermission: "settings:manage" },
          { label: "Email Templates", icon: MailOpen, href: "/crm/settings/email-templates", requiredPermission: "settings:manage" },
          { label: "Scoring Rules", icon: Star, href: "/crm/settings/scoring-rules", requiredPermission: "settings:manage" },
          { label: "SLA Rules", icon: Clock, href: "/crm/settings/sla", requiredPermission: "settings:manage" },
        ],
      },
    ],
  },
  {
    label: "Billing",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Billing", icon: CreditCard, href: "/billing", requiredPermission: "settings:manage",
        children: [
          { label: "Invoices", icon: FileText, href: "/billing/invoices", requiredPermission: "settings:manage" },
          { label: "Recurring Invoices", icon: RefreshCcw, href: "/billing/recurring", requiredPermission: "settings:manage" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    requiredPermission: "dashboard:sales:view",
    routes: [
      {
        label: "Sales", icon: BarChart3, href: "/sales", requiredPermission: "dashboard:sales:view",
        children: [
          { label: "Quotas", icon: Target, href: "/sales/quotas", requiredPermission: "crm:targets:view" },
          { label: "Commissions", icon: DollarSign, href: "/sales/commissions", requiredPermission: "crm:incentives:read" },
          { label: "Forecast Report", icon: TrendingUp, href: "/sales/forecast-report", requiredPermission: "dashboard:sales:view" },
          { label: "Sales Playbook", icon: BookOpen, href: "/sales/playbook", requiredPermission: "dashboard:sales:view" },
          { label: "Report Narrator", icon: FileSearch, href: "/sales/report-narrator", requiredPermission: "dashboard:sales:view" },
          { label: "Meeting Prep", icon: CalendarCheck, href: "/sales/meeting-prep", requiredPermission: "dashboard:sales:view" },
          { label: "Cohort Analysis", icon: BarChart3, href: "/sales/cohort-analysis", requiredPermission: "dashboard:sales:view" },
          { label: "Rep Comparison", icon: Users, href: "/sales/rep-comparison", requiredPermission: "dashboard:sales:view" },
        ],
      },
    ],
  },
  {
    label: "Customer Success",
    requiredPermission: "dashboard:customer-executive:view",
    routes: [
      {
        label: "Customer Exec", icon: Handshake, href: "/customer-executive", requiredPermission: "dashboard:customer-executive:view",
        children: [
          { label: "Renewal Pipeline", icon: RefreshCcw, href: "/customer-executive/renewals", requiredPermission: "dashboard:customer-executive:view" },
          { label: "Upsell Tracker", icon: TrendingUp, href: "/customer-executive/upsell", requiredPermission: "dashboard:customer-executive:view" },
          { label: "Client Onboarding", icon: ClipboardList, href: "/customer-executive/client-onboarding", requiredPermission: "dashboard:customer-executive:view" },
          { label: "CSAT Surveys", icon: Star, href: "/customer-executive/surveys", requiredPermission: "dashboard:customer-executive:view" },
          { label: "Sentiment Analysis", icon: Brain, href: "/customer-executive/sentiment", requiredPermission: "dashboard:customer-executive:view" },
          { label: "SLA Compliance", icon: ShieldAlert, href: "/customer-executive/sla", requiredPermission: "dashboard:customer-executive:view" },
          { label: "Account Health", icon: Heart, href: "/customer-executive/health", requiredPermission: "dashboard:customer-executive:view" },
          { label: "NPS Surveys", icon: Smile, href: "/customer-executive/nps", requiredPermission: "dashboard:customer-executive:view" },
          { label: "Account Summary", icon: FileText, href: "/customer-executive/account-summary", requiredPermission: "dashboard:customer-executive:view" },
        ],
      },
    ],
  },
  {
    label: "Accounting",
    requiredPermission: ["accounting:view"],
    routes: [
      {
        label: "Overview", icon: Calculator, href: "/accounting", requiredPermission: "accounting:view",
        children: [
          { label: "Chart of Accounts", icon: BookOpen, href: "/accounting/coa", requiredPermission: "accounting:view" },
          { label: "Journal", icon: FileText, href: "/accounting/journal", requiredPermission: "accounting:view" },
          { label: "Trial Balance", icon: Scale, href: "/accounting/trial-balance", requiredPermission: "accounting:view" },
          { label: "Profit & Loss", icon: TrendingUp, href: "/accounting/profit-loss", requiredPermission: "accounting:view" },
          { label: "Balance Sheet", icon: Landmark, href: "/accounting/balance-sheet", requiredPermission: "accounting:view" },
          { label: "Cash Flow", icon: Coins, href: "/accounting/cash-flow", requiredPermission: "accounting:view" },
          { label: "Customer Ledgers", icon: Users, href: "/accounting/customers", requiredPermission: "accounting:view" },
          { label: "Aged Receivables", icon: Clock, href: "/accounting/aged-receivables", requiredPermission: "accounting:view" },
          { label: "Purchase Bills", icon: Receipt, href: "/accounting/purchase-bills", requiredPermission: "accounting:view" },
          { label: "Vendor Ledgers", icon: Users, href: "/accounting/vendors", requiredPermission: "accounting:view" },
          { label: "Aged Payables", icon: Clock, href: "/accounting/aged-payables", requiredPermission: "accounting:view" },
          { label: "GSTR-1", icon: FileText, href: "/accounting/gstr-1", requiredPermission: "accounting:view" },
          { label: "GSTR-3B", icon: BarChart2, href: "/accounting/gstr-3b", requiredPermission: "accounting:view" },
        ],
      },
    ],
  },
  {
    label: "Projects & Time",
    requiredPermission: ["projects:view", "projects:timesheets:view", "projects:goals:view", "projects:roadmap:view"],
    routes: [
      {
        label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true, requiredPermission: "projects:view",
        children: [
          { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", requiredPermission: "projects:create" },
          { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", requiredPermission: "projects:update" },
        ],
      },
      { label: "Goals & OKRs", icon: Target, href: "/goals", requiredPermission: "projects:goals:view" },
      { label: "Roadmap", icon: Map, href: "/projects/roadmap", requiredPermission: "projects:roadmap:view" },
      { label: "Timesheets", icon: Timer, href: "/timesheets/team", requiredPermission: "projects:timesheets:view" },
    ],
  },
  {
    label: "Support",
    requiredPermission: ["projects:tickets:view", "support:kb:view"],
    routes: [
      {
        label: "All Tickets", icon: LifeBuoy, href: "/support", requiredPermission: "projects:tickets:view",
        children: [
          { label: "Support Inbox", icon: Inbox, href: "/support/inbox", requiredPermission: "projects:tickets:view" },
        ],
      },
      { label: "Knowledge Base", icon: BookOpen, href: "/support/kb", requiredPermission: "support:kb:view" },
      { label: "Canned Responses", icon: MailOpen, href: "/support/macros", requiredPermission: "support:macros:view" },
      { label: "Routing Rules", icon: Share2, href: "/support/routing", requiredPermission: "support:macros:view" },
    ],
  },
  {
    label: "System",
    defaultCollapsed: true,
    requiredPermission: ["settings:view", "settings:manage", "settings:rbac:manage"],
    routes: [
      {
        label: "Settings", icon: Settings, href: "/settings", requiredPermission: "settings:view",
        children: [
          { label: "Organization", icon: Building2, href: "/settings/organization", requiredPermission: "settings:manage" },
          { label: "Members", icon: UserCog, href: "/settings/members", requiredPermission: "settings:manage" },
          { label: "Notifications", icon: Bell, href: "/settings/notifications", requiredPermission: "settings:manage" },
          { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", requiredPermission: "settings:manage" },
          { label: "Recruitment Integrations", icon: Globe, href: "/settings/integrations/recruitment", requiredPermission: "settings:manage" },
          { label: "Git Integration", icon: GitBranch, href: "/settings/integrations/git", requiredPermission: "settings:manage" },
        ],
      },
      { label: "Branches", icon: GitBranch, href: "/settings/branches", requiredPermission: ["settings:manage", "branch:read"] },
      {
        label: "Roles & Permissions", icon: Shield, href: "/settings/roles", requiredPermission: "settings:rbac:manage",
        children: [
          { label: "Permission Matrix", icon: ShieldAlert, href: "/settings/permissions", requiredPermission: "settings:rbac:manage" },
        ],
      },
      { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log", requiredPermission: "settings:manage" },
      { label: "Webhooks", icon: Zap, href: "/settings/webhooks", requiredPermission: "settings:manage" },
      { label: "Automations", icon: Zap, href: "/settings/automations", requiredPermission: "settings:automations:view" },
      { label: "AI Settings", icon: Brain, href: "/settings/ai", requiredPermission: "settings:manage" },
      { label: "Data Hub", icon: FileText, href: "/settings/data-hub", requiredPermission: "settings:manage" },
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

function filterRoute(route: NavRoute, isOwner: boolean, granted: Set<string>): NavRoute | null {
  if (!isOwner && !matchesPermission(route.requiredPermission, granted)) return null;
  if (route.children && route.children.length > 0) {
    const children = route.children
      .map((c) => filterRoute(c, isOwner, granted))
      .filter((c): c is NavRoute => c !== null);
    return children.length > 0 ? { ...route, children } : { ...route, children: undefined };
  }
  return route;
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
      const visibleRoutes = group.routes
        .map((r) => filterRoute(r, isOwner, granted))
        .filter((r): r is NavRoute => r !== null);
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

export function flattenNavRoutes(routes: NavRoute[]): NavRoute[] {
  const out: NavRoute[] = [];
  for (const r of routes) {
    out.push(r);
    if (r.children && r.children.length > 0) {
      out.push(...flattenNavRoutes(r.children));
    }
  }
  return out;
}
