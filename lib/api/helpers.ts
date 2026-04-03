/**
 * Shared helpers for /api/v1/* route handlers.
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
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";

/**
 * The authenticated session type used throughout all /api/v1/* route handlers.
 * We use the NextAuth `Session` type directly (augmented via next-auth.d.ts)
 * rather than `ReturnType<typeof auth>` which resolves to `NextMiddleware`
 * due to TypeScript's overload resolution picking the last overload.
 */
export type AuthSession = Session & {
  user: NonNullable<Session["user"]>;
};

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
  return handler(session as AuthSession);
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
