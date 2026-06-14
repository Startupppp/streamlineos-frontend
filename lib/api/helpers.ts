

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { getSessionAbility } from "@/lib/abilities-server";
import type { Module } from "@/lib/billing/plan-modules";
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

export type AbilityVerb = "create" | "read" | "update" | "delete" | "manage" | "approve" | "generate" | "view";

export type AbilitySubject =
  | "all"
  | "accounting"
  | "accounting:accounts"
  | "accounting:journal"
  | "accounting:reports"
  | "audit-log"
  | "blog"
  | "blog:posts"
  | "blog:categories"
  | "blog:authors"
  | "crm"
  | "crm:leads"
  | "crm:deals"
  | "crm:contacts"
  | "crm:clients"
  | "crm:quotes"
  | "crm:targets"
  | "crm:assignment-rules"
  | "crm:email-templates"
  | "crm:scoring-rules"
  | "crm:sla"
  | "hr"
  | "hr:employees"
  | "hr:payrolls"
  | "hr:payroll"
  | "hr:leaves"
  | "hr:expenses"
  | "hr:exit"
  | "hr:onboarding"
  | "hr:feedback"
  | "hr:compliance"
  | "hr:handbook"
  | "hr:alumni"
  | "hr:bonuses"
  | "hr:assets"
  | "hr:career-ladders"
  | "hr:headcount"
  | "hr:integrations"
  | "hr:email-templates"
  | "hr:analytics"
  | "hr:documents"
  | "projects"
  | "projects:sprints"
  | "projects:settings"
  | "projects:goals"
  | "projects:roadmap"
  | "support:kb"
  | "settings:automations"
  | "sales"
  | "settings"
  | "settings:custom-fields"
  | "settings:email-templates"
  | "settings:webhooks"
  | "settings:onboarding"
  | "settings:mfa";

export async function withAbility(
  verb: AbilityVerb,
  subject: AbilitySubject,
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can(verb, subject)) {
      return NextResponse.json(
        { error: "Forbidden", code: "RBAC_DENIED", verb, subject },
        { status: 403 },
      );
    }
    return handler(session);
  });
}

export async function withModule(
  module: Module,
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const isPlatformAdmin = session.user.isPlatformAdmin === true;
    const enabled = session.enabledModules ?? [];
    if (!isPlatformAdmin && !enabled.includes(module)) {
      return NextResponse.json(
        { error: "Module not available on this plan", code: "MODULE_DISABLED", module },
        { status: 404 },
      );
    }
    return handler(session);
  });
}

export async function withModuleAbility(
  module: Module,
  verb: AbilityVerb,
  subject: AbilitySubject,
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withModule(module, async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can(verb, subject)) {
      return NextResponse.json(
        { error: "Forbidden", code: "RBAC_DENIED", verb, subject },
        { status: 403 },
      );
    }
    return handler(session);
  });
}

/** @deprecated Use {@link withModuleAbility} or {@link withAbility}. Kept as a shim during Wave 1 migration. */
export async function withAdmin(
  handler: (session: AuthSession) => Promise<RouteResponse>
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "all") && !ability.can("manage", "hr:employees")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
}

/** @deprecated Use {@link withModuleAbility}("settings", "manage", "blog:posts"). */
export async function withBlogAdmin(
  handler: (session: AuthSession) => Promise<RouteResponse>
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "all") && !ability.can("manage", "settings")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
}

/** @deprecated Hardcoded role names bypass dynamic RBAC. Use {@link withModuleAbility} instead. */
export async function withRoles(
  allowed: readonly string[],
  handler: (session: AuthSession) => Promise<RouteResponse>,
): Promise<RouteResponse> {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (ability.can("manage", "all")) return handler(session);
    const role = session.user.role ?? "";
    if (!allowed.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(session);
  });
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
