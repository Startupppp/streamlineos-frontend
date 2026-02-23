import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/projects",
  "/hr",
  "/settings",
  "/onboarding",
  "/ceo",
  "/sales",
  "/customer-executive",
  "/marketing",
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const ALLOW_AUTHENTICATED = [
  "/setup-organization",
  "/invitation",
  "/auth/reset-password",
];

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Skip API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Get token - NextAuth v5 uses authjs prefix
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  const isAuthenticated = !!token;

  // Unauthenticated users cannot access protected routes
  if (!isAuthenticated && startsWithAny(pathname, PROTECTED_ROUTES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users should not see auth pages (except allowed ones)
  if (
    isAuthenticated &&
    startsWithAny(pathname, AUTH_ROUTES) &&
    !startsWithAny(pathname, ALLOW_AUTHENTICATED)
  ) {
    const callbackUrl = searchParams.get("callbackUrl");
    const url = req.nextUrl.clone();
    url.pathname =
      callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Inactive users get signed out
  if (
    isAuthenticated &&
    token?.isActive === false &&
    !pathname.startsWith("/api/auth/signout")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signout";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Force password change
  if (
    isAuthenticated &&
    token?.forceChangePassword &&
    !pathname.startsWith("/auth/reset-password") &&
    !pathname.startsWith("/api/auth/signout") &&
    !pathname.startsWith("/api/storage/upload")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/reset-password";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Already on reset-password but don't need to change password
  if (
    isAuthenticated &&
    pathname.startsWith("/auth/reset-password") &&
    !token?.forceChangePassword
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
