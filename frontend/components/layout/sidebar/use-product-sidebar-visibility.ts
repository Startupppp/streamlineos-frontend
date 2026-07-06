"use client";

import { useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/rbac/hooks";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import {
  getNavGroupsForProduct,
  getProductFromPathname,
  shouldHideProductSidebar,
  type NavGroup,
  type ProductKey,
} from "./sidebar-nav-items";

export function useProductSidebarVisibility(): {
  hideSidebar: boolean;
  navGroups: NavGroup[];
  activeProduct: ProductKey;
  isLoading: boolean;
} {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { permissions } = usePermissions();
  const enabledModules = useEnabledModules();

  const role = session?.user?.role;
  const isOrgOwner =
    session?.user?.isOrgOwner === true ||
    session?.user?.isPlatformAdmin === true;

  const lastKnownRoleRef = useRef<string | undefined>(role);
  if (role) lastKnownRoleRef.current = role;
  const rawRole = role || lastKnownRoleRef.current;
  const effectiveRole = isOrgOwner ? "OWNER" : rawRole;

  const activeProduct = getProductFromPathname(pathname);

  const navGroups = useMemo(
    () =>
      getNavGroupsForProduct(
        activeProduct,
        effectiveRole,
        permissions,
        enabledModules,
      ),
    [activeProduct, effectiveRole, permissions, enabledModules],
  );

  const hideSidebar =
    status !== "loading" && shouldHideProductSidebar(navGroups);

  return {
    hideSidebar,
    navGroups,
    activeProduct,
    isLoading: status === "loading",
  };
}
