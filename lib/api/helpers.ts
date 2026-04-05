/**
 * Shared helpers for /api/* route handlers.
 * Every route handler follows this pattern:
 *
 *   export async function GET(req: NextRequest) {
 *     return withAuth(async (session) => {
 *       const data = await getMyQuery(session.orgId);
 *       return ok(data);
 *     });
 *   }
 */

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";

/**
 * The authenticated session type used throughout all /api/* route handlers.
 * `orgId` is narrowed to `string` (non-nullable) because:
 *   - middleware redirects users without an orgId to /onboarding before hitting API routes
 *   - withAuth returns 401 if orgId is missing
 */
export type AuthSession = Omit<Session, "orgId"> & {
  user: NonNullable<Session["user"]>;
  /** Guaranteed non-null by withAuth — middleware ensures orgId exists before API calls. */
  orgId: string;
  /** Branch the user belongs to. Null for CEO/HR (org-wide access). */
  branchId: number | null;
};

/** Shape of the per-user Redis session cache set by lib/auth.ts JWT callback. */
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

/** Returns a typed 200 JSON response. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Returns a typed error response. Cast to never so it's compatible with any withAuth<T> handler. */
export function err(message: string, status = 400): NextResponse<never> {
  return NextResponse.json({ error: message }, { status }) as NextResponse<never>;
}

/** Wraps a handler in session auth check. Unauthorized → 401. */
export async function withAuth<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" } as T, { status: 401 });
  }

  // Resolve orgId and branchId from session (may be updated by Redis cache below)
  let orgId: string | null | undefined = session.orgId;
  let branchId: number | null = (session as { branchId?: number | null }).branchId ?? null;

  // Check if this specific session has been revoked (e.g., user signed out another device)
  const sessionId = (session as { sessionId?: string }).sessionId;
  if (redis && sessionId) {
    try {
      const revoked = await redis.get<boolean>(`revoked:session:${sessionId}`);
      if (revoked) {
        return NextResponse.json({ error: "Session revoked" } as T, { status: 401 });
      }
    } catch {
      // Redis error — allow the request to proceed (JWT is still valid)
    }
  }

  // Single Redis check per request: verify session is still valid and hydrate
  // with the freshest user/org data (avoids stale JWT data)
  if (redis) {
    try {
      const cached = await redis.get<UserSessionRedisCache>(`user:session:${session.user.id}`);
      if (cached !== null) {
        // Account was explicitly deactivated — reject immediately
        if (cached.isActive === false) {
          return NextResponse.json({ error: "Account deactivated" } as T, { status: 403 });
        }
        // Hydrate session with fresh Redis data (role/org changes take effect immediately)
        if (cached.role !== undefined) session.user.role = (cached.role ?? session.user.role) as typeof session.user.role;
        if (cached.name !== undefined) session.user.name = cached.name ?? session.user.name;
        if (cached.image !== undefined) session.user.image = cached.image ?? session.user.image;
        if (cached.isPasswordChangeRequired !== undefined) {
          session.user.forceChangePassword = cached.isPasswordChangeRequired ?? session.user.forceChangePassword;
        }
        // orgId/branchId live at the session level — take the freshest value from Redis
        if (cached.orgId !== undefined) orgId = cached.orgId ?? orgId;
        if (cached.branchId !== undefined) branchId = cached.branchId ?? null;
      }
      // If cached === null: Redis miss (key expired or cleared). Gracefully allow —
      // the JWT callback will repopulate Redis on the next auth() call.
    } catch {
      // Redis error — proceed with JWT values
    }
  }

  // Ensure orgId is present (middleware redirects missing-orgId users to /onboarding,
  // but API routes called directly must still guard here)
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" } as T, { status: 403 });
  }

  // Build the narrowed AuthSession with orgId guaranteed as string
  const authSession: AuthSession = Object.assign(session, { orgId, branchId }) as AuthSession;
  try {
    return await handler(authSession);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.errors.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 }) as NextResponse<T>;
    }
    throw e;
  }
}

/** Same as withAuth but also enforces CEO/HR/ADMIN roles. */
export async function withAdmin<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
    }
    return handler(session);
  });
}

/** Parse + validate query params from a NextRequest using a Zod schema. */
export function parseQuery<T>(req: NextRequest, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(raw);
}

/** Parse + validate JSON body using a Zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

/** Coerce a string query param to number (returns undefined if blank). */
export function toNumber(val: string | null | undefined): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/** Coerce a string query param to boolean. */
export function toBool(val: string | null | undefined): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  return val === "true" || val === "1";
}
