import { FileText, ClipboardList, History, SlidersHorizontal, Sliders, FileSearch, LayoutTemplate, Workflow, Plug, GitBranch, ShieldCheck, Lock, Share2, Sparkles, TrendingUp, Shield, Scale, ShieldAlert } from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";
import type { PermissionKey } from "@/lib/rbac/permissions";

const HR_SETTINGS_PERMISSIONS: PermissionKey[] = [
  "settings:organization:manage",
  "settings:rbac:manage",
  "notifications:providers:view",
  "settings:webhooks:manage",
  "hr:import:manage",
  "hr:export:manage",
  "hr:integrations:manage",
  "hr:policies:view",
  "hr:policies:manage",
  "hr:workflows:view",
  "hr:templates:view",
  "hr:forms:view",
  "hr:custom-fields:manage",
  "hr:automations:view",
  "hr:reporting-lines:override",
];


export const HR_SETTINGS_ROUTES: NavRoute[] = [
{
        label: "HR configuration",
        icon: SlidersHorizontal,
        href: "/hr/settings",
        exact: true,
        requiredPermission: HR_SETTINGS_PERMISSIONS,
        children: [
          {
            label: "Import / Export",
            icon: FileText,
            href: "/hr/settings/import-export",
            requiredPermission: ["hr:import:manage", "hr:export:manage"],
          },
          {
            label: "Integrations",
            icon: Plug,
            href: "/hr/settings/integrations",
            requiredPermission: "hr:integrations:manage",
          },
          {
            label: "Policies",
            icon: FileText,
            href: "/hr/settings/policies",
            requiredPermission: "hr:policies:view",
          },
          {
            label: "Reporting managers",
            icon: GitBranch,
            href: "/hr/settings/reporting-managers",
            requiredPermission: "hr:reporting-lines:manage",
          },
          {
            label: "Workflows",
            icon: Workflow,
            href: "/hr/settings/workflows",
            requiredPermission: "hr:workflows:view",
          },
          {
            label: "Templates",
            icon: LayoutTemplate,
            href: "/hr/settings/templates",
            requiredPermission: "hr:templates:view",
          },
          {
            label: "Forms",
            icon: ClipboardList,
            href: "/hr/settings/forms",
            requiredPermission: "hr:forms:view",
          },
          {
            label: "Custom Fields",
            icon: Sliders,
            href: "/hr/settings/custom-fields",
            requiredPermission: "hr:custom-fields:manage",
          },
          {
            label: "Preview",
            icon: FileSearch,
            href: "/hr/settings/preview",
            requiredPermission: "hr:policies:view",
          },
          {
            label: "Versions",
            icon: History,
            href: "/hr/settings/versions",
            requiredPermission: "hr:policies:view",
          },
          {
            label: "Automations",
            icon: Workflow,
            href: "/hr/settings/automations",
            requiredPermission: "hr:automations:view",
          },
        ],
      },

  {
    label: "Access & governance",
    icon: ShieldCheck,
    href: "/hr/identity",
    requiredPermission: "hr:identity:view",
    children: [
      {
        label: "Delegations",
        icon: Share2,
        href: "/hr/delegations",
        requiredPermission: "hr:workflows:manage",
      },
      {
        label: "Policy simulator",
        icon: Sparkles,
        href: "/hr/simulator",
        requiredPermission: "hr:policies:manage",
      },
      {
        label: "HR audit log",
        icon: TrendingUp,
        href: "/hr/event-stream",
        requiredPermission: "hr:eventstream:view",
      },
    ],
  },
  {
    label: "HR access",
    icon: ShieldCheck,
    href: "/hr/access",
    requiredPermission: "hr:access:view",
  },
  {
    label: "Compliance & Risk",
    icon: Shield,
    href: "/hr/compliance",
    requiredPermission: "hr:compliance:manage",
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
];
