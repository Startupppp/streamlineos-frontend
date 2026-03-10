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
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/notifications",
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/auth/reset-password",
  "/verify-email",
];

const ALLOW_AUTHENTICATED = [
  "/setup-organization",
  "/invitation",
  "/auth/reset-password",
];

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_CLEANUP_INTERVAL = 60_000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const RATE_LIMITED_PREFIXES = [
    "/api/auth/",
    "/api/trpc/auth.",
    "/api/trpc/organization.inviteUser",
    "/api/trpc/organization.createOrganization",
    "/api/trpc/hr.employee.onboardEmployee",
    "/api/storage/upload",
    "/api/ai/",
    "/api/chat",
  ];
  if (RATE_LIMITED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  const isAuthenticated = !!token;
  if (!isAuthenticated && startsWithAny(pathname, PROTECTED_ROUTES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    startsWithAny(pathname, AUTH_ROUTES) &&
    !startsWithAny(pathname, ALLOW_AUTHENTICATED)
  ) {
    const callbackUrl = searchParams.get("callbackUrl");
    const url = req.nextUrl.clone();
    const isSafeRedirect =
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.includes("\\");
    url.pathname = isSafeRedirect ? callbackUrl : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    token?.isActive !== undefined &&
    token.isActive === false &&
    !pathname.startsWith("/api/auth/signout")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signout";
    url.search = "";
    return NextResponse.redirect(url);
  }
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
