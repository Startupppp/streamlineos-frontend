import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { getServerAccess } from "@/lib/rbac/get-server-access";
import { resolveRequestPath } from "@/lib/rbac/request-path";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface RequirePermissionResult {
  session: Session;
  access: AccessResponse;
}

async function getCurrentPath(): Promise<string | null> {
  try {
    const h = await headers();
    return resolveRequestPath(h);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = (await getServerAuth()) as Session | null;
  if (!session?.user) redirect(signInPathForMissingSession());
  return session;
}

export async function requirePermission(
  permission: PermissionKey | PermissionKey[],
  options: { redirectTo?: string } = {},
): Promise<RequirePermissionResult> {
  const session = (await getServerAuth()) as Session | null;
  if (!session?.user) {
    if (options.redirectTo) redirect(options.redirectTo);
    redirect(signInPathForMissingSession());
  }

  const access = await getServerAccess();
  const perms = Array.isArray(permission) ? permission : [permission];
  const granted = new Set(access.permissions);
  const allowed = access.isOrgOwner || perms.some((p) => granted.has(p));

  if (!allowed) {
    if (options.redirectTo) redirect(options.redirectTo);
    const from = await getCurrentPath();
    const params = new URLSearchParams({ required: perms.join(",") });
    if (from) params.set("from", from);
    redirect(`/access-denied?${params.toString()}`);
  }

  return { session, access };
}
