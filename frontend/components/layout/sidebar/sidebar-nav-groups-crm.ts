import { LayoutDashboard, Users, Briefcase, Clock, FileText, Handshake, Contact2, BarChart3, UserCheck, ShieldCheck, Star, TrendingUp, Package, Share2, MailOpen, Zap, History, BarChart2, Inbox, Building2, SlidersHorizontal, Brain, Copy, Search, Sliders, CheckSquare, Key, Activity, Megaphone } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const CRM_NAV_GROUPS: NavGroup[] = [
{
    label: "CRM",
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
        label: "API Keys",
        icon: Key,
        href: "/crm/api-keys",
        requiredPermission: "crm:settings:manage",
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
];
