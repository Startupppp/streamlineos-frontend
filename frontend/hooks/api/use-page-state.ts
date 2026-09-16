"use client";

import { useAccess } from "@/hooks/api/access";
import { useEntitlements } from "@/hooks/api/entitlements";
import { accessState } from "@/lib/rbac/gate";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import {
  resolvePageState,
  type ModuleAvailability,
  type PageStateResolution,
} from "@/lib/page-state/resolve-page-state";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface UsePageStateOptions {
  readonly permission?: PermissionKey;
  readonly module?: string;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error?: unknown;
  readonly isEmpty?: boolean;
}

export function usePageState(options: UsePageStateOptions): PageStateResolution {
  const { data: access, isLoading: accessLoading } = useAccess();
  const { data: entitlements } = useEntitlements(options.module !== undefined);

  const permissionState =
    options.permission === undefined
      ? ("granted" as const)
      : accessState({
          isLoading: accessLoading,
          granted: access !== undefined && grantsPermission(access, options.permission),
        });

  let moduleAvailability: ModuleAvailability | undefined;
  if (options.module !== undefined) {
    const moduleKey = normalizeOrgModuleKey(options.module);
    if (accessLoading || access === undefined) moduleAvailability = { status: "loading" };
    else if (access.modules[moduleKey] === true) moduleAvailability = { status: "available" };
    else {
      const planLocked =
        entitlements?.lockedModules.some(
          (locked) => normalizeOrgModuleKey(locked) === moduleKey,
        ) ?? false;
      moduleAvailability = {
        status: "unavailable",
        moduleKey,
        reason: planLocked ? "not-in-plan" : "org-disabled",
        upgradePath: planLocked ? "/settings/billing" : null,
      };
    }
  }

  return resolvePageState({
    permission: options.permission,
    access: permissionState,
    module: moduleAvailability,
    isLoading: options.isLoading,
    isError: options.isError,
    error: options.error,
    isEmpty: options.isEmpty,
  });
}
