import { NextResponse, NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import { PLATFORM_OWNER_ROLE, OWNER_HOME } from "@/lib/platform/role";
import { ROLES } from "@/lib/constants/roles";

function buildCsp(nonce: string, apiUrl?: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
    "https://www.googletagmanager.com",
    "https://www.clarity.ms",
    "https://checkout.razorpay.com",
  ].join(" ");

  const apiOrigin = apiUrl
    ? (() => {
        try {
          const u = new URL(apiUrl);
          return `${u.protocol}//${u.host}`;
        } catch {
          return "";
        }
      })()
    : "";

  const connectSrc = [
    "'self'",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://*.r2.cloudflarestorage.com",
    "https://*.r2.dev",
    "https://www.googletagmanager.com",
    "https://www.clarity.ms",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.r2.cloudflarestorage.com https://*.r2.dev https://lh3.googleusercontent.com https://streamlineos.app https://images.unsplash.com https://www.googletagmanager.com",
    "font-src 'self' https://fonts.gstatic.com https://esm.sh",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-src https://www.googletagmanager.com https://checkout.razorpay.com https://api.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

function sessionCookieNames(): string[] {
  if (process.env.NODE_ENV !== "production") return ["authjs.session-token"];

  return ["__Secure-authjs.session-token", "authjs.session-token"];
}

const PROTECTED_ROUTES = [
  "/dashboard",
  "/projects",
  "/hr",
  "/settings",
  "/onboarding",
  "/org-setup",
  "/owner",
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/chat",
  "/notifications",
  "/calendar",
  "/knowledge",
  "/knowledge-base",
  "/surveys",
  "/accounting",
  "/ai",
  "/ask",
  "/inventory",
  "/mail",
  "/organization",
  "/payroll",
  "/sign",
  "/users",
  "/workflows",
];

const AUTH_ROUTES = ["/signin", "/verify-email"];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + "/");
}

function matchesAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => matchesRoute(pathname, route));
}

function isBlogAdminPath(pathname: string): boolean {
  return matchesRoute(pathname, "/blogs/admin");
}

function redirectTo(
  req: NextRequest,
  pathname: string,
  search = "",
): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

function isPlatformAdminToken(token: JWT): boolean {
  return token.isPlatformAdmin === true || token.role === PLATFORM_OWNER_ROLE;
}

function isOrgOwnerToken(token: JWT): boolean {
  return token.isOrgOwner === true || token.role === ROLES.OWNER;
}

function resolveSafeCallbackUrl(req: NextRequest): URL | null {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\")
  ) {
    return null;
  }
  return new URL(callbackUrl, req.nextUrl.origin);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http" &&
    !isLoopbackHostname(req.nextUrl.hostname)
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl, 301);
  }

  if (matchesRoute(pathname, "/signup")) {
    return redirectTo(req, "/signin", req.nextUrl.search);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  let token: JWT | null = null;
  for (const cookieName of sessionCookieNames()) {
    token = await getToken({
      req,
      secret,
      cookieName,
      salt: cookieName,
      secureCookie: cookieName.startsWith("__Secure-"),
    });
    if (token) break;
  }

  const isProtected =
    matchesAny(pathname, PROTECTED_ROUTES) || isBlogAdminPath(pathname);

  if (!token && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (token) {
    if (token.isActive === false) {
      return redirectTo(req, "/api/auth/signout");
    }

    if (matchesAny(pathname, AUTH_ROUTES)) {
      const target = resolveSafeCallbackUrl(req);
      if (target) {
        return redirectTo(req, target.pathname, target.search);
      }
      return redirectTo(req, "/post-signin");
    }

    const isPlatformAdmin = isPlatformAdminToken(token);
    const isOrgOwner = isOrgOwnerToken(token);
    const hasOrg = Boolean(token.orgId);
    const orgSetupDone = Boolean(req.cookies.get("org-setup-done")?.value);
    const onboardingDone = Boolean(req.cookies.get("onboarding-done")?.value);

    if (matchesRoute(pathname, "/org-setup")) {
      if (isPlatformAdmin) return redirectTo(req, OWNER_HOME);
      if (token.orgOnboardingCompletedAt) return redirectTo(req, "/dashboard");
    } else if (matchesRoute(pathname, "/onboarding")) {
      if (isPlatformAdmin) return redirectTo(req, OWNER_HOME);
      if (!hasOrg) return redirectTo(req, "/org-setup");
      if (isOrgOwner) return redirectTo(req, "/dashboard");
      if (token.userOnboardingCompletedAt) return redirectTo(req, "/dashboard");
    } else if (isProtected && !isPlatformAdmin) {
      const needsOrgSetup =
        !hasOrg || (isOrgOwner && !token.orgOnboardingCompletedAt);
      if (needsOrgSetup && !orgSetupDone) {
        return redirectTo(req, "/org-setup");
      }
      if (
        !isOrgOwner &&
        hasOrg &&
        !token.userOnboardingCompletedAt &&
        !onboardingDone
      ) {
        return redirectTo(req, "/onboarding");
      }
      if (
        token.mfaEnforced === true &&
        token.totpEnabled !== true &&
        !matchesRoute(pathname, "/settings")
      ) {
        return redirectTo(req, "/settings", "?tab=security&mfa=required");
      }
    }
  }

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(
    "Content-Security-Policy",
    buildCsp(nonce, process.env.NEXT_PUBLIC_API_URL),
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
