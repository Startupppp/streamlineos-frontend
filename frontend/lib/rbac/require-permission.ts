import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { resolveRequestPath } from "@/lib/rbac/request-path";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";

interface RequirePermissionResult {
  session: Session;
  access: AccessResponse;
}

export class AccessUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Could not load your permissions. Please try again.");
    this.name = "AccessUnavailableError";
    if (cause !== undefined) this.cause = cause;
  }
}

async function resolveAccessOrFail(): Promise<AccessResponse> {
  const result = await getServerAccessResult();
  if (!result.ok) throw new AccessUnavailableError(result.error);
  return result.access;
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
  const session = await getServerAuth();
  if (!session?.user || session.user.isActive === false)
    redirect(signInPathForMissingSession());
  return session;
}

export async function requirePermission(
  permission: PermissionKey | PermissionKey[],
  options: { redirectTo?: string } = {},
): Promise<RequirePermissionResult> {
  const session = await getServerAuth();
  if (!session?.user) {
    if (options.redirectTo) redirect(options.redirectTo);
    redirect(signInPathForMissingSession());
  }
  if (session.user.isActive === false) redirect(signInPathForMissingSession());

  const access = await resolveAccessOrFail();
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => grantsPermission(access, p));

  if (!allowed) {
    if (options.redirectTo) redirect(options.redirectTo);
    const from = await getCurrentPath();
    const params = new URLSearchParams({ required: perms.join(",") });
    if (from) params.set("from", from);
    redirect(`/access-denied?${params.toString()}`);
  }

  return { session, access };
}

export async function requireModulePermission(
  moduleKey: string,
  permission?: PermissionKey | PermissionKey[],
): Promise<RequirePermissionResult> {
  const session = await requireSession();
  const access = await resolveAccessOrFail();
  const normalizedModule = normalizeOrgModuleKey(moduleKey);

  if (access.modules[normalizedModule] !== true) {
    const from = await getCurrentPath();
    const params = new URLSearchParams({
      required: `module:${normalizedModule}`,
      reason: "org-disabled",
    });
    if (from) params.set("from", from);
    redirect(`/access-denied?${params.toString()}`);
  }

  if (permission) {
    const required = Array.isArray(permission) ? permission : [permission];
    if (!required.some((key) => grantsPermission(access, key))) {
      const from = await getCurrentPath();
      const params = new URLSearchParams({ required: required.join(",") });
      if (from) params.set("from", from);
      redirect(`/access-denied?${params.toString()}`);
    }
  }

  return { session, access };
}
