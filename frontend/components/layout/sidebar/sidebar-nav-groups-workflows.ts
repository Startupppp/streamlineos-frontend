import { Clock, BarChart2, Sliders, LayoutTemplate, Workflow, PlayCircle, CheckSquare, Lock } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const WORKFLOWS_NAV_GROUPS: NavGroup[] = [
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
      {
        label: "Access",
        icon: Lock,
        href: "/workflows/access",
        requiredPermission: "workflows:access:view",
      },
    ],
  },
];
