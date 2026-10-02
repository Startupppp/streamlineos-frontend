import {
  Briefcase,
  BarChart3,
  BarChart2,
  TrendingUp,
  Star,
  Target,
  MessageSquareText,
  Coins,
} from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_INSIGHTS_ROUTES: NavRoute[] = [
  {
    label: "People analytics",
    icon: BarChart3,
    href: "/hr/analytics",
    requiredPermission: "hr:analytics:read",
  },
  {
    label: "Workforce",
    icon: TrendingUp,
    href: "/hr/workforce",
    requiredPermission: "hr:analytics:read",
    children: [
      {
        label: "Workforce Planning",
        icon: TrendingUp,
        href: "/hr/workforce",
        requiredPermission: "hr:analytics:read",
      },
      {
        label: "Cost Analysis",
        icon: Coins,
        href: "/hr/workforce-cost",
        requiredPermission: "hr:analytics:read",
      },
      {
        label: "Contingent Workforce",
        icon: Briefcase,
        href: "/hr/contingent",
        requiredPermission: "hr:contracts:view",
      },
    ],
  },
  {
    label: "Performance",
    icon: Star,
    href: "/hr/performance",
    requiredPermission: "hr:performance:manage",
    children: [
      {
        label: "Goals & OKRs",
        icon: Target,
        href: "/hr/goals",
        requiredPermission: "hr:performance:view",
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
        requiredPermission: "hr:feedback:view",
      },
      {
        label: "Analytics",
        icon: TrendingUp,
        href: "/hr/performance/analytics",
        requiredPermission: "hr:performance:view",
      },
    ],
  },
];
