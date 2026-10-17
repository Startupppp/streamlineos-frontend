"use client";

import { useAccess } from "@/hooks/api/access";
import { useEntitlements } from "@/hooks/api/entitlements";
import { accessState } from "@/lib/rbac/gate";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import {
  pageStateFromError,
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
  readonly hasActiveFilters?: boolean;
}

export function resolveModuleAvailability(
  module: string,
  accessLoading: boolean,
  modules: Record<string, boolean> | undefined,
  lockedModules: string[] | undefined,
): ModuleAvailability {
  const moduleKey = normalizeOrgModuleKey(module);
  if (accessLoading || modules === undefined) return { status: "loading" };
  if (modules[moduleKey] === true) return { status: "available" };
  const planLocked =
    lockedModules?.some(
      (locked) => normalizeOrgModuleKey(locked) === moduleKey,
    ) ?? false;
  return {
    status: "unavailable",
    moduleKey,
    reason: planLocked ? "not-in-plan" : "org-disabled",
    upgradePath: planLocked ? "/settings/billing" : null,
  };
}

export function usePageState(
  options: UsePageStateOptions,
): PageStateResolution {
  const {
    data: access,
    isLoading: accessLoading,
    isError: accessFailed,
    error: accessError,
  } = useAccess();
  const { data: entitlements } = useEntitlements(options.module !== undefined);

  const moduleAvailability: ModuleAvailability | undefined =
    options.module !== undefined
      ? resolveModuleAvailability(
          options.module,
          accessLoading || access === undefined,
          access?.modules,
          entitlements?.lockedModules,
        )
      : undefined;

  if (accessFailed && access === undefined)
    return (
      pageStateFromError(accessError) ?? { kind: "error", error: accessError }
    );

  const permissionState =
    options.permission === undefined
      ? ("granted" as const)
      : accessState({
          isLoading: accessLoading || access === undefined,
          granted:
            access !== undefined &&
            grantsPermission(access, options.permission),
        });

  return resolvePageState({
    permission: options.permission,
    access: permissionState,
    module: moduleAvailability,
    isLoading: options.isLoading,
    isError: options.isError,
    error: options.error,
    isEmpty: options.isEmpty,
    hasActiveFilters: options.hasActiveFilters,
  });
}
