import { BarChart2, LayoutDashboard, LayoutGrid, Map, MessageSquare, Target } from "lucide-react";
import type { BuildScopeCatalog } from "./build-nav-destination";
import { BUILD_FEEDBACK_ORG_MODULE } from "./build-nav-destination";

export function buildManagedProductCatalog(basePath: string): BuildScopeCatalog {
  return {
    primary: [
      {
        id: "product-overview",
        label: "Overview",
        href: basePath,
        icon: LayoutDashboard,
        requiredPermission: "build:managed-products:view",
        exact: true,
        mobilePriority: 10,
      },
      {
        id: "product-feedback",
        label: "Feedback",
        href: `${basePath}/feedback`,
        icon: MessageSquare,
        requiredPermission: "feedbucket:submissions:view",
        requiredOrgModule: BUILD_FEEDBACK_ORG_MODULE,
        mobilePriority: 20,
      },
      {
        id: "product-insights",
        label: "Insights",
        href: `${basePath}/insights`,
        icon: BarChart2,
        requiredPermission: "build:managed-products:view",
        mobilePriority: 30,
      },
      {
        id: "product-roadmap",
        label: "Roadmap",
        href: `${basePath}/roadmap`,
        icon: Map,
        requiredPermission: "build:roadmap:view",
        mobilePriority: 40,
      },
      {
        id: "product-goals",
        label: "Goals",
        href: `${basePath}/goals`,
        icon: Target,
        requiredPermission: "build:goals:view",
        mobilePriority: 50,
      },
      {
        id: "product-projects",
        label: "Linked projects",
        href: `${basePath}/projects`,
        icon: LayoutGrid,
        requiredPermission: "build:view",
        mobilePriority: 60,
      },
    ],
    moreTools: [],
    settings: null,
  };
}
