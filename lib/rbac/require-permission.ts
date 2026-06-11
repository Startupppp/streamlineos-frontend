import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { getSessionAbility } from "@/lib/abilities-server";
import type { AppAbility } from "@/lib/abilities";

export class PermissionDeniedError extends Error {
  permission: string;
  constructor(permission: string) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionDeniedError";
    this.permission = permission;
  }
}

export interface RequirePermissionResult {
  session: Session;
  ability: AppAbility;
}

function parsePermission(permission: string): { verb: string; subject: string } {
  const parts = permission.split(":");
  if (parts.length === 3) {
    const [domain, resource, action] = parts;
    return { verb: action, subject: `${domain}:${resource}` };
  }
  if (parts.length === 2) {
    const [verb, subject] = parts;
    return { verb, subject };
  }
  return { verb: "read", subject: permission };
}

export async function requirePermission(
  permission: string | string[],
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
    throw new PermissionDeniedError(perms.join(" OR "));
  }

  return { session, ability };
}

export async function requirePermissionApi(
  permission: string | string[],
): Promise<RequirePermissionResult | NextResponse> {
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const ability = await getSessionAbility();
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => {
    const { verb, subject } = parsePermission(p);
    return ability.can(verb, subject);
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden", code: "RBAC_DENIED", permission: perms.join(" OR ") },
      { status: 403 },
    );
  }

  return { session, ability };
}

export async function hasPermission(permission: string): Promise<boolean> {
  const ability = await getSessionAbility();
  const { verb, subject } = parsePermission(permission);
  return ability.can(verb, subject);
}
