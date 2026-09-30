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
 * One read's permission, as four mutually exclusive answers rather than a
 * boolean.
 *
 * `denied` is deliberately not `!allowed`. Until the access snapshot has
 * arrived the answer is `pending`, and a screen that reads an unresolved gate
 * as a refusal tells a permitted user they lack access.
 *
 * `unavailable` is the fourth, and it is the one whose absence was a bug. A
 * gate built from `data !== undefined` alone cannot tell "not here yet" from
 * "the access read failed": `/me/access` errors, `data` stays undefined for
 * ever, and `pending` stays true for ever with it. Every surface that renders a
 * skeleton while pending then renders that skeleton until the tab is closed —
 * which is the directory search that never resolved and the HR routes stuck on
 * loading skeletons (BUG-HRMS-011, BUG-HRMS-012), and why one degraded org sync
 * walled a whole session (BUG-HRMS-014).
 */
export interface PermissionGate {
  readonly permission: PermissionKey;
  readonly allowed: boolean;
  readonly denied: boolean;
  readonly pending: boolean;
  /** The access snapshot could not be read at all — neither granted nor refused. */
  readonly unavailable: boolean;
}

export function permissionGate(
  permission: PermissionKey,
  allowed: boolean,
  resolved: boolean,
  failed = false,
): PermissionGate {
  // `allowed` is conjoined with `resolved` so the four answers are mutually
  // exclusive by construction rather than by every caller being careful. Nothing
  // reachable grants a permission it has not read — `grantsPermission` returns
  // false for undefined access — and a gate that could report `allowed` and
  // `pending` together is a state no surface knows how to branch on.
  const granted = allowed && resolved;
  return {
    permission,
    allowed: granted,
    denied: resolved && !granted,
    pending: !resolved && !failed,
    unavailable: !resolved && failed,
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
