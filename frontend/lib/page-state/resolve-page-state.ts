import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AccessState } from "@/lib/rbac/gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  featureDetailsContract,
  moduleDenialDetailsContract,
  quotaDetailsContract,
  type ModuleDenialReason,
} from "./page-state-schema";

export type ModuleAvailability =
  | { status: "loading" }
  | { status: "available" }
  | {
      status: "unavailable";
      moduleKey: string;
      reason: ModuleDenialReason;
      upgradePath: string | null;
    };

export type PageStateResolution =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "denied"; permission: string | null; message?: string }
  | { kind: "module-disabled"; moduleKey: string }
  | { kind: "module-denied"; moduleKey: string }
  | { kind: "plan-required"; moduleKey: string; upgradePath: string }
  | {
      kind: "quota-exceeded";
      limitKey: string;
      used: number;
      limit: number;
      upgradePath: string;
    }
  | { kind: "feature-locked"; feature: string; requiredPlan: string; upgradePath: string }
  | { kind: "session-expired" }
  | { kind: "error"; error: unknown };

export interface PageStateInput {
  readonly permission?: PermissionKey;
  readonly access?: AccessState;
  readonly module?: ModuleAvailability;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error?: unknown;
  readonly isEmpty?: boolean;
}

const DEFAULT_UPGRADE_PATH = "/settings/billing";

export type ModuleDenialResolution = Extract<
  PageStateResolution,
  { kind: "plan-required" | "module-denied" | "module-disabled" }
>;

export function fromModuleDenial(
  moduleKey: string,
  reason: ModuleDenialReason,
  upgradePath: string | null,
): ModuleDenialResolution {
  if (reason === "not-in-plan")
    return { kind: "plan-required", moduleKey, upgradePath: upgradePath ?? DEFAULT_UPGRADE_PATH };
  if (reason === "user-denied") return { kind: "module-denied", moduleKey };
  return { kind: "module-disabled", moduleKey };
}

export function isSessionExpiredError(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

export function pageStateFromError(error: unknown): PageStateResolution | null {
  if (!isApiError(error)) return null;
  if (error.status === 401) return { kind: "session-expired" };
  if (error.status === 404) return { kind: "empty" };
  if (error.status === 403)
    return { kind: "denied", permission: null, message: getErrorMessage(error) };
  if (error.status !== 402) return null;

  if (error.code === "MODULE_NOT_ENABLED") {
    const parsed = moduleDenialDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "module-disabled", moduleKey: "" };
    return fromModuleDenial(parsed.data.moduleKey, parsed.data.reason, parsed.data.upgradePath);
  }

  if (error.code === "QUOTA_EXCEEDED") {
    const parsed = quotaDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "error", error };
    return { kind: "quota-exceeded", ...parsed.data };
  }

  if (error.code === "FEATURE_NOT_AVAILABLE") {
    const parsed = featureDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "error", error };
    return { kind: "feature-locked", ...parsed.data };
  }

  return { kind: "error", error };
}

export function resolvePageState(input: PageStateInput): PageStateResolution {
  if (input.isError && isSessionExpiredError(input.error))
    return { kind: "session-expired" };

  if (input.access === "loading") return { kind: "loading" };
  if (input.module?.status === "loading") return { kind: "loading" };

  if (input.module?.status === "unavailable")
    return fromModuleDenial(
      input.module.moduleKey,
      input.module.reason,
      input.module.upgradePath,
    );

  if (input.access === "denied")
    return { kind: "denied", permission: input.permission ?? null };

  if (input.isLoading) return { kind: "loading" };

  if (input.isError) return pageStateFromError(input.error) ?? { kind: "error", error: input.error };

  if (input.isEmpty === true) return { kind: "empty" };
  return { kind: "ready" };
}
