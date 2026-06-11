

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { BLOG_ADMIN_ROLES } from "@/lib/constants/roles";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";

export type AuthSession = Omit<Session, "orgId"> & {
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

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400): NextResponse<never> {
  return NextResponse.json({ error: message }, { status }) as NextResponse<never>;
}

export type RouteResponse = NextResponse | Response;

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

export async function withAdmin(
  handler: (session: AuthSession) => Promise<RouteResponse>
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
}

export async function withBlogAdmin(
  handler: (session: AuthSession) => Promise<RouteResponse>
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    if (!BLOG_ADMIN_ROLES.includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
}

export async function withRoles(
  allowed: readonly string[],
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!allowed.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
}

export async function withCEO(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO"], handler);
}

export async function withHrRole(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO", "HR"], handler);
}

export async function withSalesRole(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO", "HR", "SALES"], handler);
}

export async function withCrmRole(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO", "HR", "SALES"], handler);
}

export async function withMarketingRole(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO", "HR", "DIGITAL_MARKETING"], handler);
}

export async function withSupportRole(
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withRoles(["CEO", "HR", "CUSTOMER_SUPPORT"], handler);
}

export function parseQuery<T>(req: NextRequest, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(raw);
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function toNumber(val: string | null | undefined): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

export function toBool(val: string | null | undefined): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  return val === "true" || val === "1";
}
