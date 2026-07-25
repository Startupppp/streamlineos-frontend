"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/lib/rbac/hooks";
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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { permissions } = usePermissions();
  const enabledModules = useEnabledModules();
  const canViewHr = useCan("hr:employees:view");
  const { data: hrChecklist } = useModuleChecklist("HR", canViewHr);

  const role = session?.user?.role;
  const isOrgOwner =
    session?.user?.isOrgOwner === true ||
    session?.user?.isPlatformAdmin === true;

  const [lastKnownRole, setLastKnownRole] = useState<string | undefined>(role);
  if (role && role !== lastKnownRole) {
    setLastKnownRole(role);
  }
  const rawRole = role || lastKnownRole;
  const effectiveRole = isOrgOwner ? "OWNER" : rawRole;

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
