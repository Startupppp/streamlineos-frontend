import { LayoutDashboard, FileText, ClipboardList, History, SlidersHorizontal, Sliders, FileSearch, LayoutTemplate, Workflow, Plug } from "lucide-react";
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
            label: "Overview",
            icon: LayoutDashboard,
            href: "/hr/settings",
            exact: true,
            requiredPermission: HR_SETTINGS_PERMISSIONS,
          },
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
];
