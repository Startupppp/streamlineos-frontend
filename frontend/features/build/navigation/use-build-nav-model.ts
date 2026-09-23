"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { useProject } from "@/hooks/api/build/projects";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  resolveAuthorizedToolIds,
  resolveBuildNavModel,
} from "@/lib/build/build-nav-model";
import type {
  BuildNavAccess,
  BuildNavCapability,
  BuildNavModel,
} from "@/lib/build/nav/build-nav-destination";
import { resolveBuildScope, type BuildScope } from "@/lib/build/build-scope";
import { useBuildNavPins } from "./use-build-nav-preferences";

const FEEDBACK_ORG_MODULE = "feedbucket";

export function useBuildScope(): BuildScope {
  const pathname = usePathname() ?? "";
  return useMemo(() => resolveBuildScope(pathname), [pathname]);
}

export function useBuildNavView(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get("view");
}

export function useBuildNavModel(): {
  model: BuildNavModel;
  isAccessReady: boolean;
  isAccessError: boolean;
  refetchAccess: () => void;
  isPinned: (toolId: string) => boolean;
  canPinMore: boolean;
  togglePin: (toolId: string) => void;
} {
  const scope = useBuildScope();
  const { data: access, isError: isAccessQueryError, refetch: refetchAccess } = useAccess();
  const isFeedbackEnabled = useModuleEnabled(FEEDBACK_ORG_MODULE);
  const { data: activeProject } = useProject(scope.projectId ?? 0);
  const projectFeatures = activeProject?.settings?.features;

  const isOrgOwner = access?.isOrgOwner === true;
  const scopes = access?.scopes;

  const can = useCallback(
    (permission: PermissionKey) =>
      isOrgOwner || (scopes !== undefined && permission in scopes),
    [isOrgOwner, scopes],
  );

  const isOrgModuleEnabled = useCallback(
    (orgModuleKey: string) =>
      orgModuleKey === FEEDBACK_ORG_MODULE ? isFeedbackEnabled : true,
    [isFeedbackEnabled],
  );

  const isCapabilityEnabled = useCallback(
    (capability: BuildNavCapability) =>
      capability === "client-portal"
        ? activeProject !== undefined && projectFeatures?.["clientPortal"] === true
        : true,
    [activeProject, projectFeatures],
  );

  const navAccess = useMemo<BuildNavAccess>(
    () => ({ can, isOrgModuleEnabled, isCapabilityEnabled }),
    [can, isOrgModuleEnabled, isCapabilityEnabled],
  );

  const authorizedToolIds = useMemo(
    () => resolveAuthorizedToolIds(scope, navAccess),
    [scope, navAccess],
  );
  
  const { pinnedIds, isPinned, canPinMore, togglePin } = useBuildNavPins(
    authorizedToolIds,
    access !== undefined,
  );

  const model = useMemo(
    () => resolveBuildNavModel({ scope, access: navAccess, pinnedIds }),
    [scope, navAccess, pinnedIds],
  );

  return {
    model,
    isAccessReady: access !== undefined,
    isAccessError: isAccessQueryError && access === undefined,
    refetchAccess: () => {
      void refetchAccess();
    },
    isPinned,
    canPinMore,
    togglePin,
  };
}
