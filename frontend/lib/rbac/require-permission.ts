import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { getSessionAbility } from "@/lib/abilities-server";
import type { AppAbility } from "@/lib/abilities";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface RequirePermissionResult {
  session: Session;
  ability: AppAbility;
}

function parsePermission(permission: string): { verb: string; subject: string } {
  const parts = permission.split(":");
  if (parts.length < 2) return { verb: "read", subject: permission };
  const verb = parts[parts.length - 1];
  const subject = parts.slice(0, -1).join(":");
  return { verb, subject };
}

async function getCurrentPath(): Promise<string | null> {
  try {
    const h = await headers();
    const referer = h.get("referer");
    const nextUrl = h.get("next-url") ?? h.get("x-invoke-path");
    if (nextUrl) return nextUrl;
    if (referer) {
      try {
        return new URL(referer).pathname;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = (await auth()) as Session | null;
  if (!session?.user) redirect("/signin");
  return session;
}

export async function requirePermission(
  permission: PermissionKey | PermissionKey[],
  options: { redirectTo?: string } = {},
): Promise<RequirePermissionResult> {
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    if (options.redirectTo) redirect(options.redirectTo);
    redirect("/signin");
  }

  const ability = await getSessionAbility();
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => {
    const { verb, subject } = parsePermission(p);
    return ability.can(verb, subject);
  });

  if (!allowed) {
    if (options.redirectTo) redirect(options.redirectTo);
    const from = await getCurrentPath();
    const params = new URLSearchParams({ required: perms.join(",") });
    if (from) params.set("from", from);
    redirect(`/access-denied?${params.toString()}`);
  }

  return { session, ability };
}
