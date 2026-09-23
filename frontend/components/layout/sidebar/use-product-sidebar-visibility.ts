"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { useProject } from "@/hooks/api/build/projects";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useEntitlements } from "@/hooks/api/entitlements";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { toBuildNavGroups } from "@/lib/build/build-nav-groups";
import { resolveBuildNavModel } from "@/lib/build/build-nav-model";
import { resolveBuildScope } from "@/lib/build/build-scope";
import type { BuildNavCapability } from "@/lib/build/nav/build-nav-destination";
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

const BUILD_FEEDBACK_ORG_MODULE = "feedbucket";
const EMPTY_PINS: readonly string[] = [];

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
  const isFeedbackEnabled = useModuleEnabled(BUILD_FEEDBACK_ORG_MODULE);
  const buildScope = useMemo(
    () => resolveBuildScope(pathname ?? ""),
    [pathname],
  );
  const { data: activeProject } = useProject(buildScope.projectId ?? 0);
  const projectFeatures = activeProject?.settings?.features;

  const can = useCallback(
    (permission: PermissionKey) =>
      isOrgOwner || (scopes !== undefined && permission in scopes),
    [isOrgOwner, scopes],
  );
  const isOrgModuleEnabled = useCallback(
    (orgModuleKey: string) =>
      orgModuleKey === BUILD_FEEDBACK_ORG_MODULE ? isFeedbackEnabled : true,
    [isFeedbackEnabled],
  );
  const isCapabilityEnabled = useCallback(
    (capability: BuildNavCapability) =>
      capability === "client-portal"
        ? projectFeatures?.["clientPortal"] !== false
        : true,
    [projectFeatures],
  );

  const navGroups = useMemo(() => {
    if (activeProduct === "build")
      return toBuildNavGroups(
        resolveBuildNavModel({
          scope: buildScope,
          access: { can, isOrgModuleEnabled, isCapabilityEnabled },
          pinnedIds: EMPTY_PINS,
        }),
      );
    return getNavGroupsForProduct(
      activeProduct,
      effectiveRole,
      scopes,
      enabledModules,
      lockedModules,
    );
  }, [
    activeProduct,
    buildScope,
    can,
    isOrgModuleEnabled,
    isCapabilityEnabled,
    effectiveRole,
    scopes,
    enabledModules,
    lockedModules,
  ]);

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
