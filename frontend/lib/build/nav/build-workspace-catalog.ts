import { Boxes, LayoutDashboard, LayoutGrid, LayoutList, Map, Target, Users } from "lucide-react";
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
      {
        id: "workspace-roadmap",
        label: "Roadmap",
        href: `${basePath}/roadmap`,
        icon: Map,
        requiredPermission: "build:roadmap:view",
        mobilePriority: 35,
      },
      {
        id: "workspace-goals",
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
