import type { PermissionKey } from "@/lib/rbac/permissions";

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
