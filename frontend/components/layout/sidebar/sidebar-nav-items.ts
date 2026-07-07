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
  UserSearch,
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
  GraduationCap,
  ClipboardCheck,
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
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: "leaves";
  requiredPermission?: string | string[];
  children?: NavRoute[];
  module?: ProductKey;
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
        label: "Employees",
        icon: Users,
        href: "/hr",
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
            label: "Onboarding",
            icon: ClipboardList,
            href: "/hr/onboarding",
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
        label: "Learning",
        icon: GraduationCap,
        href: "/hr/courses",
        requiredPermission: "hr:performance:view",
        children: [
          {
            label: "Courses",
            icon: BookOpen,
            href: "/hr/courses",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Training Programs",
            icon: ClipboardCheck,
            href: "/hr/training",
            requiredPermission: "hr:performance:manage",
          },
          {
            label: "Learning Paths",
            icon: Map,
            href: "/hr/learning-paths",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Skills",
            icon: Zap,
            href: "/hr/skills",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Certifications",
            icon: Award,
            href: "/hr/certifications",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Career Development",
            icon: TrendingUp,
            href: "/hr/career-development",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            href: "/hr/learning/analytics",
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
            label: "Digital Signatures",
            icon: ShieldCheck,
            href: "/hr/signatures",
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
    requiredPermission: ["hr:employees:create"],
    routes: [
      {
        label: "Recruitment Hub",
        icon: UserSearch,
        href: "/hr/recruitment",
        requiredPermission: "hr:employees:create",
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
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/payroll",
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
        requiredPermission: "payroll:salaries:view",
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
        label: "Activities",
        icon: Activity,
        href: "/crm/activities",
        requiredPermission: "crm:leads:view",
      },
      {
        label: "Calendar",
        icon: CalendarDays,
        href: "/crm/calendar",
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
    label: "Accounting",
    module: "finance",
    requiredPermission: ["accounting:view"],
    routes: [
      {
        label: "Overview",
        icon: Calculator,
        href: "/accounting",
        requiredPermission: "accounting:view",
        children: [
          {
            label: "Chart of Accounts",
            icon: BookOpen,
            href: "/accounting/coa",
            requiredPermission: "accounting:view",
          },
          {
            label: "Journal",
            icon: FileText,
            href: "/accounting/journal",
            requiredPermission: "accounting:view",
          },
          {
            label: "Trial Balance",
            icon: Scale,
            href: "/accounting/trial-balance",
            requiredPermission: "accounting:view",
          },
          {
            label: "Profit & Loss",
            icon: TrendingUp,
            href: "/accounting/profit-loss",
            requiredPermission: "accounting:view",
          },
          {
            label: "Balance Sheet",
            icon: Landmark,
            href: "/accounting/balance-sheet",
            requiredPermission: "accounting:view",
          },
          {
            label: "Cash Flow",
            icon: Coins,
            href: "/accounting/cash-flow",
            requiredPermission: "accounting:view",
          },
          {
            label: "Customer Ledgers",
            icon: Users,
            href: "/accounting/customers",
            requiredPermission: "accounting:view",
          },
          {
            label: "Aged Receivables",
            icon: Clock,
            href: "/accounting/aged-receivables",
            requiredPermission: "accounting:view",
          },
          {
            label: "Purchase Bills",
            icon: Receipt,
            href: "/accounting/purchase-bills",
            requiredPermission: "accounting:view",
          },
          {
            label: "Vendor Ledgers",
            icon: Users,
            href: "/accounting/vendors",
            requiredPermission: "accounting:view",
          },
          {
            label: "Aged Payables",
            icon: Clock,
            href: "/accounting/aged-payables",
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
        ],
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/accounting/settings/automations",
        requiredPermission: "settings:automations:view",
        children: [
          {
            label: "Automations",
            icon: Workflow,
            href: "/accounting/settings/automations",
            requiredPermission: "settings:automations:view",
          },
        ],
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
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Products",
        icon: Tag,
        href: "/inventory/products",
        requiredPermission: "inventory:products:read",
      },
      {
        label: "Stock Levels",
        icon: Warehouse,
        href: "/inventory/stock",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Movements",
        icon: ArrowLeftRight,
        href: "/inventory/stock/movements",
        requiredPermission: "inventory:stock:read",
      },
      {
        label: "Warehouses",
        icon: Building2,
        href: "/inventory/warehouses",
        requiredPermission: "inventory:warehouses:read",
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
        label: "Vendors",
        icon: Truck,
        href: "/inventory/vendors",
        requiredPermission: "inventory:vendors:read",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/inventory/reports/stock-summary",
        requiredPermission: "inventory:reports:read",
      },
      {
        label: "Operations",
        icon: Activity,
        href: "/inventory/operations",
        requiredPermission: "inventory:stock:read",
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
      },
      {
        label: "Channels",
        icon: Globe,
        href: "/inventory/channels",
        requiredPermission: "inventory:channels:manage",
      },
      {
        label: "Planning",
        icon: TrendingUp,
        href: "/inventory/replenishment",
        requiredPermission: "inventory:reports:read",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/inventory/settings",
        requiredPermission: "inventory:settings:manage",
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
    requiredPermission: [
      "projects:view",
      "projects:timesheets:view",
      "projects:goals:view",
      "projects:roadmap:view",
    ],
    routes: [
      {
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/projects/command-center",
        requiredPermission: "projects:view",
      },
      {
        label: "My Work",
        icon: CheckSquare,
        href: "/projects/my-work",
        requiredPermission: "projects:tickets:view",
      },
      {
        label: "Approvals",
        icon: ClipboardCheck,
        href: "/projects/approvals",
        requiredPermission: "projects:approvals:view",
      },
      {
        label: "All Projects",
        icon: Briefcase,
        href: "/projects/all",
        requiredPermission: "projects:view",
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        href: "/projects/templates",
        requiredPermission: "projects:create",
      },
      {
        label: "Resource Allocation",
        icon: Users,
        href: "/projects/resource-allocation",
        requiredPermission: "projects:update",
      },
      {
        label: "Whiteboards",
        icon: PenTool,
        href: "/projects/whiteboards",
        requiredPermission: "projects:view",
      },
      {
        label: "Goals & OKRs",
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
        label: "Programs",
        icon: Network,
        href: "/projects/programs",
        requiredPermission: "projects:programs:view",
      },
      {
        label: "Client Portal",
        icon: Globe,
        href: "/projects/portal",
        requiredPermission: "projects:portal:view",
      },
      {
        label: "Roadmap",
        icon: Map,
        href: "/projects/roadmap",
        requiredPermission: "projects:roadmap:view",
      },
      {
        label: "Integrations",
        icon: Plug,
        href: "/projects/settings/integrations",
        requiredPermission: "settings:manage",
      },
    ],
  },
  {
    label: "Support",
    module: "helpdesk",
    requiredPermission: ["projects:tickets:view", "support:kb:view", "support:portal:tickets:view"],
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
        label: "Knowledge Base",
        icon: Library,
        href: "/knowledge-base",
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
    module: "hrms",
    requiredPermission: ["settings:manage", "settings:view"],
    routes: [
      {
        label: "Overview",
        icon: Building2,
        href: "/organization",
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
    requiredPermission: ["settings:manage", "settings:view"],
    routes: [
      {
        label: "Users",
        icon: UserCog,
        href: "/users",
        requiredPermission: "settings:view",
      },
      {
        label: "Invitations",
        icon: MailOpen,
        href: "/users/invitations",
        requiredPermission: "settings:view",
      },
      {
        label: "Suspended Users",
        icon: ShieldAlert,
        href: "/users/suspended",
        requiredPermission: "settings:view",
      },
      {
        label: "Archived Users",
        icon: UserX,
        href: "/users/archived",
        requiredPermission: "settings:view",
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
        label: "Current Plan",
        icon: CreditCard,
        href: "/settings/subscription",
        requiredPermission: "settings:manage",
      },
      {
        label: "Seats",
        icon: Users,
        href: "/billing/seats",
        requiredPermission: "settings:manage",
      },
      {
        label: "AI Credits",
        icon: Zap,
        href: "/billing/ai-credits",
        requiredPermission: "billing:ai-credits:view",
      },
      {
        label: "Billing",
        icon: Wallet,
        href: "/billing",
        requiredPermission: "settings:manage",
      },
      {
        label: "Invoices",
        icon: FileText,
        href: "/billing/invoices",
        requiredPermission: "settings:manage",
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
        label: "Password Policy",
        icon: Lock,
        href: "/settings/security",
        requiredPermission: "settings:manage",
      },
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
      },
      {
        label: "Login History",
        icon: History,
        href: "/settings/login-history",
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
  | "payroll";

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
];

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
};

const PRODUCT_NAV_GROUP_LABELS: Record<ProductKey, string[]> = {
  home: [],
  crm: ["CRM"],
  hrms: ["HR – People", "Recruitment"],
  projects: ["Projects"],
  timesheets: ["Timesheets"],
  inventory: ["Inventory"],
  finance: ["Accounting"],
  helpdesk: ["Support"],
  documents: [],
  surveys: ["Surveys"],
  administration: [
    "Organization",
    "People",
    "Access Control",
    "Subscription",
    "Platform",
    "Security",
    "Developer",
  ],
  payroll: ["Payroll"],
};

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
        requiredPermission: "kb:pages:view",
      },
      {
        label: "Knowledge Base",
        icon: Library,
        href: "/knowledge-base",
        requiredPermission: "kb:pages:view",
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
  if (pathname.startsWith("/projects") || pathname.startsWith("/goals"))
    return "projects";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/accounting")) return "finance";
  if (pathname.startsWith("/reports")) return "crm";
  if (pathname.startsWith("/support/kb")) return "documents";
  if (pathname.startsWith("/support")) return "helpdesk";
  if (pathname.startsWith("/knowledge")) return "documents";
  if (pathname.startsWith("/surveys")) return "surveys";
  if (pathname.startsWith("/payroll")) return "payroll";
  if (
    pathname.startsWith("/organization") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing")
  )
    return "administration";
  return "home";
}
