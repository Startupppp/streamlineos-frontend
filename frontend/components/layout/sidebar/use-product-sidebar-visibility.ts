"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/rbac/hooks";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useCan } from "@/hooks/api/access";
import { useModuleChecklist } from "@/hooks/api/onboarding-flow";
import {
  getNavGroupsForProduct,
  shouldHideProductSidebar,
  getProductFromPathname,
  withoutHrSetupRoute,
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
  const canViewHr = useCan("hr:employees:view");
  const { data: hrChecklist } = useModuleChecklist("HR", canViewHr);

  const isOrgOwner =
    access?.isOrgOwner === true || access?.isPlatformAdmin === true;
  const effectiveRole = isOrgOwner ? "OWNER" : "MEMBER";

  const activeProduct = getProductFromPathname(pathname);

  const hideHrSetup =
    hrChecklist?.status === "completed" || Boolean(hrChecklist?.dismissedAt);

  const navGroups = useMemo(() => {
    const groups = getNavGroupsForProduct(
      activeProduct,
      effectiveRole,
      permissions,
      enabledModules,
    );
    return hideHrSetup ? withoutHrSetupRoute(groups) : groups;
  }, [activeProduct, effectiveRole, permissions, enabledModules, hideHrSetup]);

  const hideSidebar =
    status !== "loading" && shouldHideProductSidebar(navGroups);

  return {
    hideSidebar,
    navGroups,
    activeProduct,
    isLoading: status === "loading",
  };
}
