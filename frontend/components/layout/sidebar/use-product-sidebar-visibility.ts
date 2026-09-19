"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useEntitlements } from "@/hooks/api/entitlements";
import {
  getNavGroupsForProduct,
  shouldHideProductSidebar,
  getProductFromPathname,
  isKnowledgeWikiPath,
  isPortalChromelessPath,
  resolveProductSidebarChrome,
  type NavGroup,
  type ProductKey,
} from "./sidebar-nav-items";

export function useProductSidebarVisibility(): {
  hideSidebar: boolean;
  showSidebarToggle: boolean;
  navGroups: NavGroup[];
  activeProduct: ProductKey;
  isLoading: boolean;
} {
  const { status } = useSession();
  const pathname = usePathname();
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();
  const { data: entitlements } = useEntitlements();
  const lockedModules = entitlements?.lockedModules ?? [];
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
      lockedModules,
    );
  }, [activeProduct, effectiveRole, scopes, enabledModules, lockedModules]);

  const { hideSidebar, showSidebarToggle } = resolveProductSidebarChrome({
    sessionReady: status !== "loading",
    emptyNav: shouldHideProductSidebar(navGroups),
    isWikiPath: isKnowledgeWikiPath(pathname),
    isPortalPath: isPortalChromelessPath(pathname),
  });

  return {
    hideSidebar,
    showSidebarToggle,
    navGroups,
    activeProduct,
    isLoading: status === "loading",
  };
}
