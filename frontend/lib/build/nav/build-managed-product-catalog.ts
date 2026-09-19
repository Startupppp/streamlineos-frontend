import { LayoutDashboard, LayoutGrid, Map, Target } from "lucide-react";
import type { BuildScopeCatalog } from "./build-nav-destination";

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
        id: "product-projects",
        label: "Linked projects",
        href: `${basePath}/projects`,
        icon: LayoutGrid,
        requiredPermission: "build:view",
        mobilePriority: 20,
      },
      {
        id: "product-roadmap",
        label: "Roadmap",
        href: `${basePath}/roadmap`,
        icon: Map,
        requiredPermission: "build:roadmap:view",
        mobilePriority: 30,
      },
      {
        id: "product-goals",
        label: "Goals",
        href: `${basePath}/goals`,
        icon: Target,
        requiredPermission: "build:goals:view",
        mobilePriority: 40,
      },
    ],
    moreTools: [],
    settings: null,
  };
}
