import type { NextRequest, NextResponse } from "next/server";

export const SESSION_EXPIRED_QUERY = "session";
export const SESSION_EXPIRED_VALUE = "expired";

export function sessionCookieBases(): string[] {
  if (process.env.NODE_ENV !== "production") {
    return ["authjs.session-token"];
  }
  return ["__Secure-authjs.session-token", "authjs.session-token"];
}

export function isSessionCookieName(name: string): boolean {
  return sessionCookieBases().some(
    (base) => name === base || name.startsWith(`${base}.`),
  );
}

export function hasSessionCookie(
  cookies: ReadonlyArray<{ name: string }>,
): boolean {
  return cookies.some((cookie) => isSessionCookieName(cookie.name));
}

export function signInPathForMissingSession(callbackUrl?: string): string {
  const params = new URLSearchParams();
  params.set(SESSION_EXPIRED_QUERY, SESSION_EXPIRED_VALUE);
  if (
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") &&
    !callbackUrl.includes("\\")
  ) {
    params.set("callbackUrl", callbackUrl);
  }
  return `/signin?${params.toString()}`;
}

export function withExpiredSessionCookies(
  res: NextResponse,
  req: NextRequest,
  shouldExpire: boolean,
): NextResponse {
  if (!shouldExpire) return res;
  for (const cookie of req.cookies.getAll()) {
    if (!isSessionCookieName(cookie.name)) continue;
    res.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      ...(cookie.name.startsWith("__Secure-") || cookie.name.startsWith("__Host-")
        ? { secure: true }
        : {}),
    });
  }
  return res;
}
