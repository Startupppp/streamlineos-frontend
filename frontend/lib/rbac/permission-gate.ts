import type { PermissionKey } from "@/lib/rbac/permissions";
import type { AccessResponse } from "@/hooks/api/access-schema";

// Neutral on purpose: the client gate and the server prefetch must answer identically.
export function grantsPermission(
  access: Pick<AccessResponse, "isOrgOwner" | "scopes"> | undefined,
  permission: PermissionKey,
): boolean {
  return access ? access.isOrgOwner || permission in access.scopes : false;
}

/**
 * One read's permission, as three mutually exclusive answers rather than a
 * boolean.
 *
 * `denied` is deliberately not `!allowed`. Until the access snapshot has
 * arrived the answer is `pending`, and a screen that reads an unresolved gate
 * as a refusal tells a permitted user they lack access.
 */
export interface PermissionGate {
  readonly permission: PermissionKey;
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly pending: boolean;
}

export function permissionGate(
  permission: PermissionKey,
  allowed: boolean,
  resolved: boolean,
): PermissionGate {
  return {
    permission,
    allowed,
    denied: resolved && !allowed,
    pending: !resolved,
  };
}

/**
 * A result that carries WHY it has no data.
 *
 * It lives here beside the gate rather than in `hooks/api/gated-query` because
 * `hooks/api/access` needs it to gate its own reads, and importing the hook
 * module from there would close an import cycle (`access` -> `gated-query` ->
 * `access`) that `check:cycles` fails on.
 */
export type Gated<TResult> = TResult & { readonly access: PermissionGate };

export function gated<TResult extends object>(
  result: TResult,
  access: PermissionGate,
): Gated<TResult> {
  return Object.assign({}, result, { access });
}
