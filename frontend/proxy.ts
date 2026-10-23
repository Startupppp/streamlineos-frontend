import { NextResponse, NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import { recordLegacyRedirect } from "@/lib/observability/legacy-redirect";
import {
  sessionCookieBases,
  isSessionCookieName,
  SESSION_EXPIRED_QUERY,
  SESSION_EXPIRED_VALUE,
  withExpiredSessionCookies,
} from "@/lib/auth-session-cookies";

export function buildCsp(nonce: string, apiUrl?: string, frameAncestor?: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
    "https://www.googletagmanager.com",
    "https://www.clarity.ms",
    "https://checkout.razorpay.com",
    "https://cdn.razorpay.com",
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

  const blogMediaOrigin = (() => {
    try {
      const u = new URL(process.env.NEXT_PUBLIC_BLOG_MEDIA_ORIGIN ?? "");
      return u.protocol === "https:" || (isDev && u.protocol === "http:") ? u.origin : "";
    } catch {
      return "";
    }
  })();

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
    "https://cdn.razorpay.com",
    "https://lumberjack.razorpay.com",
    "https://api.openai.com",
    "https://*.realtime.ably.net",
    "wss://*.realtime.ably.net",
    "https://*.fallback.ably-realtime.com",
    "wss://*.fallback.ably-realtime.com",
   "https://internet-up.ably-realtime.com",
    "wss://ws-up.ably-realtime.com",
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https: https://api.dicebear.com https://*.r2.cloudflarestorage.com https://*.r2.dev https://lh3.googleusercontent.com https://streamlineos.app https://images.unsplash.com https://www.googletagmanager.com${blogMediaOrigin ? ` ${blogMediaOrigin}` : ""}`,
    "font-src 'self' https://fonts.gstatic.com https://esm.sh",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-src https://www.googletagmanager.com https://checkout.razorpay.com https://api.razorpay.com",
    `frame-ancestors ${frameAncestor ?? "'none'"}`,
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

function validFrameAncestor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password) return null;
    if (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.protocol === "http:" && isLoopbackHostname(url.hostname)))
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function bookingFrameAncestor(token: string): Promise<string | null> {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const url = new URL(`/public/calendar/booking/${encodeURIComponent(token)}/embed-origin`, apiUrl);
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) return null;
    const data = payload.data;
    if (!data || typeof data !== "object" || !("allowedOrigin" in data)) return null;
    return validFrameAncestor(data.allowedOrigin);
  } catch {
    return null;
  }
}

const PROTECTED_ROUTES = [
  "/dashboard",
  "/build",
  "/hr",
  "/recruitment",
  "/settings",
  "/onboarding",
  "/employee-onboarding",
  "/post-invite",
  "/org-setup",
  "/access-suspended",
  "/removed-from-org",
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

function isPublicCalendarPage(pathname: string): boolean {
  return /^\/calendar\/(?:book|polls)\/[^/]+\/?$/.test(pathname) ||
    /^\/calendar\/invitations\/(?:rsvp|join)\/?$/.test(pathname);
}

function isPublicSigningPage(pathname: string): boolean {
  return /^\/sign\/[0-9a-f]{64}\/?$/i.test(pathname);
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
    recordLegacyRedirect("/projects", "/build" + rest);
    return redirectTo(req, "/build" + rest, req.nextUrl.search);
  }

  if (matchesRoute(pathname, "/product-management")) {
    const rest = pathname.slice("/product-management".length);
    recordLegacyRedirect("/product-management", "/build" + rest);
    return redirectTo(req, "/build" + rest, req.nextUrl.search);
  }

  if (pathname === "/knowledge") {
    recordLegacyRedirect("/knowledge", "/knowledge/wiki");
    return redirectTo(req, "/knowledge/wiki", req.nextUrl.search);
  }

  if (matchesRoute(pathname, "/onboarding"))
    return redirectTo(req, "/employee-onboarding");

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const publicPage = isPublicCalendarPage(pathname) || isPublicSigningPage(pathname);
  const secret = process.env.NEXTAUTH_SECRET;
  let token: JWT | null = null;
  if (!publicPage) {
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
  }

  const isProtected =
    (matchesAny(pathname, PROTECTED_ROUTES) && !publicPage) || isBlogAdminPath(pathname);

  if (!token && isProtected) {
    const hasSessionCookie = req.cookies
      .getAll()
      .some((c) => isSessionCookieName(c.name));
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    if (hasSessionCookie) {
      url.searchParams.set(SESSION_EXPIRED_QUERY, SESSION_EXPIRED_VALUE);
    }
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  let clearStaleSession = false;
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
      clearStaleSession =
        req.nextUrl.searchParams.get(SESSION_EXPIRED_QUERY) ===
        SESSION_EXPIRED_VALUE;

      if (!clearStaleSession) {
        const target = resolveSafeCallbackUrl(req);
        if (target) return redirectTo(req, target.pathname, target.search);

        return redirectTo(req, "/dashboard");
      }
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
  const bookingMatch = /^\/calendar\/book\/([^/]+)\/?$/.exec(pathname);
  const frameAncestor = bookingMatch
    ? await bookingFrameAncestor(bookingMatch[1])
    : null;
  response.headers.set(
    "Content-Security-Policy",
    buildCsp(nonce, process.env.NEXT_PUBLIC_API_URL, frameAncestor ?? undefined),
  );
  if (!frameAncestor) response.headers.set("X-Frame-Options", "DENY");
  return withExpiredSessionCookies(response, req, clearStaleSession);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
