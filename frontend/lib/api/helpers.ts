import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

type AuthSession = Omit<Session, "orgId"> & {
  user: NonNullable<Session["user"]>;

  orgId: string;

  branchId: number | null;
};

interface UserSessionRedisCache {
  isActive: boolean | null;
  hasDashboardAccess: boolean | null;
  isPasswordChangeRequired: boolean | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  role: string | null;
  orgId: string | null;
  branchId: number | null;
}

type RouteResponse = NextResponse | Response;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400): NextResponse<never> {
  return NextResponse.json({ error: message }, { status }) as NextResponse<never>;
}

export async function withAuth(
  handler: (session: AuthSession) => Promise<RouteResponse>
): Promise<RouteResponse> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string | null | undefined = session.orgId;
  let branchId: number | null = (session as { branchId?: number | null }).branchId ?? null;

  const sessionId = (session as { sessionId?: string }).sessionId;
  if (redis && sessionId) {
    try {
      const revoked = await redis.get<boolean>(`revoked:session:${sessionId}`);
      if (revoked) {
        return NextResponse.json({ error: "Session revoked" }, { status: 401 });
      }
    } catch {

    }
  }

  if (redis) {
    try {
      const cached = await redis.get<UserSessionRedisCache>(`user:session:${session.user.id}`);
      if (cached !== null) {

        if (cached.isActive === false) {
          return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
        }

        if (cached.role !== undefined) session.user.role = (cached.role ?? session.user.role) as typeof session.user.role;
        if (cached.name !== undefined) session.user.name = cached.name ?? session.user.name;
        if (cached.image !== undefined) session.user.image = cached.image ?? session.user.image;
        if (cached.isPasswordChangeRequired !== undefined) {
          session.user.forceChangePassword = cached.isPasswordChangeRequired ?? session.user.forceChangePassword;
        }

        if (cached.orgId !== undefined) orgId = cached.orgId ?? orgId;
        if (cached.branchId !== undefined) branchId = cached.branchId ?? null;
      }

    } catch {

    }
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const authSession: AuthSession = Object.assign(session, { orgId, branchId }) as AuthSession;
  try {
    return await handler(authSession);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.issues.map((issue: { path: PropertyKey[]; message: string }) => `${String(issue.path.join?.(".") ?? "body")}: ${issue.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 });
    }
    throw e;
  }
}
