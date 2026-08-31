import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import {
  requireModulePermission,
  requirePermission,
  requireSession,
} from "@/lib/rbac/require-permission";
import { resolveRequestPath } from "@/lib/rbac/request-path";
import type { AccessResponse } from "@/types/access";
import { resolveRouteAccess } from "./route-access";

export interface EnforcedRouteAccess {
  pathname: string;
  session: Session;
  access: AccessResponse | null;
}

async function currentPathname(fallback: string): Promise<string> {
  const requestHeaders = await headers();
  return resolveRequestPath(requestHeaders) ?? fallback;
}

export async function enforceRouteAccess(
  fallbackPath: string,
): Promise<EnforcedRouteAccess> {
  const pathname = await currentPathname(fallbackPath);
  const decision = resolveRouteAccess(pathname);

  if (decision.kind === "unknown") {
    await requireSession();
    const params = new URLSearchParams({
      required: "route:unregistered",
      from: pathname,
    });
    redirect(`/access-denied?${params.toString()}`);
  }

  if (decision.kind === "universal") {
    const session = await requireSession();
    return { pathname, session, access: null };
  }

  if (decision.orgModuleKey) {
    const { session, access } = await requireModulePermission(
      decision.orgModuleKey,
      decision.permission ?? undefined,
    );
    return { pathname, session, access };
  }

  if (decision.permission) {
    const { session, access } = await requirePermission(decision.permission);
    return { pathname, session, access };
  }

  await requireSession();
  const params = new URLSearchParams({
    required: "route:unresolved",
    from: pathname,
  });
  redirect(`/access-denied?${params.toString()}`);
}
