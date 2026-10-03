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

export function usePageState(options: UsePageStateOptions): PageStateResolution {
  const {
    data: access,
    isLoading: accessLoading,
    isError: accessFailed,
    error: accessError,
    isEnabled: accessEnabled,
  } = useAccess();
  const { data: entitlements } = useEntitlements(options.module !== undefined);

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

  if (
    accessEnabled === false &&
    access === undefined &&
    (options.permission !== undefined || options.module !== undefined)
  )
    return { kind: "denied", permission: options.permission ?? null };

  const permissionState =
    options.permission === undefined
      ? ("granted" as const)
      : accessState({
          isLoading: accessLoading || access === undefined,
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
