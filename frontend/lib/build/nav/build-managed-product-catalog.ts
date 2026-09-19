import { LayoutDashboard } from "lucide-react";
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
    ],
    moreTools: [],
    settings: null,
  };
}
