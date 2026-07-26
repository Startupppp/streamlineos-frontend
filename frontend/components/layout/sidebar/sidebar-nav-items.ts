import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  FileText,
  Timer,
  IndianRupee,
  Handshake,
  Contact2,
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
  TrendingUp,
  BookOpen,
  UserMinus,
  Target,
  Package,
  Share2,
  Globe,
  Bell,
  PackageMinus,
  Award,
  ClipboardCheck,
  Sparkles,
  HeartHandshake,
  Scale,
  MailOpen,
  FileCheck,
  Coins,
  Map,
  Landmark,
  RefreshCcw,
  Zap,
  ListChecks,
  History,
  BarChart2,
  LifeBuoy,
  Inbox,
  Send,
  GitBranch,
  Building2,
  UserCog,
  SlidersHorizontal,
  UserX,
  Brain,
  Copy,
  Search,
  ShieldAlert,
  Sliders,
  FileSearch,
  LayoutTemplate,
  Grid3X3,
  Calculator,
  Tag,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  Truck,
  Library,
  NotebookPen,
  LayoutGrid,
  Workflow,
  PlayCircle,
  CheckSquare,
  Lock,
  Key,
  Smartphone,
  Plug,
  Activity,
  PenTool,
  Banknote,
  KanbanSquare,
  Video,
  Layers,
  PiggyBank,
  Percent,
  ArrowDownToLine,
  HandCoins,
  TrendingDown,
  FileStack,
  Megaphone,
  Scan,
  Boxes,
  CalendarClock,
  Container,
  Upload,
  RotateCcw,
  PackageCheck,
  DollarSign,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: "leaves";
  requiredPermission?: string | string[];
  children?: NavRoute[];
  module?: ProductKey;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
  defaultCollapsed?: boolean;
  requiredPermission?: string | string[];
  module?: ProductKey;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workflows",
    requiredPermission: "workflows:workflows:view",
    routes: [
      {
        label: "Dashboard",
        icon: Workflow,
        href: "/workflows",
        exact: true,
        requiredPermission: "workflows:workflows:view",
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        href: "/workflows/templates",
        requiredPermission: "workflows:templates:view",
      },
      {
        label: "Executions",
        icon: PlayCircle,
        href: "/workflows/executions",
        requiredPermission: "workflows:executions:view",
      },
      {
        label: "Approvals",
        icon: CheckSquare,
        href: "/workflows/approvals",
        requiredPermission: "workflows:approvals:view",
      },
      {
        label: "Scheduler",
        icon: Clock,
        href: "/workflows/scheduler",
        requiredPermission: "workflows:schedules:manage",
      },
      {
        label: "Analytics",
        icon: BarChart2,
        href: "/workflows/analytics",
        requiredPermission: "workflows:analytics:view",
      },
      {
        label: "Variables",
        icon: Sliders,
        href: "/workflows/variables",
        requiredPermission: "workflows:variables:manage",
      },
      {
        label: "Secrets",
        icon: Lock,
        href: "/workflows/secrets",
        requiredPermission: "workflows:secrets:manage",
      },
    ],
  },
  {
    label: "HR – People",
    module: "hrms",
    requiredPermission: [
      "hr:employees:view",
      "hr:attendance:view",
      "hr:leaves:view",
    ],
    routes: [
      {
        label: "HR Setup",
        icon: Sparkles,
        href: "/hr/setup",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Approvals Inbox",
        icon: ClipboardCheck,
        href: "/hr/approvals",
        requiredPermission: "hr:workflows:approve",
      },
      {
        label: "Employees",
        icon: Users,
        href: "/hr",
        exact: true,
        requiredPermission: "hr:employees:view",
        children: [
          {
            label: "Skills Matrix",
            icon: Grid3X3,
            href: "/hr/employees/skills-matrix",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Find Expert",
            icon: Search,
            href: "/hr/employees/find-expert",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Org Chart",
            icon: Network,
            href: "/hr/org-chart",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Organization",
            icon: Building2,
            href: "/hr/org",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Positions",
            icon: Network,
            href: "/hr/positions",
            requiredPermission: "hr:positions:view",
          },
          {
            label: "Onboarding",
            icon: ClipboardList,
            href: "/hr/onboarding",
            exact: true,
            requiredPermission: "hr:employees:create",
          },
          {
            label: "My Onboarding Tasks",
            icon: ListChecks,
            href: "/hr/onboarding/my-tasks",
            requiredPermission: ["self:attendance"],
          },
        ],
      },
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
            label: "Biometric",
            icon: Smartphone,
            href: "/hr/biometric",
            requiredPermission: "hr:attendance:manage",
          },
          {
            label: "Time Clock Devices",
            icon: Clock,
            href: "/hr/devices",
            requiredPermission: "hr:biometric:manage",
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
        requiredPermission: "hr:leaves:view",
        children: [
          {
            label: "Policies",
            icon: FileText,
            href: "/hr/leave-policies",
            requiredPermission: "hr:leaves:manage",
          },
          {
            label: "Holiday Calendar",
            icon: CalendarDays,
            href: "/hr/holidays",
            requiredPermission: "hr:leaves:view",
          },
          {
            label: "Comp-Off",
            icon: RefreshCcw,
            href: "/hr/comp-off",
            requiredPermission: "hr:leaves:view",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            href: "/hr/leaves/analytics",
            requiredPermission: "hr:leaves:view",
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
            label: "Benefits",
            icon: HeartHandshake,
            href: "/hr/benefits",
            requiredPermission: "hr:benefits:view",
          },
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
      {
        label: "Expenses",
        icon: Receipt,
        href: "/hr/expenses",
        requiredPermission: "hr:expenses:view",
        children: [
          {
            label: "Reimbursements",
            icon: RefreshCcw,
            href: "/hr/reimbursements",
            requiredPermission: "hr:expenses:view",
          },
          {
            label: "Travel",
            icon: Globe,
            href: "/hr/travel",
            exact: true,
            requiredPermission: "hr:expenses:view",
          },
          {
            label: "Travel Approvals",
            icon: CheckSquare,
            href: "/hr/travel/approvals",
            requiredPermission: "hr:expenses:manage",
          },
        ],
      },
      {
        label: "Performance",
        icon: Star,
        href: "/hr/performance",
        requiredPermission: "hr:performance:view",
        children: [
          {
            label: "Goals & OKRs",
            icon: Target,
            href: "/hr/goals",
            requiredPermission: "hr:goals:view",
          },
          {
            label: "KPIs & Competencies",
            icon: BarChart2,
            href: "/hr/kpis",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "360 Feedback",
            icon: MessageSquareText,
            href: "/hr/feedback",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Analytics",
            icon: TrendingUp,
            href: "/hr/performance/analytics",
            requiredPermission: "hr:performance:view",
          },
        ],
      },
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
            requiredPermission: "hr:documents:manage",
          },
          {
            label: "Handbook",
            icon: BookOpen,
            href: "/hr/handbook",
            requiredPermission: "hr:documents:view",
          },
          {
            label: "Email Templates",
            icon: MailOpen,
            href: "/hr/email-templates",
            requiredPermission: "hr:employees:update",
          },
        ],
      },
      {
        label: "Assets",
        icon: Package,
        href: "/hr/assets",
        requiredPermission: "hr:assets:view",
        children: [
          {
            label: "Asset Returns",
            icon: PackageMinus,
            href: "/hr/asset-returns",
            requiredPermission: "hr:assets:manage",
          },
        ],
      },
      {
        label: "Workforce",
        icon: TrendingUp,
        href: "/hr/workforce",
        requiredPermission: ["hr:analytics:read", "hr:contracts:view"],
        children: [
          {
            label: "Workforce Planning",
            icon: TrendingUp,
            href: "/hr/workforce",
            requiredPermission: "hr:analytics:read",
          },
          {
            label: "Cost Analysis",
            icon: Coins,
            href: "/hr/workforce-cost",
            requiredPermission: "hr:analytics:read",
          },
          {
            label: "Contingent Workforce",
            icon: Briefcase,
            href: "/hr/contingent",
            requiredPermission: "hr:contracts:view",
          },
        ],
      },
      {
        label: "People Ops",
        icon: UserCheck,
        href: "/hr/cases",
        requiredPermission: [
          "hr:cases:view",
          "hr:helpdesk:view",
          "hr:engagement:view",
          "hr:accommodations:view",
        ],
        children: [
          {
            label: "Service Delivery",
            icon: LifeBuoy,
            href: "/hr/service-delivery",
            requiredPermission: ["hr:cases:view", "hr:helpdesk:view"],
          },
          {
            label: "Employee Relations",
            icon: Scale,
            href: "/hr/cases",
            requiredPermission: "hr:cases:view",
          },
          {
            label: "HR Helpdesk",
            icon: LifeBuoy,
            href: "/hr/helpdesk",
            requiredPermission: "hr:helpdesk:view",
          },
          {
            label: "Engagement",
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
        label: "Compliance & Risk",
        icon: Shield,
        href: "/hr/compliance",
        requiredPermission: [
          "hr:compliance:manage",
          "hr:safety:view",
          "hr:emergency:manage",
          "hr:labor:view",
          "hr:legalhold:view",
          "hr:retention:manage",
        ],
        children: [
          {
            label: "Compliance",
            icon: Scale,
            href: "/hr/compliance",
            requiredPermission: "hr:compliance:manage",
          },
          {
            label: "Health & Safety",
            icon: ShieldAlert,
            href: "/hr/safety",
            requiredPermission: "hr:safety:view",
          },
          {
            label: "Emergency",
            icon: ShieldAlert,
            href: "/hr/emergency",
            requiredPermission: "hr:emergency:manage",
          },
          {
            label: "Labor Relations",
            icon: Scale,
            href: "/hr/labor-relations",
            requiredPermission: "hr:labor:view",
          },
          {
            label: "Legal Holds",
            icon: Lock,
            href: "/hr/legal-holds",
            requiredPermission: "hr:legalhold:view",
          },
          {
            label: "Data Retention",
            icon: Scale,
            href: "/hr/retention",
            requiredPermission: "hr:retention:manage",
          },
        ],
      },
      {
        label: "Governance",
        icon: ShieldCheck,
        href: "/hr/identity",
        requiredPermission: [
          "hr:identity:view",
          "hr:employees:view",
          "hr:policies:view",
          "hr:eventstream:view",
        ],
        children: [
          {
            label: "Identity & Access",
            icon: Lock,
            href: "/hr/identity",
            requiredPermission: "hr:identity:view",
          },
          {
            label: "Delegations",
            icon: Share2,
            href: "/hr/delegations",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Simulator",
            icon: Sparkles,
            href: "/hr/simulator",
            requiredPermission: "hr:policies:view",
          },
          {
            label: "Event Stream",
            icon: TrendingUp,
            href: "/hr/event-stream",
            requiredPermission: "hr:eventstream:view",
          },
        ],
      },
      {
        label: "Announcements",
        icon: Bell,
        href: "/hr/announcements",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Exit Management",
        icon: UserMinus,
        href: "/hr/exit",
        requiredPermission: "hr:employees:update",
        children: [
          {
            label: "Full & Final",
            icon: FileCheck,
            href: "/hr/fnf",
            requiredPermission: "hr:payroll:approve",
          },
          {
            label: "Termination",
            icon: UserX,
            href: "/hr/termination",
            requiredPermission: "hr:employees:delete",
          },
          {
            label: "Background Check",
            icon: ShieldCheck,
            href: "/hr/background-verification",
            requiredPermission: "hr:documents:manage",
          },
        ],
      },
      {
        label: "HR Analytics",
        icon: BarChart3,
        href: "/hr/analytics",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/hr/access",
        requiredPermission: "hr:access:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/hr/settings/import-export",
        requiredPermission: "hr:employees:view",
        children: [
          {
            label: "Import / Export",
            icon: FileText,
            href: "/hr/settings/import-export",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Integrations",
            icon: Plug,
            href: "/hr/settings/integrations",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Policies",
            icon: FileText,
            href: "/hr/settings/policies",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Workflows",
            icon: Workflow,
            href: "/hr/settings/workflows",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Templates",
            icon: LayoutTemplate,
            href: "/hr/settings/templates",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Forms",
            icon: ClipboardList,
            href: "/hr/settings/forms",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Custom Fields",
            icon: Sliders,
            href: "/hr/settings/custom-fields",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Preview",
            icon: FileSearch,
            href: "/hr/settings/preview",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Versions",
            icon: History,
            href: "/hr/settings/versions",
            requiredPermission: "hr:employees:view",
          },
          {
            label: "Automations",
            icon: Workflow,
            href: "/hr/settings/automations",
            requiredPermission: "settings:automations:view",
          },
        ],
      },
    ],
  },
  {
    label: "Recruitment",
    module: "hrms",
    requiredPermission: [
      "hr:employees:view",
      "hr:employees:create",
      "hr:offers:view",
      "hr:interviews:view",
      "hr:requisitions:view",
    ],
    routes: [
      {
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/hr/recruitment",
        exact: true,
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Jobs",
        icon: Briefcase,
        href: "/hr/recruitment/jobs",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Candidates",
        icon: Users,
        href: "/hr/recruitment/candidates",
        exact: true,
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Pipeline",
        icon: KanbanSquare,
        href: "/hr/recruitment/pipeline",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Intake Inbox",
        icon: Inbox,
        href: "/hr/recruitment/candidates/intake",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Interviews",
        icon: Video,
        href: "/hr/recruitment/interviews",
        requiredPermission: "hr:interviews:view",
      },
      {
        label: "Offers",
        icon: FileCheck,
        href: "/hr/recruitment/offers",
        requiredPermission: "hr:offers:view",
      },
      {
        label: "Referrals",
        icon: Share2,
        href: "/hr/recruitment/referrals",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Vendors",
        icon: Truck,
        href: "/hr/recruitment/vendors",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Talent Pools",
        icon: Layers,
        href: "/hr/recruitment/talent-pools",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Analytics",
        icon: BarChart3,
        href: "/hr/recruitment/analytics",
        requiredPermission: "hr:interviews:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/hr/recruitment/settings",
        requiredPermission: "hr:employees:manage",
      },
    ],
  },
  {
    label: "Payroll",
    module: "payroll",
    requiredPermission: [
      "payroll:runs:view",
      "payroll:salaries:view",
      "self:payroll",
    ],
    routes: [
      {
        label: "My Payroll",
        icon: Wallet,
        href: "/payroll/me",
        requiredPermission: ["self:payroll", "self:payslips"],
      },
      {
        label: "Team Payroll",
        icon: Users,
        href: "/payroll/team",
        requiredPermission: "self:payroll",
      },
      {
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/payroll",
        exact: true,
        requiredPermission: "payroll:runs:view",
      },
      {
        label: "Run Payroll",
        icon: PlayCircle,
        href: "/payroll/runs",
        requiredPermission: "payroll:runs:create",
      },
      {
        label: "Employees",
        icon: Users,
        href: "/payroll/employees",
        requiredPermission: "payroll:salaries:view",
      },
      {
        label: "Salary Structures",
        icon: IndianRupee,
        href: "/payroll/salary-structures",
        requiredPermission: "hr:salary:view",
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        href: "/payroll/templates",
        requiredPermission: "payroll:templates:view",
      },
      {
        label: "Components",
        icon: SlidersHorizontal,
        href: "/payroll/components",
        requiredPermission: "payroll:components:view",
      },
      {
        label: "Attendance Inputs",
        icon: Clock,
        href: "/payroll/inputs",
        requiredPermission: "payroll:runs:create",
      },
      {
        label: "Reimbursements",
        icon: RefreshCcw,
        href: "/payroll/reimbursements",
        requiredPermission: "payroll:runs:create",
      },
      {
        label: "Bonuses & Incentives",
        icon: Award,
        href: "/payroll/bonuses",
        requiredPermission: "payroll:runs:create",
      },
      {
        label: "Loans & Advances",
        icon: Coins,
        href: "/payroll/loans",
        requiredPermission: "payroll:runs:create",
      },
      {
        label: "Taxes & Statutory",
        icon: Calculator,
        href: "/payroll/taxes",
        requiredPermission: "payroll:tax:view",
      },
      {
        label: "Bank Transfers",
        icon: Landmark,
        href: "/payroll/bank-transfers",
        requiredPermission: "payroll:bank:view",
      },
      {
        label: "Payslips",
        icon: FileText,
        href: "/payroll/payslips",
        requiredPermission: "payroll:payslips:view",
      },
      {
        label: "FNF Settlement",
        icon: FileCheck,
        href: "/payroll/fnf",
        requiredPermission: "payroll:fnf:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/payroll/reports",
        requiredPermission: "payroll:reports:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/payroll/settings",
        requiredPermission: "payroll:settings:manage",
        children: [
          {
            label: "Policy",
            icon: SlidersHorizontal,
            href: "/payroll/settings",
            exact: true,
            requiredPermission: "payroll:settings:manage",
          },
          {
            label: "Import / Export",
            icon: FileText,
            href: "/payroll/settings/import-export",
            requiredPermission: "payroll:reports:view",
          },
        ],
      },
    ],
  },
  {
    label: "CRM",
    module: "crm",
    requiredPermission: ["crm:leads:view", "crm:reports:view"],
    routes: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        href: "/crm",
        exact: true,
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Inbox",
        icon: Inbox,
        href: "/crm/inbox",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Leads",
        icon: Contact2,
        href: "/crm/leads",
        requiredPermission: "crm:leads:view",
        children: [
          {
            label: "Smart Search",
            icon: Search,
            href: "/crm/leads/smart-search",
          },
          {
            label: "Distribute Leads",
            icon: Share2,
            href: "/crm/leads/distribute",
          },
          {
            label: "Duplicate Detection",
            icon: Copy,
            href: "/crm/leads/duplicates",
          },
          {
            label: "Source Report",
            icon: BarChart2,
            href: "/crm/leads/source-report",
          },
        ],
      },
      {
        label: "Contacts",
        icon: Users,
        href: "/crm/contacts",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Companies",
        icon: Building2,
        href: "/crm/companies",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Clients",
        icon: UserCheck,
        href: "/crm/clients",
        requiredPermission: "crm:clients:read",
      },
      {
        label: "Quotes",
        icon: FileText,
        href: "/crm/quotes",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Deals",
        icon: Handshake,
        href: "/crm/deals",
        requiredPermission: "crm:leads:view",
        children: [
          {
            label: "Forecast",
            icon: TrendingUp,
            href: "/crm/deals/forecast",
            requiredPermission: "crm:leads:view",
          },
          {
            label: "Deal Approvals",
            icon: Briefcase,
            href: "/crm/deals/approvals",
          },
          {
            label: "Deal Aging",
            icon: Clock,
            href: "/crm/deals/aging",
          },
          {
            label: "Win/Loss Analysis",
            icon: TrendingUp,
            href: "/crm/deals/win-loss",
          },
        ],
      },
      {
        label: "Campaigns",
        icon: Megaphone,
        href: "/crm/campaigns",
        requiredPermission: "crm:campaigns:view",
      },
      {
        label: "Activities",
        icon: Activity,
        href: "/crm/activities",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Tasks",
        icon: CheckSquare,
        href: "/crm/tasks",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/crm/reports",
        requiredPermission: "crm:reports:view",
        children: [
          {
            label: "Analytics",
            icon: BarChart2,
            href: "/crm/analytics",
          },
        ],
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/crm/access",
        requiredPermission: "crm:access:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/crm/settings/assignment-rules",
        requiredPermission: "settings:manage",
        children: [
          {
            label: "Assignment Rules",
            icon: SlidersHorizontal,
            href: "/crm/settings/assignment-rules",
          },
          {
            label: "Email Templates",
            icon: MailOpen,
            href: "/crm/settings/email-templates",
          },
          {
            label: "Scoring Rules",
            icon: Star,
            href: "/crm/settings/scoring-rules",
          },
          {
            label: "SLA Rules",
            icon: Clock,
            href: "/crm/settings/sla",
          },
          {
            label: "Custom Fields",
            icon: Sliders,
            href: "/crm/settings/custom-fields",
          },
          {
            label: "Automations",
            icon: Zap,
            href: "/crm/settings/automations",
          },
          {
            label: "AI Settings",
            icon: Brain,
            href: "/crm/settings/ai",
            requiredPermission: "settings:manage",
          },
          {
            label: "Product Catalog",
            icon: Package,
            href: "/crm/settings/products",
            requiredPermission: "settings:manage",
          },
          {
            label: "Audit Log",
            icon: History,
            href: "/crm/settings/audit-log",
          },
          {
            label: "Import / Export",
            icon: FileText,
            href: "/crm/settings/import-export",
          },
        ],
      },
    ],
  },
  {
    label: "Accounting & Finance",
    module: "finance",
    requiredPermission: ["accounting:view"],
    routes: [
      {
        label: "Overview",
        icon: Calculator,
        href: "/accounting",
        exact: true,
        requiredPermission: "accounting:view",
      },
      {
        label: "Sales",
        icon: TrendingUp,
        href: "/accounting/invoices",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Invoices",
            icon: FileText,
            href: "/accounting/invoices",
            requiredPermission: "accounting:view",
          },
          {
            label: "Customers",
            icon: Users,
            href: "/accounting/customers",
            requiredPermission: "accounting:view",
          },
          {
            label: "Recurring invoices",
            icon: RefreshCcw,
            href: "/accounting/recurring-invoices",
            requiredPermission: "accounting:view",
          },
          {
            label: "Credit notes",
            icon: FileStack,
            href: "/accounting/credit-notes",
            requiredPermission: "accounting:view",
          },
          {
            label: "Payments received",
            icon: HandCoins,
            href: "/accounting/payments-received",
            requiredPermission: "accounting:view",
          },
          {
            label: "Payment reminders",
            icon: Bell,
            href: "/accounting/payment-reminders",
            requiredPermission: "accounting:view",
          },
          {
            label: "Aged receivables",
            icon: Clock,
            href: "/accounting/aged-receivables",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Purchases",
        icon: ShoppingCart,
        href: "/accounting/purchase-bills",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Purchase bills",
            icon: Receipt,
            href: "/accounting/purchase-bills",
            requiredPermission: "accounting:view",
          },
          {
            label: "Vendors",
            icon: Truck,
            href: "/accounting/vendors",
            requiredPermission: "accounting:view",
          },
          {
            label: "Recurring bills",
            icon: RefreshCcw,
            href: "/accounting/recurring-bills",
            requiredPermission: "accounting:view",
          },
          {
            label: "Vendor credits",
            icon: FileStack,
            href: "/accounting/vendor-credits",
            requiredPermission: "accounting:view",
          },
          {
            label: "Vendor payments",
            icon: Coins,
            href: "/accounting/vendor-payments",
            requiredPermission: "accounting:view",
          },
          {
            label: "Payment runs",
            icon: PlayCircle,
            href: "/accounting/payment-runs",
            requiredPermission: "accounting:view",
          },
          {
            label: "Aged payables",
            icon: Clock,
            href: "/accounting/aged-payables",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Banking",
        icon: Landmark,
        href: "/accounting/banking",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Bank accounts",
            icon: Landmark,
            href: "/accounting/banking",
            exact: true,
            requiredPermission: "accounting:view",
          },
          {
            label: "Import statement",
            icon: ArrowDownToLine,
            href: "/accounting/banking/import",
            requiredPermission: "accounting:view",
          },
          {
            label: "Reconciliation",
            icon: Scale,
            href: "/accounting/banking/reconciliation",
            requiredPermission: "accounting:view",
          },
          {
            label: "Transfers",
            icon: ArrowLeftRight,
            href: "/accounting/banking/transfers",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Expenses",
        icon: Wallet,
        href: "/accounting/expenses",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Expenses",
            icon: Wallet,
            href: "/accounting/expenses",
            exact: true,
            requiredPermission: "accounting:view",
          },
          {
            label: "Receipt inbox",
            icon: Inbox,
            href: "/accounting/expenses/receipts",
            requiredPermission: "accounting:view",
          },
          {
            label: "Reimbursements",
            icon: RefreshCcw,
            href: "/accounting/expenses/reimbursements",
            requiredPermission: "accounting:view",
          },
          {
            label: "Policies",
            icon: FileText,
            href: "/accounting/expenses/policies",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Accounting",
        icon: BookOpen,
        href: "/accounting/coa",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Chart of accounts",
            icon: BookOpen,
            href: "/accounting/coa",
            requiredPermission: "accounting:view",
          },
          {
            label: "Journal entries",
            icon: NotebookPen,
            href: "/accounting/journal",
            requiredPermission: "accounting:view",
          },
          {
            label: "General ledger",
            icon: ClipboardList,
            href: "/accounting/general-ledger",
            requiredPermission: "accounting:view",
          },
          {
            label: "Period close",
            icon: Lock,
            href: "/accounting/period-close",
            requiredPermission: "accounting:manage",
          },
          {
            label: "Opening balances",
            icon: Scale,
            href: "/accounting/opening-balances",
            requiredPermission: "accounting:manage",
          },
          {
            label: "Dimensions",
            icon: Tag,
            href: "/accounting/dimensions",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Taxes",
        icon: Percent,
        href: "/accounting/taxes",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Tax dashboard",
            icon: Percent,
            href: "/accounting/taxes",
            exact: true,
            requiredPermission: "accounting:view",
          },
          {
            label: "GSTR-1",
            icon: FileText,
            href: "/accounting/gstr-1",
            requiredPermission: "accounting:view",
          },
          {
            label: "GSTR-3B",
            icon: BarChart2,
            href: "/accounting/gstr-3b",
            requiredPermission: "accounting:view",
          },
          {
            label: "Tax payments",
            icon: Coins,
            href: "/accounting/taxes/payments",
            requiredPermission: "accounting:view",
          },
          {
            label: "Tax codes",
            icon: Tag,
            href: "/accounting/taxes/codes",
            requiredPermission: "accounting:manage",
          },
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/accounting/reports",
        requiredPermission: "accounting:report",
        children: [
          {
            label: "All reports",
            icon: BarChart3,
            href: "/accounting/reports",
            requiredPermission: "accounting:report",
          },
          {
            label: "Trial balance",
            icon: Scale,
            href: "/accounting/trial-balance",
            requiredPermission: "accounting:report",
          },
          {
            label: "Profit & loss",
            icon: TrendingUp,
            href: "/accounting/profit-loss",
            requiredPermission: "accounting:report",
          },
          {
            label: "Balance sheet",
            icon: Landmark,
            href: "/accounting/balance-sheet",
            requiredPermission: "accounting:report",
          },
          {
            label: "Cash flow",
            icon: Coins,
            href: "/accounting/cash-flow",
            requiredPermission: "accounting:report",
          },
        ],
      },
      {
        label: "Budgets",
        icon: PiggyBank,
        href: "/accounting/budgets",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Budgets",
            icon: PiggyBank,
            href: "/accounting/budgets",
            requiredPermission: "accounting:view",
          },
          {
            label: "Cash forecast",
            icon: TrendingDown,
            href: "/accounting/forecast",
            requiredPermission: "accounting:view",
          },
          {
            label: "Scenarios",
            icon: Layers,
            href: "/accounting/scenarios",
            requiredPermission: "accounting:view",
          },
        ],
      },
      {
        label: "Assets",
        icon: Package,
        href: "/accounting/assets",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Fixed assets",
            icon: Package,
            href: "/accounting/assets",
            requiredPermission: "accounting:view",
          },
          {
            label: "Depreciation runs",
            icon: TrendingDown,
            href: "/accounting/assets/depreciation",
            requiredPermission: "accounting:manage",
          },
        ],
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/accounting/settings",
        requiredPermission: "accounting:manage",
      },
    ],
  },
  {
    label: "Inventory",
    module: "inventory",
    requiredPermission: ["inventory:stock:read", "inventory:products:read"],
    routes: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/inventory",
        exact: true,
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Products",
        icon: Tag,
        href: "/inventory/products",
        requiredPermission: "inventory:products:read",
        children: [
          {
            label: "Categories",
            icon: Layers,
            href: "/inventory/products/categories",
            requiredPermission: "inventory:products:read",
          },
          {
            label: "Units of Measure",
            icon: Calculator,
            href: "/inventory/products/uom",
            requiredPermission: "inventory:products:read",
          },
        ],
      },
      {
        label: "Stock",
        icon: Warehouse,
        href: "/inventory/stock",
        requiredPermission: "inventory:stock:read",
        children: [
          {
            label: "Adjustments",
            icon: ClipboardList,
            href: "/inventory/stock/adjustments",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Transfers",
            icon: ArrowLeftRight,
            href: "/inventory/stock/transfers",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Movements",
            icon: History,
            href: "/inventory/stock/movements",
            requiredPermission: "inventory:stock:read",
          },
        ],
      },
      {
        label: "Warehouses",
        icon: Building2,
        href: "/inventory/warehouses",
        requiredPermission: "inventory:warehouses:read",
      },
      {
        label: "Vendors",
        icon: Truck,
        href: "/inventory/vendors",
        requiredPermission: "inventory:vendors:read",
      },
      {
        label: "Purchase Orders",
        icon: ShoppingCart,
        href: "/inventory/purchase-orders",
        requiredPermission: "inventory:purchase-orders:read",
      },
      {
        label: "Sales Orders",
        icon: FileText,
        href: "/inventory/sales-orders",
        requiredPermission: "inventory:sales-orders:read",
      },
      {
        label: "Operations",
        icon: Activity,
        href: "/inventory/operations",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/inventory/reports/stock-summary",
        requiredPermission: "inventory:reports:read",
        children: [
          {
            label: "Stock Summary",
            icon: BarChart2,
            href: "/inventory/reports/stock-summary",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Movements",
            icon: ArrowLeftRight,
            href: "/inventory/reports/movements",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Reorder",
            icon: RefreshCcw,
            href: "/inventory/reports/reorder",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Slow Moving",
            icon: TrendingDown,
            href: "/inventory/reports/slow-moving",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Expiry",
            icon: CalendarClock,
            href: "/inventory/reports/expiry",
            requiredPermission: "inventory:reports:read",
          },
        ],
      },
      {
        label: "Quality",
        icon: ShieldCheck,
        href: "/inventory/quality",
        requiredPermission: "inventory:quality:read",
      },
      {
        label: "Shipments",
        icon: Package,
        href: "/inventory/shipments",
        requiredPermission: "inventory:shipments:manage",
        children: [
          {
            label: "Packages",
            icon: Container,
            href: "/inventory/packages",
            requiredPermission: "inventory:shipments:manage",
          },
          {
            label: "Loads",
            icon: Boxes,
            href: "/inventory/loads",
            requiredPermission: "inventory:shipments:manage",
          },
          {
            label: "Carriers",
            icon: Truck,
            href: "/inventory/carriers",
            requiredPermission: "inventory:shipments:manage",
          },
          {
            label: "3PL Connections",
            icon: Globe,
            href: "/inventory/3pl",
            requiredPermission: "inventory:shipments:manage",
          },
        ],
      },
      {
        label: "Traceability",
        icon: Scan,
        href: "/inventory/lots",
        requiredPermission: "inventory:stock:read",
        children: [
          {
            label: "Lots",
            icon: Boxes,
            href: "/inventory/lots",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Serials",
            icon: PackageCheck,
            href: "/inventory/serials",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Expiry",
            icon: CalendarClock,
            href: "/inventory/expiry",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Cycle Counts",
            icon: RotateCcw,
            href: "/inventory/cycle-counts",
            requiredPermission: "inventory:stock:read",
          },
          {
            label: "Physical Audits",
            icon: ClipboardCheck,
            href: "/inventory/physical-audits",
            requiredPermission: "inventory:stock:read",
          },
        ],
      },
      {
        label: "Planning",
        icon: TrendingUp,
        href: "/inventory/replenishment",
        requiredPermission: "inventory:reports:read",
        children: [
          {
            label: "Replenishment",
            icon: RefreshCcw,
            href: "/inventory/replenishment",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Forecasting",
            icon: BarChart2,
            href: "/inventory/forecasting",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Valuation",
            icon: DollarSign,
            href: "/inventory/valuation",
            requiredPermission: "inventory:reports:read",
          },
          {
            label: "Costing",
            icon: Calculator,
            href: "/inventory/costing",
            requiredPermission: "inventory:reports:read",
          },
        ],
      },
      {
        label: "Channels",
        icon: Globe,
        href: "/inventory/channels",
        requiredPermission: "inventory:channels:manage",
      },
      {
        label: "Barcode",
        icon: Scan,
        href: "/inventory/barcode",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Import",
        icon: Upload,
        href: "/inventory/import",
        requiredPermission: "inventory:products:read",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/inventory/settings",
        requiredPermission: "inventory:settings:manage",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/inventory/access",
        requiredPermission: "inventory:access:view",
      },
    ],
  },
  {
    label: "Timesheets",
    module: "timesheets",
    requiredPermission: [
      "timesheets:entries:view",
      "timesheets:team:view",
      "timesheets:approvals:view",
      "timesheets:billing:view",
      "timesheets:payroll:view",
      "timesheets:reports:view",
      "timesheets:settings:view",
    ],
    routes: [
      {
        label: "My Time",
        icon: Timer,
        href: "/timesheets",
        exact: true,
        requiredPermission: "timesheets:entries:view",
      },
      {
        label: "Team",
        icon: Users,
        href: "/timesheets/team",
        requiredPermission: "timesheets:team:view",
      },
      {
        label: "Approvals",
        icon: ListChecks,
        href: "/timesheets/approvals",
        requiredPermission: "timesheets:approvals:view",
      },
      {
        label: "Billing",
        icon: Receipt,
        href: "/timesheets/billing",
        requiredPermission: "timesheets:billing:view",
      },
      {
        label: "Payroll",
        icon: Banknote,
        href: "/timesheets/payroll",
        requiredPermission: "timesheets:payroll:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/timesheets/reports",
        requiredPermission: "timesheets:reports:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/timesheets/settings",
        requiredPermission: "timesheets:settings:view",
      },
    ],
  },
  {
    label: "Projects",
    module: "projects",
    requiredPermission: ["projects:view", "projects:tickets:view"],
    routes: [
      {
        label: "Home",
        icon: LayoutDashboard,
        href: "/projects/command-center",
        requiredPermission: "projects:view",
      },
      {
        label: "Inbox",
        icon: Inbox,
        href: "/projects/inbox",
        requiredPermission: "projects:tickets:view",
      },
      {
        label: "My issues",
        icon: CheckSquare,
        href: "/projects/my-work",
        requiredPermission: "projects:tickets:view",
      },
      {
        label: "Drafts",
        icon: FileText,
        href: "/projects/drafts",
        requiredPermission: "projects:tickets:view",
      },
      {
        label: "All issues",
        icon: Layers,
        href: "/projects/all-work",
        requiredPermission: "projects:tickets:view",
      },
      {
        label: "Projects",
        icon: Briefcase,
        href: "/projects",
        exact: true,
        requiredPermission: "projects:view",
      },
      {
        label: "Teams",
        icon: Network,
        href: "/projects/teams",
        requiredPermission: "projects:teams:view",
      },
      {
        label: "Members",
        icon: Users,
        href: "/projects/members",
        requiredPermission: "projects:view",
      },
      {
        label: "Customers",
        icon: Building2,
        href: "/projects/customers",
        requiredPermission: "crm:leads:view",
      },
    ],
  },
  {
    label: "More",
    module: "projects",
    defaultCollapsed: true,
    requiredPermission: [
      "projects:roadmap:view",
      "projects:goals:view",
      "projects:portfolios:view",
      "projects:managed-products:view",
      "projects:approvals:view",
      "projects:create",
      "settings:manage",
    ],
    routes: [
      {
        label: "Roadmap",
        icon: Map,
        href: "/projects/roadmap",
        requiredPermission: "projects:roadmap:view",
      },
      {
        label: "Goals",
        icon: Target,
        href: "/projects/goal",
        requiredPermission: "projects:goals:view",
      },
      {
        label: "Portfolios",
        icon: LayoutGrid,
        href: "/projects/portfolios",
        requiredPermission: "projects:portfolios:view",
      },
      {
        label: "Managed Products",
        icon: Layers,
        href: "/projects/managed-products",
        requiredPermission: "projects:managed-products:view",
      },
      {
        label: "Approvals",
        icon: ClipboardCheck,
        href: "/projects/approvals",
        requiredPermission: "projects:approvals:view",
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        href: "/projects/templates",
        requiredPermission: "projects:create",
      },
      {
        label: "Settings",
        icon: Plug,
        href: "/projects/settings/integrations",
        requiredPermission: "settings:manage",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/projects/access",
        requiredPermission: "projects:access:view",
      },
    ],
  },
  {
    label: "Support",
    module: "helpdesk",
    requiredPermission: [
      "projects:tickets:view",
      "support:kb:view",
      "support:portal:tickets:view",
    ],
    routes: [
      {
        label: "All Tickets",
        icon: LifeBuoy,
        href: "/support",
        requiredPermission: "projects:tickets:view",
        children: [
          {
            label: "Support Inbox",
            icon: Inbox,
            href: "/support/inbox",
            requiredPermission: "projects:tickets:view",
          },
        ],
      },
      {
        label: "Canned Responses",
        icon: MailOpen,
        href: "/support/macros",
        requiredPermission: "support:macros:view",
      },
      {
        label: "Routing Rules",
        icon: Share2,
        href: "/support/routing",
        requiredPermission: "support:macros:view",
      },
      {
        label: "Customer Portal",
        icon: Globe,
        href: "/support/portal",
        requiredPermission: "support:portal:tickets:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/support/reports",
        requiredPermission: "support:reports:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/support/settings/automations",
        requiredPermission: "settings:automations:view",
        children: [
          {
            label: "Automations",
            icon: Workflow,
            href: "/support/settings/automations",
            requiredPermission: "settings:automations:view",
          },
          {
            label: "SLA Policies",
            icon: Scale,
            href: "/support/settings/sla",
            requiredPermission: "support:settings:manage",
          },
          {
            label: "Business Hours",
            icon: Clock,
            href: "/support/settings/business-hours",
            requiredPermission: "support:settings:manage",
          },
          {
            label: "Channels",
            icon: Network,
            href: "/support/settings/channels",
            requiredPermission: "support:channels:manage",
          },
          {
            label: "Custom Fields",
            icon: ListChecks,
            href: "/support/settings/custom-fields",
            requiredPermission: "support:settings:manage",
          },
          {
            label: "Audit Log",
            icon: History,
            href: "/support/settings/audit-log",
            requiredPermission: "support:settings:manage",
          },
        ],
      },
    ],
  },
  {
    label: "SignOS",
    module: "sign",
    requiredPermission: ["sign:envelope:view", "sign:template:manage"],
    routes: [
      {
        label: "Dashboard",
        icon: PenTool,
        href: "/sign",
        exact: true,
        requiredPermission: "sign:envelope:view",
      },
      {
        label: "Envelopes",
        icon: FileText,
        href: "/sign/envelopes",
        requiredPermission: "sign:envelope:view",
      },
      {
        label: "Templates",
        icon: FileStack,
        href: "/sign/templates",
        requiredPermission: "sign:template:manage",
      },
      {
        label: "Bulk Send",
        icon: Send,
        href: "/sign/bulk-send",
        requiredPermission: "sign:bulk_send:run",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/sign/reports",
        requiredPermission: "sign:audit:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/sign/settings",
        requiredPermission: "sign:admin:manage",
      },
    ],
  },
  {
    label: "Knowledge",
    module: "documents",
    requiredPermission: ["kb:pages:view"],
    routes: [
      {
        label: "Wiki",
        icon: NotebookPen,
        href: "/knowledge",
        requiredPermission: "kb:pages:view",
      },
      {
        label: "Ask KB",
        icon: Library,
        href: "/knowledge/chat",
        requiredPermission: "kb:pages:view",
      },
    ],
  },
  {
    label: "Surveys",
    module: "surveys",
    requiredPermission: "surveys:view",
    routes: [
      {
        label: "Surveys",
        icon: ClipboardList,
        href: "/surveys",
        requiredPermission: "surveys:view",
      },
    ],
  },
  {
    label: "Organization",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Organization Settings",
        icon: Building2,
        href: "/settings/organization",
        requiredPermission: "settings:manage",
      },
    ],
  },
  {
    label: "Structure",
    module: "hrms",
    requiredPermission: ["settings:manage", "settings:view"],
    routes: [
      {
        label: "Overview",
        icon: Building2,
        href: "/organization",
        exact: true,
        requiredPermission: "settings:view",
      },
      {
        label: "Business Units",
        icon: Network,
        href: "/organization/business-units",
        requiredPermission: "settings:view",
      },
      {
        label: "Departments",
        icon: Briefcase,
        href: "/organization/departments",
        requiredPermission: "settings:view",
      },
      {
        label: "Teams",
        icon: Users,
        href: "/organization/teams",
        requiredPermission: "settings:view",
      },
      {
        label: "Branches",
        icon: GitBranch,
        href: "/organization/branches",
        requiredPermission: "settings:view",
      },
      {
        label: "Locations",
        icon: Map,
        href: "/organization/locations",
        requiredPermission: "settings:view",
      },
      {
        label: "Cost Centers",
        icon: Coins,
        href: "/organization/cost-centers",
        requiredPermission: "settings:view",
      },
      {
        label: "Organization Chart",
        icon: Network,
        href: "/organization/tree",
        requiredPermission: "settings:view",
      },
    ],
  },
  {
    label: "People",
    requiredPermission: "hr:employees:view",
    routes: [
      {
        label: "Users",
        icon: UserCog,
        href: "/users",
        exact: true,
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Invitations",
        icon: MailOpen,
        href: "/users/invitations",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Suspended Users",
        icon: ShieldAlert,
        href: "/users/suspended",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Archived Users",
        icon: UserX,
        href: "/users/archived",
        requiredPermission: "hr:employees:view",
      },
    ],
  },
  {
    label: "Directory",
    requiredPermission: [
      "directory:people:view",
      "workforce:workers:view",
      "party:parties:view",
      "projects:portal:view",
    ],
    routes: [
      {
        label: "People Directory",
        icon: Contact2,
        href: "/directory",
        exact: true,
        requiredPermission: "directory:people:view",
      },
      {
        label: "Workers",
        icon: Briefcase,
        href: "/directory/workers",
        requiredPermission: "workforce:workers:view",
      },
      {
        label: "Business Parties",
        icon: Building2,
        href: "/parties",
        requiredPermission: "party:parties:view",
      },
      {
        label: "Client Access",
        icon: ShieldCheck,
        href: "/client-access",
        requiredPermission: "projects:portal:view",
      },
    ],
  },
  {
    label: "Access Control",
    requiredPermission: ["settings:rbac:manage", "settings:manage"],
    routes: [
      {
        label: "Roles",
        icon: Shield,
        href: "/settings/roles",
        requiredPermission: "settings:rbac:manage",
      },
      {
        label: "Permission Matrix",
        icon: ShieldAlert,
        href: "/settings/permissions",
        requiredPermission: "settings:rbac:manage",
      },
      {
        label: "Role Assignment",
        icon: UserCheck,
        href: "/settings/rbac",
        requiredPermission: "settings:rbac:manage",
      },
      {
        label: "Access Policies",
        icon: ShieldCheck,
        href: "/settings/delegations",
        requiredPermission: "settings:manage",
      },
    ],
  },
  {
    label: "Subscription",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Billing & Plan",
        icon: CreditCard,
        href: "/billing",
        exact: true,
        requiredPermission: "settings:manage",
      },
      {
        label: "AI Credits",
        icon: Zap,
        href: "/billing/ai-credits",
        requiredPermission: "billing:ai-credits:view",
      },
    ],
  },
  {
    label: "Platform",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Modules",
        icon: LayoutGrid,
        href: "/settings/modules",
        requiredPermission: "settings:manage",
      },
    ],
  },
  {
    label: "Security",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Session Policy",
        icon: Clock,
        href: "/settings/sessions",
        requiredPermission: "settings:manage",
      },
      {
        label: "Trusted Devices",
        icon: Smartphone,
        href: "/settings/devices",
        requiredPermission: "settings:manage",
      },
      {
        label: "Login History",
        icon: History,
        href: "/settings/login-history",
        requiredPermission: "settings:manage",
      },
      {
        label: "Audit Logs",
        icon: History,
        href: "/settings/audit-log",
        requiredPermission: "settings:manage",
      },
    ],
  },
  {
    label: "Developer",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Webhooks",
        icon: Zap,
        href: "/settings/webhooks",
        requiredPermission: "settings:manage",
      },
      {
        label: "API Tokens",
        icon: Key,
        href: "/settings/api-tokens",
        requiredPermission: "settings:manage",
      },
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

function filterRoute(
  route: NavRoute,
  isOwner: boolean,
  granted: Set<string>,
  enabledModules: string[],
): NavRoute | null {
  if (route.module && !isModuleEnabled(route.module, enabledModules))
    return null;
  if (!isOwner && !matchesPermission(route.requiredPermission, granted))
    return null;
  if (route.children && route.children.length > 0) {
    const children = route.children
      .map((c) => filterRoute(c, isOwner, granted, enabledModules))
      .filter((c): c is NavRoute => c !== null);
    return children.length > 0
      ? { ...route, children }
      : { ...route, children: undefined };
  }
  return route;
}

export function getNavGroupsForUser(
  role: string | undefined,
  permissions: string[] | undefined,
  enabledModules: string[] = [],
): NavGroup[] {
  if (!role) return [];

  const isOwner = role === "OWNER";
  const granted = new Set(permissions ?? []);

  return NAV_GROUPS.filter(
    (group) => !group.module || isModuleEnabled(group.module, enabledModules),
  )
    .map((group) => {
      const visibleRoutes = group.routes
        .map((r) => filterRoute(r, isOwner, granted, enabledModules))
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

export function countNavLeaves(routes: NavRoute[]): number {
  let count = 0;
  for (const route of routes) {
    if (route.children && route.children.length > 0) {
      count += countNavLeaves(route.children);
    } else {
      count += 1;
    }
  }
  return count;
}

export function countProductNavLeaves(navGroups: NavGroup[]): number {
  return navGroups.reduce(
    (sum, group) => sum + countNavLeaves(group.routes),
    0,
  );
}

export function shouldHideProductSidebar(navGroups: NavGroup[]): boolean {
  return countProductNavLeaves(navGroups) <= 1;
}

export type ProductKey =
  | "home"
  | "crm"
  | "hrms"
  | "projects"
  | "timesheets"
  | "inventory"
  | "finance"
  | "helpdesk"
  | "documents"
  | "surveys"
  | "administration"
  | "payroll"
  | "sign";

export interface ProductDefinition {
  key: ProductKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { key: "crm", label: "CRM", href: "/crm", icon: Handshake },
  { key: "hrms", label: "HRMS", href: "/hr", icon: Users },
  { key: "projects", label: "Projects", href: "/projects", icon: Briefcase },
  { key: "timesheets", label: "Timesheets", href: "/timesheets", icon: Timer },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: Package },
  { key: "finance", label: "Finance", href: "/accounting", icon: Calculator },
  { key: "helpdesk", label: "Helpdesk", href: "/support", icon: LifeBuoy },
  {
    key: "documents",
    label: "Documents",
    href: "/knowledge",
    icon: Library,
  },
  { key: "surveys", label: "Surveys", href: "/surveys", icon: ClipboardList },
  {
    key: "administration",
    label: "Settings",
    href: "/organization",
    icon: Building2,
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/payroll",
    icon: IndianRupee,
  },
  { key: "sign", label: "SignOS", href: "/sign", icon: PenTool },
];

export const PRODUCT_DESCRIPTIONS: Record<ProductKey, string> = {
  home: "Overview & activity",
  crm: "Leads, deals & contacts",
  hrms: "People & payroll",
  projects: "Plan & deliver work",
  timesheets: "Track, approve & bill time",
  inventory: "Stock & orders",
  finance: "Accounts & books",
  helpdesk: "Tickets & support",
  documents: "Knowledge base",
  surveys: "Surveys & feedback",
  administration: "Settings & access",
  payroll: "Runs, payslips & compliance",
  sign: "Envelopes & e-signatures",
};

export interface ModuleAccent {
  text: string;
  bg: string;
  indicator: string;
  border: string;
}

export const MODULE_ACCENTS: Record<ProductKey, ModuleAccent> = {
  home: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  crm: {
    text: "!text-blue-600 dark:!text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    indicator: "bg-blue-600 dark:bg-blue-500",
    border: "border-blue-600 dark:border-blue-500",
  },
  hrms: {
    text: "!text-emerald-600 dark:!text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    indicator: "bg-emerald-600 dark:bg-emerald-500",
    border: "border-emerald-600 dark:border-emerald-500",
  },
  projects: {
    text: "!text-violet-600 dark:!text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    indicator: "bg-violet-600 dark:bg-violet-500",
    border: "border-violet-600 dark:border-violet-500",
  },
  timesheets: {
    text: "!text-indigo-600 dark:!text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    indicator: "bg-indigo-600 dark:bg-indigo-500",
    border: "border-indigo-600 dark:border-indigo-500",
  },
  inventory: {
    text: "!text-amber-600 dark:!text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    indicator: "bg-amber-600 dark:bg-amber-500",
    border: "border-amber-600 dark:border-amber-500",
  },
  finance: {
    text: "!text-cyan-700 dark:!text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    indicator: "bg-cyan-700 dark:bg-cyan-500",
    border: "border-cyan-700 dark:border-cyan-500",
  },
  helpdesk: {
    text: "!text-rose-600 dark:!text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    indicator: "bg-rose-600 dark:bg-rose-500",
    border: "border-rose-600 dark:border-rose-500",
  },
  documents: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  surveys: {
    text: "!text-teal-600 dark:!text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    indicator: "bg-teal-600 dark:bg-teal-500",
    border: "border-teal-600 dark:border-teal-500",
  },
  administration: {
    text: "!text-slate-600 dark:!text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    indicator: "bg-slate-500 dark:bg-slate-400",
    border: "border-slate-400 dark:border-slate-500",
  },
  payroll: {
    text: "!text-teal-600 dark:!text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    indicator: "bg-teal-600 dark:bg-teal-500",
    border: "border-teal-600 dark:border-teal-500",
  },
  sign: {
    text: "!text-sky-600 dark:!text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    indicator: "bg-sky-600 dark:bg-sky-500",
    border: "border-sky-600 dark:border-sky-500",
  },
};

const PRODUCT_NAV_GROUP_LABELS: Record<ProductKey, string[]> = {
  home: [],
  crm: ["CRM"],
  hrms: ["HR – People", "Recruitment"],
  projects: ["Projects", "More"],
  timesheets: ["Timesheets"],
  inventory: ["Inventory"],
  finance: ["Accounting & Finance"],
  helpdesk: ["Support"],
  documents: [],
  surveys: ["Surveys"],
  administration: [
    "Organization",
    "People",
    "Directory",
    "Access Control",
    "Structure",
    "Subscription",
    "Platform",
    "Security",
    "Developer",
  ],
  payroll: ["Payroll"],
  sign: ["SignOS"],
};

export function withoutHrSetupRoute(groups: NavGroup[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      routes: group.routes.filter((route) => route.href !== "/hr/setup"),
    }))
    .filter((group) => group.routes.length > 0);
}

export function getNavGroupsForProduct(
  productKey: ProductKey,
  role: string | undefined,
  permissions: string[] | undefined,
  enabledModules: string[] = [],
): NavGroup[] {
  if (productKey === "home") {
    return [
      {
        label: "Overview",
        routes: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Mail", href: "/mail", icon: Inbox },
          { label: "Calendar", href: "/calendar", icon: CalendarDays },
          { label: "Chat", href: "/chat", icon: MessageSquareText },
          { label: "Notifications", href: "/notifications", icon: Bell },
        ],
      },
    ];
  }
  if (productKey === "documents") {
    const isOwner = role === "OWNER";
    const granted = new Set(permissions ?? []);
    const documentRoutes = [
      {
        label: "Wiki",
        icon: NotebookPen,
        href: "/knowledge",
      },
      {
        label: "Ask KB",
        icon: Library,
        href: "/knowledge/chat",
      },
    ];
    const visibleRoutes = documentRoutes
      .map((route) => filterRoute(route, isOwner, granted, enabledModules))
      .filter((route): route is NavRoute => route !== null);
    if (visibleRoutes.length === 0) return [];
    return [{ label: "Documents", routes: visibleRoutes }];
  }

  const allGroups = getNavGroupsForUser(role, permissions, enabledModules);
  const labels = PRODUCT_NAV_GROUP_LABELS[productKey];
  return allGroups.filter((g) => labels.includes(g.label));
}

const MODULE_KEY_MAP: Partial<Record<ProductKey, string>> = {
  crm: "CRM",
  hrms: "HR",
  projects: "PROJECTS",
  inventory: "INVENTORY",
  finance: "FINANCE",
  helpdesk: "HELPDESK",
  surveys: "SURVEYS",
  payroll: "PAYROLL",
  sign: "SIGN",
};

export function isModuleEnabled(
  key: ProductKey,
  enabledModules: string[],
): boolean {
  if (key === "home" || key === "administration") return true;
  if (enabledModules.length === 0) return true;
  const moduleName = MODULE_KEY_MAP[key];
  if (!moduleName) return true;
  return enabledModules.map((m) => m.toUpperCase()).includes(moduleName);
}

export function getProductFromPathname(pathname: string): ProductKey {
  if (
    pathname === "/dashboard" ||
    pathname === "/" ||
    pathname.startsWith("/mail") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/notifications")
  )
    return "home";
  if (
    pathname.startsWith("/crm") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/customer-executive")
  )
    return "crm";
  if (pathname.startsWith("/hr") || pathname.startsWith("/recruitment"))
    return "hrms";
  if (pathname.startsWith("/timesheets")) return "timesheets";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/accounting")) return "finance";
  if (pathname.startsWith("/support/kb")) return "documents";
  if (pathname.startsWith("/support")) return "helpdesk";
  if (pathname === "/sign" || pathname.startsWith("/sign/")) return "sign";
  if (pathname.startsWith("/knowledge")) return "documents";
  if (pathname.startsWith("/surveys")) return "surveys";
  if (pathname.startsWith("/payroll")) return "payroll";
  if (
    pathname.startsWith("/organization") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/directory") ||
    pathname.startsWith("/parties") ||
    pathname.startsWith("/client-access")
  )
    return "administration";
  return "home";
}
