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

export function usePageState(options: UsePageStateOptions): PageStateResolution {
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

  /**
   * A failed access read is a failed read, not a slow one.
   *
   * `accessState` is documented to take the query's own loading flag "rather
   * than inferring it from the absence of data, because inferring one from the
   * other is how they were conflated" — and both call sites then passed
   * `accessLoading || access === undefined`, re-introducing exactly that
   * inference. When `/me/access` errors, `data` stays undefined for ever, so
   * every gated page resolved to `loading` for ever and rendered its skeleton
   * until the tab was closed. That is the infinite skeleton across the HR routes
   * and why one degraded org sync walled a whole session
   * (BUG-HRMS-012, BUG-HRMS-014).
   *
   * Reported as an error, the surface gets `ErrorState` and a Retry, and a 401
   * still resolves to session-expired through the usual mapping.
   */
  if (accessFailed && access === undefined)
    return pageStateFromError(accessError) ?? { kind: "error", error: accessError };

  const permissionState =
    options.permission === undefined
      ? ("granted" as const)
      : accessState({
          isLoading: accessLoading || access === undefined,
          granted: access !== undefined && grantsPermission(access, options.permission),
        });

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
