import type { PermissionKey } from "@/lib/rbac/permissions";
import type { AccessResponse } from "@/hooks/api/access-schema";

export function grantsPermission(
  access: Pick<AccessResponse, "isOrgOwner" | "scopes"> | undefined,
  permission: PermissionKey,
): boolean {
  return access ? access.isOrgOwner || permission in access.scopes : false;
}

export interface PermissionGate {
  readonly permission: PermissionKey;
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly pending: boolean;
  readonly unavailable: boolean;
}

export function permissionGate(
  permission: PermissionKey,
  allowed: boolean,
  resolved: boolean,
  failed = false,
): PermissionGate {
  const granted = allowed && resolved;
  return {
    permission,
    allowed: granted,
    denied: resolved && !granted,
    pending: !resolved && !failed,
    unavailable: !resolved && failed,
  };
}

export type Gated<TResult> = TResult & { readonly access: PermissionGate };

export function gated<TResult extends object>(
  result: TResult,
  access: PermissionGate,
): Gated<TResult> {
  return Object.assign({}, result, { access });
}
