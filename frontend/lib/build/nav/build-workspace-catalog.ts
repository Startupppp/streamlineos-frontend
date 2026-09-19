import { Boxes, LayoutDashboard, LayoutGrid, LayoutList, Users } from "lucide-react";
import type { BuildScopeCatalog } from "./build-nav-destination";

export function buildWorkspaceCatalog(basePath: string): BuildScopeCatalog {
  return {
    primary: [
      {
        id: "workspace-overview",
        label: "Overview",
        href: `${basePath}/overview`,
        icon: LayoutDashboard,
        requiredPermission: "build:workspaces:view",
        mobilePriority: 5,
      },
      {
        id: "workspace-projects",
        label: "Projects",
        href: basePath,
        icon: LayoutGrid,
        requiredPermission: "build:view",
        exact: true,
        mobilePriority: 10,
      },
      {
        id: "workspace-products",
        label: "Products",
        href: `${basePath}/products`,
        icon: Boxes,
        requiredPermission: "build:managed-products:view",
        mobilePriority: 20,
      },
      {
        id: "workspace-teams",
        label: "Teams",
        href: `${basePath}/teams`,
        icon: Users,
        requiredPermission: "build:teams:view",
        mobilePriority: 25,
      },
      {
        id: "workspace-work",
        label: "All work",
        href: `${basePath}/all-work`,
        icon: LayoutList,
        requiredPermission: "build:tickets:view",
        mobilePriority: 30,
      },
    ],
    moreTools: [],
    settings: null,
  };
}
