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
  HeadphonesIcon,
  UserSearch,
  TrendingUp,
  BookOpen,
  Heart,
  UserMinus,
  Target,
  Package,
  Share2,
  Video,
  Globe,
  Bell,
  GraduationCap,
  ClipboardCheck,
  PackageMinus,
  Gift,
  Award,
  Scale,
  MailOpen,
  Smile,
  FileCheck,
  Coins,
  Map,
  Landmark,
  RefreshCcw,
  Zap,
  ListChecks,
  PartyPopper,
  History,
  BarChart2,
  LifeBuoy,
  Inbox,
  GitBranch,
  Building2,
  UserCog,
  SlidersHorizontal,
  UserX,
  Sparkles,
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
  LayoutGrid,
  Workflow,
  PlayCircle,
  CheckSquare,
  Palette,
  Lock,
  Key,
  Terminal,
  Upload,
  Smartphone,
  Plug,
  Activity,
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
    ],
  },
  {
    label: "HR – People",
    requiredPermission: [
      "hr:employees:view",
      "hr:attendance:view",
      "hr:leaves:view",
      "hr:documents:view",
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
            label: "Onboarding",
            icon: ClipboardList,
            href: "/hr/onboarding",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "My Onboarding Tasks",
            icon: ClipboardList,
            href: "/hr/onboarding/my-tasks",
            requiredPermission: ["self:attendance"],
          },
          {
            label: "Org Chart",
            icon: Network,
            href: "/hr/org-chart",
            requiredPermission: "hr:employees:view",
          },
        ],
      },
      {
        label: "Attendance",
        icon: Clock,
        href: "/hr/attendance",
        requiredPermission: "hr:attendance:view",
      },
      {
        label: "Leaves",
        icon: CalendarCheck,
        href: "/hr/leaves",
        badge: "leaves",
        requiredPermission: "hr:leaves:view",
      },
      {
        label: "Payroll",
        icon: CreditCard,
        href: "/hr/payroll",
        requiredPermission: "hr:payroll:view",
      },
      {
        label: "My Payslips",
        icon: Wallet,
        href: "/hr/my-payslips",
        requiredPermission: ["self:payslips", "hr:payroll:view"],
      },
      {
        label: "Expenses",
        icon: Receipt,
        href: "/hr/expenses",
        requiredPermission: "hr:expenses:view",
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
            icon: FileText,
            href: "/hr/document-review",
            requiredPermission: "hr:documents:manage",
          },
          {
            label: "Handbook",
            icon: BookOpen,
            href: "/hr/handbook",
            requiredPermission: "hr:documents:view",
          },
        ],
      },
      {
        label: "Assets & Devices",
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
        label: "Work Logs",
        icon: History,
        href: "/hr/work-logs",
        requiredPermission: ["hr:attendance:view", "self:attendance"],
      },
      {
        label: "Exit",
        icon: UserMinus,
        href: "/hr/exit",
        requiredPermission: "hr:employees:update",
        children: [
          {
            label: "Termination",
            icon: UserX,
            href: "/hr/termination",
            requiredPermission: "hr:employees:delete",
          },
        ],
      },
      {
        label: "Helpdesk",
        icon: HeadphonesIcon,
        href: "/hr/helpdesk",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Email Templates",
        icon: MailOpen,
        href: "/hr/email-templates",
        requiredPermission: "hr:employees:update",
      },
      {
        label: "HR Analytics",
        icon: BarChart3,
        href: "/hr/analytics",
        requiredPermission: "hr:employees:view",
      },
    ],
  },
  {
    label: "HR – Growth",
    defaultCollapsed: true,
    requiredPermission: ["hr:performance:view", "hr:goals:view"],
    routes: [
      {
        label: "Performance",
        icon: Star,
        href: "/hr/performance",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Recognition",
        icon: Heart,
        href: "/hr/recognition",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Assessments",
        icon: ClipboardCheck,
        href: "/hr/assessments",
        requiredPermission: "hr:performance:manage",
      },
      {
        label: "Certifications",
        icon: Award,
        href: "/hr/certifications",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Skills",
        icon: Zap,
        href: "/hr/skills",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Learning Paths",
        icon: Map,
        href: "/hr/learning-paths",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Career Ladders",
        icon: TrendingUp,
        href: "/hr/career-ladders",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "eNPS",
        icon: Smile,
        href: "/hr/enps",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Surveys",
        icon: ListChecks,
        href: "/hr/surveys",
        requiredPermission: "hr:performance:view",
      },
      {
        label: "Team Events",
        icon: PartyPopper,
        href: "/hr/team-events",
        requiredPermission: "hr:employees:view",
      },
      {
        label: "Alumni",
        icon: GraduationCap,
        href: "/hr/alumni",
        requiredPermission: "hr:employees:view",
      },
    ],
  },
  {
    label: "HR – Compensation",
    defaultCollapsed: true,
    requiredPermission: ["hr:salary:view", "hr:payroll:view"],
    routes: [
      {
        label: "Bonuses",
        icon: Gift,
        href: "/hr/bonuses",
        requiredPermission: "hr:salary:manage",
      },
      {
        label: "Incentives",
        icon: Coins,
        href: "/hr/incentives",
        requiredPermission: "crm:incentives:read",
      },
      {
        label: "Loans",
        icon: Landmark,
        href: "/hr/loans",
        requiredPermission: "hr:payroll:view",
      },
      {
        label: "Reimbursements",
        icon: RefreshCcw,
        href: "/hr/reimbursements",
        requiredPermission: "hr:expenses:view",
      },
      {
        label: "Full & Final",
        icon: FileCheck,
        href: "/hr/fnf",
        requiredPermission: "hr:payroll:approve",
      },
      {
        label: "Background Check",
        icon: ShieldCheck,
        href: "/hr/background-verification",
        requiredPermission: "hr:documents:manage",
      },
      {
        label: "Compliance",
        icon: Scale,
        href: "/hr/compliance",
        requiredPermission: "hr:documents:manage",
      },
    ],
  },
  {
    label: "Recruitment",
    requiredPermission: ["hr:employees:create"],
    routes: [
      {
        label: "Recruitment Hub",
        icon: UserSearch,
        href: "/hr/recruitment",
        requiredPermission: "hr:employees:create",
        children: [
          {
            label: "Jobs",
            icon: Briefcase,
            href: "/hr/recruitment/jobs",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Candidates",
            icon: Users,
            href: "/hr/recruitment/candidates",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Pipeline",
            icon: TrendingUp,
            href: "/hr/recruitment/pipeline",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Interviews",
            icon: Video,
            href: "/hr/recruitment/interviews",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Question Bank",
            icon: BookOpen,
            href: "/hr/recruitment/question-bank",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Scorecard Templates",
            icon: ClipboardList,
            href: "/hr/recruitment/scorecard-templates",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Hiring Flows",
            icon: ListChecks,
            href: "/hr/recruitment/hiring-flows",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "SLA Config",
            icon: Clock,
            href: "/hr/recruitment/sla",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "SLA Report",
            icon: BarChart2,
            href: "/hr/recruitment/sla-report",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            href: "/hr/recruitment/analytics",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Diversity Report",
            icon: Users,
            href: "/hr/recruitment/diversity-report",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Interviewer Performance",
            icon: Star,
            href: "/hr/recruitment/interviewer-performance",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Booking Links",
            icon: Share2,
            href: "/hr/recruitment/booking-links",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Automations",
            icon: Zap,
            href: "/hr/recruitment/automations",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Email Sequences",
            icon: MailOpen,
            href: "/hr/recruitment/email-sequences",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Referrals",
            icon: Gift,
            href: "/hr/recruitment/referrals",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Refer a Candidate",
            icon: Share2,
            href: "/hr/recruitment/refer",
          },
          {
            label: "Internal Jobs",
            icon: Briefcase,
            href: "/hr/recruitment/internal-jobs",
          },
          {
            label: "Offer Templates",
            icon: LayoutTemplate,
            href: "/hr/recruitment/offer-templates",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Recruiters",
            icon: UserCog,
            href: "/hr/recruitment/recruiters",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Inbox",
            icon: Inbox,
            href: "/hr/recruitment/inbox",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Scorecard Analytics",
            icon: BarChart2,
            href: "/hr/recruitment/scorecard-analytics",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Headcount",
            icon: Users,
            href: "/hr/recruitment/headcount",
          },
          {
            label: "Vendors",
            icon: Building2,
            href: "/hr/recruitment/vendors",
            requiredPermission: "hr:employees:create",
          },
          {
            label: "Reports",
            icon: FileSearch,
            href: "/hr/recruitment/reports",
            requiredPermission: "hr:employees:view",
          },
        ],
      },
    ],
  },
  {
    label: "CRM",
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
        label: "Deals",
        icon: Handshake,
        href: "/crm/deals",
        requiredPermission: "crm:leads:view",
        children: [
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
        ],
      },
    ],
  },
  {
    label: "Accounting",
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
    ],
  },
  {
    label: "Inventory",
    requiredPermission: ["inventory:stock:view", "inventory:products:view"],
    routes: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/inventory",
        requiredPermission: "inventory:stock:view",
      },
      {
        label: "Products",
        icon: Tag,
        href: "/inventory/products",
        requiredPermission: "inventory:products:view",
      },
      {
        label: "Stock Levels",
        icon: Warehouse,
        href: "/inventory/stock",
        requiredPermission: "inventory:stock:view",
      },
      {
        label: "Movements",
        icon: ArrowLeftRight,
        href: "/inventory/stock/movements",
        requiredPermission: "inventory:stock:view",
      },
      {
        label: "Warehouses",
        icon: Building2,
        href: "/inventory/warehouses",
        requiredPermission: "inventory:warehouses:view",
      },
      {
        label: "Purchase Orders",
        icon: ShoppingCart,
        href: "/inventory/purchase-orders",
        requiredPermission: "inventory:purchase-orders:view",
      },
      {
        label: "Sales Orders",
        icon: FileText,
        href: "/inventory/sales-orders",
        requiredPermission: "inventory:sales-orders:view",
      },
      {
        label: "Vendors",
        icon: Truck,
        href: "/inventory/vendors",
        requiredPermission: "inventory:vendors:view",
      },
      {
        label: "Reports",
        icon: BarChart3,
        href: "/inventory/reports/stock-summary",
        requiredPermission: "inventory:reports:view",
      },
    ],
  },
  {
    label: "Projects & Time",
    requiredPermission: [
      "projects:view",
      "projects:timesheets:view",
      "projects:goals:view",
      "projects:roadmap:view",
    ],
    routes: [
      {
        label: "All Projects",
        icon: Briefcase,
        href: "/projects",
        isProjectsList: true,
        requiredPermission: "projects:view",
        children: [
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
        ],
      },
      {
        label: "Goals & OKRs",
        icon: Target,
        href: "/goals",
        requiredPermission: "projects:goals:view",
      },
      {
        label: "Roadmap",
        icon: Map,
        href: "/projects/roadmap",
        requiredPermission: "projects:roadmap:view",
      },
      {
        label: "Timesheets",
        icon: Timer,
        href: "/timesheets/team",
        requiredPermission: "projects:timesheets:view",
      },
    ],
  },
  {
    label: "Support",
    requiredPermission: ["projects:tickets:view", "support:kb:view"],
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
        label: "Knowledge Base",
        icon: BookOpen,
        href: "/support/kb",
        requiredPermission: "support:kb:view",
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
    ],
  },
  {
    label: "Organization",
    requiredPermission: ["settings:manage", "settings:view"],
    routes: [
      {
        label: "Overview",
        icon: Building2,
        href: "/organization",
        requiredPermission: "settings:view",
      },
      {
        label: "Structure",
        icon: Network,
        href: "/organization/structure",
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
      {
        label: "Branding",
        icon: Palette,
        href: "/settings/organization",
        requiredPermission: "settings:manage",
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
      {
        label: "Import / Export",
        icon: Upload,
        href: "/users/import",
        requiredPermission: "settings:manage",
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
        label: "Usage",
        icon: BarChart2,
        href: "/settings/subscription/usage",
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
      {
        label: "Payment Methods",
        icon: CreditCard,
        href: "/billing/payment-methods",
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
      {
        label: "Custom Fields",
        icon: Sliders,
        href: "/settings/custom-fields",
        requiredPermission: "settings:manage",
      },
      {
        label: "Automation",
        icon: Workflow,
        href: "/settings/automations",
        requiredPermission: "settings:automations:view",
      },
      {
        label: "Notification Templates",
        icon: MailOpen,
        href: "/settings/email-templates",
        requiredPermission: "settings:manage",
      },
      {
        label: "Integrations",
        icon: Plug,
        href: "/settings/integrations/recruitment",
        requiredPermission: "settings:manage",
      },
      {
        label: "API Keys",
        icon: Key,
        href: "/settings/api-tokens",
        requiredPermission: "settings:manage",
      },
      {
        label: "AI Configuration",
        icon: Brain,
        href: "/settings/ai",
        requiredPermission: "settings:manage",
      },
      {
        label: "Data Hub",
        icon: FileText,
        href: "/settings/data-hub",
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
        label: "MFA Policy",
        icon: Smartphone,
        href: "/settings/security/mfa",
        requiredPermission: "settings:manage",
      },
      {
        label: "SSO",
        icon: Key,
        href: "/settings/security/sso",
        requiredPermission: "settings:manage",
      },
      {
        label: "SCIM",
        icon: RefreshCcw,
        href: "/settings/security/scim",
        requiredPermission: "settings:manage",
      },
      {
        label: "Domain Verification",
        icon: Globe,
        href: "/settings/security/domains",
        requiredPermission: "settings:manage",
      },
      {
        label: "Session Policy",
        icon: Clock,
        href: "/settings/sessions",
        requiredPermission: "settings:manage",
      },
      {
        label: "IP Allow List",
        icon: Shield,
        href: "/settings/security/ip-allowlist",
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
        label: "Events",
        icon: Bell,
        href: "/settings/developer/events",
        requiredPermission: "settings:manage",
      },
      {
        label: "Webhooks",
        icon: Zap,
        href: "/settings/developer/webhooks",
        requiredPermission: "settings:manage",
      },
      {
        label: "API Tokens",
        icon: Key,
        href: "/settings/developer/api-tokens",
        requiredPermission: "settings:manage",
      },
      {
        label: "Logs",
        icon: FileText,
        href: "/settings/developer/logs",
        requiredPermission: "settings:manage",
      },
      {
        label: "Sandbox",
        icon: Terminal,
        href: "/settings/developer/sandbox",
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
): NavRoute | null {
  if (!isOwner && !matchesPermission(route.requiredPermission, granted))
    return null;
  if (route.children && route.children.length > 0) {
    const children = route.children
      .map((c) => filterRoute(c, isOwner, granted))
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
): NavGroup[] {
  if (!role) return [];

  const isOwner = role === "OWNER";
  const granted = new Set(permissions ?? []);

  return NAV_GROUPS.map((group) => {
    const visibleRoutes = group.routes
      .map((r) => filterRoute(r, isOwner, granted))
      .filter((r): r is NavRoute => r !== null);
    return { ...group, routes: visibleRoutes };
  }).filter((group) => {
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

export type ProductKey =
  | "home"
  | "crm"
  | "hrms"
  | "projects"
  | "inventory"
  | "finance"
  | "helpdesk"
  | "documents"
  | "analytics"
  | "ai"
  | "administration";

export interface ProductDefinition {
  key: ProductKey;
  label: string;
  href: string;
}

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { key: "home", label: "Home", href: "/dashboard" },
  { key: "crm", label: "CRM", href: "/crm" },
  { key: "hrms", label: "HRMS", href: "/hr" },
  { key: "projects", label: "Projects", href: "/projects" },
  { key: "inventory", label: "Inventory", href: "/inventory" },
  { key: "finance", label: "Finance", href: "/accounting" },
  { key: "helpdesk", label: "Helpdesk", href: "/support" },
  { key: "documents", label: "Documents", href: "/support/kb" },
  { key: "analytics", label: "Analytics", href: "/analytics" },
  { key: "ai", label: "AI", href: "/ai" },
  { key: "administration", label: "Admin", href: "/organization" },
];

const PRODUCT_NAV_GROUP_LABELS: Record<ProductKey, string[]> = {
  home: [],
  crm: ["CRM"],
  hrms: ["HR – People", "HR – Growth", "HR – Compensation", "Recruitment"],
  projects: ["Projects & Time"],
  inventory: ["Inventory"],
  finance: ["Accounting"],
  helpdesk: ["Support"],
  documents: [],
  analytics: [],
  ai: [],
  administration: [
    "Organization",
    "People",
    "Access Control",
    "Subscription",
    "Platform",
    "Security",
    "Developer",
  ],
};

export function getNavGroupsForProduct(
  productKey: ProductKey,
  role: string | undefined,
  permissions: string[] | undefined,
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
  if (productKey === "ai") {
    return [
      {
        label: "AI",
        routes: [
          {
            label: "AI Hub",
            icon: Sparkles,
            href: "/ai",
            requiredPermission: "settings:manage",
          },
        ],
      },
    ];
  }
  if (productKey === "analytics")
    return [
      {
        label: "Analytics",
        routes: [{ label: "Analytics", icon: BarChart3, href: "/analytics" }],
      },
    ];

  if (productKey === "documents")
    return [
      {
        label: "Documents",
        routes: [
          {
            label: "Knowledge Base",
            icon: Library,
            href: "/support/kb",
            requiredPermission: "support:kb:view",
          },
        ],
      },
    ];

  const allGroups = getNavGroupsForUser(role, permissions);
  const labels = PRODUCT_NAV_GROUP_LABELS[productKey];
  return allGroups.filter((g) => labels.includes(g.label));
}

export function getProductFromPathname(pathname: string): ProductKey {
  if (pathname === "/dashboard" || pathname === "/") return "home";
  if (
    pathname.startsWith("/crm") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/customer-executive")
  )
    return "crm";
  if (pathname.startsWith("/hr") || pathname.startsWith("/recruitment"))
    return "hrms";
  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/timesheets")
  )
    return "projects";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/accounting")) return "finance";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/support"))
    return "helpdesk";
  if (pathname.startsWith("/ai")) return "ai";
  if (
    pathname.startsWith("/organization") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/reports")
  )
    return "administration";
  return "home";
}
