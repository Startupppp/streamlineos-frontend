import {
  Briefcase,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Map as MapIcon,
  Network,
  Package,
  Plug,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { BUILD_ROOT_PATH } from "../build-scope";
import type { BuildScopeCatalog } from "./build-nav-destination";

export function buildOrganizationCatalog(): BuildScopeCatalog {
  return {
    primary: [
      {
        id: "org-overview",
        label: "Overview",
        href: `${BUILD_ROOT_PATH}/command-center`,
        icon: LayoutDashboard,
        requiredPermission: "build:view",
        mobilePriority: 10,
      },
      {
        id: "org-projects",
        label: "Projects",
        href: BUILD_ROOT_PATH,
        icon: Briefcase,
        requiredPermission: "build:view",
        exact: true,
        boardViews: true,
        mobilePriority: 30,
      },
      {
        id: "org-products",
        label: "Products",
        href: `${BUILD_ROOT_PATH}/managed-products`,
        icon: Package,
        requiredPermission: "build:managed-products:view",
      },
      {
        id: "org-portfolios",
        label: "Portfolios",
        href: `${BUILD_ROOT_PATH}/portfolios`,
        icon: LayoutGrid,
        requiredPermission: "build:portfolios:view",
      },
      {
        id: "org-programs",
        label: "Programs",
        href: `${BUILD_ROOT_PATH}/programs`,
        icon: Layers,
        requiredPermission: "build:programs:view",
      },
      {
        id: "org-teams",
        label: "Teams",
        href: `${BUILD_ROOT_PATH}/teams`,
        icon: Network,
        requiredPermission: "build:teams:view",
      },
    ],
    moreTools: [
      {
        id: "org-roadmap",
        label: "Roadmap",
        href: `${BUILD_ROOT_PATH}/roadmap`,
        icon: MapIcon,
        requiredPermission: "build:roadmap:view",
      },
      {
        id: "org-goals",
        label: "Goals",
        href: `${BUILD_ROOT_PATH}/goals`,
        icon: Target,
        requiredPermission: "build:goals:view",
      },
      {
        id: "org-approvals",
        label: "Approvals",
        href: `${BUILD_ROOT_PATH}/approvals`,
        icon: ClipboardCheck,
        requiredPermission: "build:approvals:view",
      },
      {
        id: "org-templates",
        label: "Templates",
        href: `${BUILD_ROOT_PATH}/templates`,
        icon: LayoutTemplate,
        requiredPermission: "build:create",
      },
      {
        id: "org-client-access",
        label: "Client access",
        href: `${BUILD_ROOT_PATH}/settings/client-access`,
        icon: ShieldCheck,
        requiredPermission: "build:portal:view",
      },
      {
        id: "org-members",
        label: "Members & access",
        href: `${BUILD_ROOT_PATH}/settings/access`,
        icon: Users,
        requiredPermission: ["build:members:view", "build:access:view"],
      },
    ],
    settings: {
      id: "org-settings",
      label: "Build settings",
      href: `${BUILD_ROOT_PATH}/settings/integrations`,
      icon: Plug,
      requiredPermission: "integrations:git:view",
    },
  };
}
