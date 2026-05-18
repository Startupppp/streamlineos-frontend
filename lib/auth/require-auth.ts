import "server-only";

import { getAuthenticatedMember } from "@/lib/auth/helpers";
import type { AuthResult } from "@/lib/auth/types";

type AuthContext = Exclude<AuthResult, { error: string }>;

/**
 * Server-action auth helper. Mirrors `withAuth` (route handlers) for the
 * server-action world: load session + organization member, optionally check
 * role membership, return a discriminated result.
 *
 * Usage:
 *   const ctx = await requireAuth();
 *   if ("error" in ctx) return ctx; // { error: "Unauthorized" } | { error: "Forbidden" }
 *   // ctx.session, ctx.member, ctx.orgId, ctx.userId, ctx.isAdmin
 */
export async function requireAuth(
  allowedRoles?: readonly string[]
): Promise<AuthContext | { error: "Unauthorized" } | { error: "Forbidden" }> {
  const result = await getAuthenticatedMember();
  if ("error" in result) return result;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(result.member.role)) {
      return { error: "Forbidden" };
    }
  }

  return result;
}
