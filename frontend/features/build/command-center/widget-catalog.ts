import {
  Bot,
  ChartColumn,
  Compass,
  FolderKanban,
  ListTodo,
  OctagonX,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { WidgetType } from "./dashboard-layout";

interface WidgetCatalogEntry {
  title: string;
  description: string;
  icon: LucideIcon;
  permissionKey: PermissionKey | null;
  size: { w: number; h: number };
  minW: number;
  minH: number;
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  overview: {
    title: "Overview",
    description: "Active projects, open issues and overdue work at a glance.",
    icon: ChartColumn,
    permissionKey: null,
    size: { w: 12, h: 1 },
    minW: 6,
    minH: 1,
  },
  "jump-to": {
    title: "Jump to",
    description: "Shortcuts to the Build pages you use most.",
    icon: Compass,
    permissionKey: null,
    size: { w: 12, h: 2 },
    minW: 4,
    minH: 2,
  },
  "my-issues": {
    title: "My issues",
    description: "Issues assigned to you, filtered by the toolbar above.",
    icon: ListTodo,
    permissionKey: "build:tickets:view",
    size: { w: 7, h: 6 },
    minW: 4,
    minH: 4,
  },
  projects: {
    title: "Projects",
    description: "Active projects with their health and progress.",
    icon: FolderKanban,
    permissionKey: null,
    size: { w: 5, h: 6 },
    minW: 3,
    minH: 4,
  },
  approvals: {
    title: "Pending approvals",
    description: "Requests waiting for your decision.",
    icon: ShieldCheck,
    permissionKey: "build:approvals:view",
    size: { w: 4, h: 5 },
    minW: 3,
    minH: 3,
  },
  "agent-runs": {
    title: "Agent runs",
    description: "The latest signal raised by Build agents.",
    icon: Bot,
    permissionKey: "build:approvals:view",
    size: { w: 4, h: 5 },
    minW: 3,
    minH: 3,
  },
  releases: {
    title: "Releases",
    description: "Upcoming and recent releases across projects.",
    icon: Rocket,
    permissionKey: null,
    size: { w: 4, h: 5 },
    minW: 3,
    minH: 3,
  },
  risks: {
    title: "Risks",
    description: "Open risks ranked by severity.",
    icon: TriangleAlert,
    permissionKey: "build:risks:view",
    size: { w: 6, h: 5 },
    minW: 3,
    minH: 3,
  },
  blockers: {
    title: "Blockers",
    description: "Your issues that are blocked by other work.",
    icon: OctagonX,
    permissionKey: "build:tickets:view",
    size: { w: 6, h: 5 },
    minW: 3,
    minH: 3,
  },
};
