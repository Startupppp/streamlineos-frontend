"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();
  const scopes = access?.scopes;

  const isOrgOwner =
    access?.isOrgOwner === true;
  const effectiveRole = isOrgOwner ? "OWNER" : "MEMBER";

  const activeProduct = getProductFromPathname(pathname);

  const navGroups = useMemo(() => {
    return getNavGroupsForProduct(
      activeProduct,
      effectiveRole,
      scopes,
      enabledModules,
    );
  }, [activeProduct, effectiveRole, scopes, enabledModules]);

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
