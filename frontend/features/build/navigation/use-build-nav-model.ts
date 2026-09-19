"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { buildScopeDestinations } from "@/lib/build/build-nav-groups";
import {
  resolveBuildNavModel,
  type BuildNavAccess,
  type BuildNavModel,
} from "@/lib/build/build-nav-model";
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
  isPinned: (toolId: string) => boolean;
  canPinMore: boolean;
  togglePin: (toolId: string) => void;
} {
  const scope = useBuildScope();
  const { data: access } = useAccess();
  const isFeedbackEnabled = useModuleEnabled(FEEDBACK_ORG_MODULE);

  const scopeToolIds = useMemo(
    () => buildScopeDestinations(scope).map((destination) => destination.id),
    [scope],
  );
  const { pinnedIds, isPinned, canPinMore, togglePin } =
    useBuildNavPins(scopeToolIds);

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

  const navAccess = useMemo<BuildNavAccess>(
    () => ({ can, isOrgModuleEnabled }),
    [can, isOrgModuleEnabled],
  );

  const model = useMemo(
    () => resolveBuildNavModel({ scope, access: navAccess, pinnedIds }),
    [scope, navAccess, pinnedIds],
  );

  return {
    model,
    isAccessReady: access !== undefined,
    isPinned,
    canPinMore,
    togglePin,
  };
}
