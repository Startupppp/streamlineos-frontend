import { LayoutDashboard, LayoutList } from "lucide-react";
import type { BuildScopeCatalog } from "./build-nav-destination";

export function buildWorkspaceCatalog(basePath: string): BuildScopeCatalog {
  return {
    primary: [
      {
        id: "workspace-overview",
        label: "Overview",
        href: basePath,
        icon: LayoutDashboard,
        requiredPermission: "build:workspaces:view",
        exact: true,
        mobilePriority: 10,
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
