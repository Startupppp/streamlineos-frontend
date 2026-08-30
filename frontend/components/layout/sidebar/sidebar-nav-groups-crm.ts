import { LayoutDashboard, Users, Briefcase, Clock, FileText, Handshake, Contact2, BarChart3, UserCheck, ShieldCheck, Star, TrendingUp, Package, Share2, MailOpen, Zap, History, BarChart2, Inbox, Building2, SlidersHorizontal, Brain, Copy, Search, Sliders, CheckSquare, Key, Activity, Megaphone, Bot, ArrowLeftRight, AlertTriangle, Rows3, PhoneCall, Coins } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const CRM_NAV_GROUPS: NavGroup[] = [
{
    label: "CRM",
    product: "crm",
    module: "crm",
    requiredPermission: [
      "crm:leads:view",
      "crm:reports:view",
      "crm:settings:manage",
      "party:parties:view",
    ],
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
            requiredPermission: "crm:leads:view",
          },
          {
            label: "Distribute Leads",
            icon: Share2,
            href: "/crm/leads/distribute",
            requiredPermission: "crm:leads:assign",
          },
          {
            label: "Duplicate Detection",
            icon: Copy,
            href: "/crm/leads/duplicates",
            requiredPermission: "crm:data-quality:view",
          },
          {
            label: "Source Report",
            icon: BarChart2,
            href: "/crm/leads/source-report",
            requiredPermission: "crm:reports:view",
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
        label: "Business Parties",
        icon: Building2,
        href: "/parties",
        requiredPermission: "party:parties:view",
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
            requiredPermission: "crm:deals:read",
          },
          {
            label: "Deal Aging",
            icon: Clock,
            href: "/crm/deals/aging",
            requiredPermission: "crm:deals:read",
          },
          {
            label: "Win/Loss Analysis",
            icon: TrendingUp,
            href: "/crm/deals/win-loss",
            requiredPermission: "crm:reports:view",
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
        // Issues, tasks and complaints — three record types on one surface, so
        // one destination rather than three. Gated on its own key: seeing how
        // many complaints are open is a distinct authority from working the
        // pipeline, and a customer complaint is not a lead.
        label: "Issues & complaints",
        icon: AlertTriangle,
        href: "/crm/issues",
        requiredPermission: "crm:issues:view",
      },
      {
        // The oversight surface for everything the system does without asking.
        // Gated on its own key rather than a CRM-wide one: reading what was
        // decided is a distinct authority from working the pipeline.
        label: "What the system did",
        icon: Bot,
        href: "/crm/autonomy",
        requiredPermission: "crm:autonomy:view",
      },
      {
        // Gated on reading parties, not on importing: export is ungated by
        // design, so anyone who may read the data can take it with them.
        label: "Import & export",
        icon: ArrowLeftRight,
        href: "/crm/import",
        requiredPermission: "party:parties:view",
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
            requiredPermission: "crm:reports:view",
          },
        ],
      },
      {
        // Every CRM member holds the earnings key for their own rows, so this is
        // a rep's destination as much as a manager's — the server narrows to the
        // caller's scope rather than the nav hiding it.
        label: "Commissions",
        icon: Coins,
        href: "/crm/commissions",
        requiredPermission: "crm:commission-earnings:view",
      },
      {
        // The team digest, so `view-team` and not `:view`. A rep reads their own
        // calls' analyses on the calls themselves.
        label: "Call intelligence",
        icon: PhoneCall,
        href: "/crm/intelligence",
        requiredPermission: "crm:call-analysis:view-team",
      },
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/crm/access",
        requiredPermission: "crm:access:view",
      },
      {
        label: "API Keys",
        icon: Key,
        href: "/crm/api-keys",
        requiredPermission: "crm:settings:manage",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/crm/settings/assignment-rules",
        requiredPermission: "crm:settings:manage",
        children: [
          {
            label: "Assignment Rules",
            icon: SlidersHorizontal,
            href: "/crm/settings/assignment-rules",
            requiredPermission: "crm:assignment-rules:manage",
          },
          {
            label: "Email Templates",
            icon: MailOpen,
            href: "/crm/settings/email-templates",
            requiredPermission: "crm:email-templates:manage",
          },
          {
            label: "Scoring Rules",
            icon: Star,
            href: "/crm/settings/scoring-rules",
            requiredPermission: "crm:scoring-rules:manage",
          },
          {
            label: "SLA Rules",
            icon: Clock,
            href: "/crm/settings/sla",
            requiredPermission: "crm:sla:manage",
          },
          {
            label: "Custom Fields",
            icon: Sliders,
            href: "/crm/settings/custom-fields",
            requiredPermission: "crm:settings:manage",
          },
          {
            label: "Record Layouts",
            icon: Rows3,
            href: "/crm/settings/layouts",
            // Matches the page's own `requirePermission("crm:settings:view")`.
            // It read `settings:manage` -- a platform-wide key on a CRM page,
            // which every sibling here avoids -- so the nav hid the entry from
            // people the page would have let in, and showed it to people it
            // would not.
            requiredPermission: "crm:settings:view",
          },
          {
            label: "Automations",
            icon: Zap,
            href: "/crm/settings/automations",
            requiredPermission: "crm:automations:manage",
          },
          {
            label: "AI Settings",
            icon: Brain,
            href: "/crm/settings/ai",
            requiredPermission: "crm:settings:manage",
          },
          {
            label: "Product Catalog",
            icon: Package,
            href: "/crm/settings/products",
            requiredPermission: "crm:settings:manage",
          },
          {
            label: "Audit Log",
            icon: History,
            href: "/crm/settings/audit-log",
            requiredPermission: "audit-log:read",
          },
          {
            label: "Import / Export",
            icon: FileText,
            href: "/crm/settings/import-export",
            requiredPermission: "crm:settings:manage",
          },
        ],
      },
    ],
  },
];
