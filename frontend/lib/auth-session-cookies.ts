import type { NextRequest, NextResponse } from "next/server";

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

export function expireSessionCookies(
  res: NextResponse,
  req: NextRequest,
): void {
  for (const cookie of req.cookies.getAll()) {
    if (!isSessionCookieName(cookie.name)) continue;
    res.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      ...(cookie.name.startsWith("__Secure-") ? { secure: true } : {}),
    });
  }
}

export function withExpiredSessionCookies(
  res: NextResponse,
  req: NextRequest,
  shouldExpire: boolean,
): NextResponse {
  if (shouldExpire) {
    expireSessionCookies(res, req);
  }
  return res;
}
