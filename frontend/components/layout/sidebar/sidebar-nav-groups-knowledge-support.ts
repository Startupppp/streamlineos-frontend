import { Clock, FileText, BarChart3, Network, ClipboardList, ShieldCheck, Share2, Globe, Scale, MailOpen, ListChecks, History, LifeBuoy, Inbox, Send, SlidersHorizontal, Library, NotebookPen, Workflow, PenTool, FileStack } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const KNOWLEDGE_SUPPORT_NAV_GROUPS: NavGroup[] = [
{
    label: "Support",
    module: "helpdesk",
    requiredPermission: [
      "build:tickets:view",
      "support:kb:view",
      "support:portal:tickets:view",
    ],
    routes: [
      {
        label: "All Tickets",
        icon: LifeBuoy,
        href: "/support",
        requiredPermission: "build:tickets:view",
        children: [
          {
            label: "Support Inbox",
            icon: Inbox,
            href: "/support/inbox",
            requiredPermission: "build:tickets:view",
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
        label: "Access",
        icon: ShieldCheck,
        href: "/support/access",
        requiredPermission: "support:access:view",
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
        label: "Access",
        icon: ShieldCheck,
        href: "/sign/access",
        requiredPermission: "sign:access:view",
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
    routes: [
      {
        label: "Ask KB",
        icon: Library,
        href: "/knowledge/chat",
      },
      {
        label: "Wiki",
        icon: NotebookPen,
        href: "/knowledge/wiki",
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
      {
        label: "Access",
        icon: ShieldCheck,
        href: "/surveys/access",
        requiredPermission: "surveys:access:view",
      },
    ],
  },
];
