"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/rbac/hooks";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import {
  getNavGroupsForProduct,
  shouldHideProductSidebar,
  getProductFromPathname,
  isKnowledgeWikiPath,
  isPortalChromelessPath,
  type NavGroup,
  type ProductKey,
} from "./sidebar-nav-items";

export function useProductSidebarVisibility(): {
  hideSidebar: boolean;
  navGroups: NavGroup[];
  activeProduct: ProductKey;
  isLoading: boolean;
} {
  const { status } = useSession();
  const pathname = usePathname();
  const { permissions } = usePermissions();
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();

  const isOrgOwner =
    access?.isOrgOwner === true;
  const effectiveRole = isOrgOwner ? "OWNER" : "MEMBER";

  const activeProduct = getProductFromPathname(pathname);

  const navGroups = useMemo(() => {
    return getNavGroupsForProduct(
      activeProduct,
      effectiveRole,
      permissions,
      enabledModules,
    );
  }, [activeProduct, effectiveRole, permissions, enabledModules]);

  const hideSidebar =
    status !== "loading" &&
    (shouldHideProductSidebar(navGroups) ||
      isKnowledgeWikiPath(pathname) ||
      isPortalChromelessPath(pathname));

  return {
    hideSidebar,
    navGroups,
    activeProduct,
    isLoading: status === "loading",
  };
}
