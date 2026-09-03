import { NextResponse, NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import {
  hasSessionCookie,
  sessionCookieBases,
  SESSION_EXPIRED_QUERY,
  SESSION_EXPIRED_VALUE,
  withExpiredSessionCookies,
} from "@/lib/auth-session-cookies";

export function buildCsp(nonce: string, apiUrl?: string): string {
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
    /**
     * Ably, which carries chat and the support inbox (`lib/ably.ts`). This is the
     * policy a document actually receives — the middleware sets the header on every
     * matched response, so next.config.ts's `headers()` CSP never reaches a page —
     * and `connect-src` governs WebSocket opens as well as fetch/XHR. An omission
     * here is a refused connection with no fallback, not a slower path.
     *
     * ably@2 resolves its default endpoint "main" to `main.realtime.ably.net` with
     * `main.[a-e].fallback.ably-realtime.com` behind it, and reaches both over wss:
     * for the WebSocket transport and https: for the comet/XHR one. CSP scheme
     * matching does not let an `https:` source stand in for a `wss:` request, so
     * both schemes are listed rather than relying on that.
     */
    "https://*.realtime.ably.net",
    "wss://*.realtime.ably.net",
    "https://*.fallback.ably-realtime.com",
    "wss://*.fallback.ably-realtime.com",
    // The library's own reachability probes. Blocked, every transient transport
    // failure is misread as "this device is offline" instead of failing over.
    "https://internet-up.ably-realtime.com",
    "wss://ws-up.ably-realtime.com",
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

const PROTECTED_ROUTES = [
  "/dashboard",
  "/build",
  "/hr",
  "/settings",
  "/onboarding",
  "/employee-onboarding",
  "/org-setup",
  "/access-suspended",
  "/owner",
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/chat",
  "/notifications",
  "/calendar",
  "/knowledge",
  "/surveys",
  "/accounting",
  "/ai",
  "/ask",
  "/inventory",
  "/mail",
  "/payroll",
  "/sign",
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

  if (matchesRoute(pathname, "/signup"))
    return redirectTo(req, "/signin", req.nextUrl.search);

  if (matchesRoute(pathname, "/projects")) {
    const rest = pathname.slice("/projects".length);
    return redirectTo(req, "/build" + rest, req.nextUrl.search);
  }

  if (matchesRoute(pathname, "/product-management")) {
    const rest = pathname.slice("/product-management".length);
    return redirectTo(req, "/build" + rest, req.nextUrl.search);
  }

  if (matchesRoute(pathname, "/onboarding"))
    return redirectTo(req, "/employee-onboarding");

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const secret = process.env.NEXTAUTH_SECRET;
  let token: JWT | null = null;
  for (const cookieName of sessionCookieBases()) {
    token = await getToken({
      req,
      secret,
      cookieName,
      salt: cookieName,
      secureCookie: cookieName.startsWith("__Secure-"),
    });
    if (token) break;
  }

  const staleSessionCookie = !token && hasSessionCookie(req.cookies.getAll());

  const isProtected =
    matchesAny(pathname, PROTECTED_ROUTES) || isBlogAdminPath(pathname);

  if (!token && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return withExpiredSessionCookies(
      NextResponse.redirect(url),
      req,
      staleSessionCookie,
    );
  }

  if (token) {
    if (token.isActive === false)
      return withExpiredSessionCookies(
        redirectTo(
          req,
          "/signin",
          `?${SESSION_EXPIRED_QUERY}=${SESSION_EXPIRED_VALUE}`,
        ),
        req,
        true,
      );

    if (matchesAny(pathname, AUTH_ROUTES)) {
      if (
        req.nextUrl.searchParams.get(SESSION_EXPIRED_QUERY) ===
        SESSION_EXPIRED_VALUE
      )
        return withExpiredSessionCookies(redirectTo(req, pathname), req, true);

      const target = resolveSafeCallbackUrl(req);
      if (target) return redirectTo(req, target.pathname, target.search);

      return redirectTo(req, "/dashboard");
    }
  }

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-search", req.nextUrl.search.slice(1));
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
