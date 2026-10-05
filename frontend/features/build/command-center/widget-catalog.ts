import type { PermissionKey } from "@/lib/rbac/permissions";
import type { WidgetType } from "./dashboard-layout";

export interface WidgetCatalogEntry {
  title: string;
  drillDownHref: string;
  permissionKey: PermissionKey | null;
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  "my-issues": {
    title: "My Issues",
    drillDownHref: "/build/my-work",
    permissionKey: "build:tickets:view",
  },
  projects: {
    title: "Projects",
    drillDownHref: "/build/projects",
    permissionKey: "build:view",
  },
  approvals: {
    title: "Pending Approvals",
    drillDownHref: "/build/approvals",
    permissionKey: "build:approvals:view",
  },
  "agent-runs": {
    title: "Agent Runs",
    drillDownHref: "/build/agent-runs",
    permissionKey: "build:approvals:view",
  },
  risks: {
    title: "Risks",
    drillDownHref: "/build/risks",
    permissionKey: "build:risks:view",
  },
  releases: {
    title: "Releases",
    drillDownHref: "/build/releases",
    permissionKey: "build:view",
  },
  blockers: {
    title: "Blockers",
    drillDownHref: "/build/my-work?filter=blocked",
    permissionKey: "build:tickets:view",
  },
};

export function getWidgetEntry(type: WidgetType): WidgetCatalogEntry {
  return WIDGET_CATALOG[type];
}
