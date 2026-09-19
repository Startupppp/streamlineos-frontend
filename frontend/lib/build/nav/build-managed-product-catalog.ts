import { LayoutDashboard, LayoutGrid } from "lucide-react";
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
    ],
    moreTools: [],
    settings: null,
  };
}
