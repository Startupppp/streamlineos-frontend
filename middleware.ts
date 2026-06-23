import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { PLATFORM_OWNER_ROLE, OWNER_HOME } from "@/lib/platform/role";
import { ROLES } from "@/lib/constants/roles";

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

function authJsSessionCookieName(req: NextRequest): string {
  if (process.env.NODE_ENV !== "production") {
    return "authjs.session-token";
  }
  const forwarded = req.headers.get("x-forwarded-proto");
  const isHttps = forwarded === "https" || req.nextUrl.protocol === "https:";
  return isHttps ? "__Secure-authjs.session-token" : "authjs.session-token";
}

const PROTECTED_ROUTES = [
  "/dashboard",
  "/projects",
  "/goals",
  "/hr",
  "/settings",
  "/onboarding",
  "/org-setup",
  "/owner",
  "/ceo",
  "/sales",
  "/customer-executive",
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/chat",
  "/reports",
  "/notifications",
  "/ai",
  "/calendar",
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/setup-password",
  "/verify-email",
];

const ALLOW_AUTHENTICATED = [
  "/invitation",
  "/reset-password",
  "/setup-password",
];

const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  "/hr": ["hr:employees:view"],
  "/hr/onboarding": ["hr:employees:create"],
  "/hr/payroll": ["hr:payroll:view"],
  "/hr/assets": ["hr:assets:view"],
  "/hr/documents": ["hr:documents:view"],
  "/hr/work-logs": ["self:attendance"],
  "/hr/performance": ["hr:performance:view"],
  "/hr/org-chart": ["hr:employees:view"],
  "/hr/incentives": ["crm:incentives:read"],
  "/hr/my-payslips": ["self:payslips"],
  "/hr/leaves": ["self:leaves"],
  "/hr/expenses": ["self:expenses"],
  "/hr/attendance": ["self:attendance"],
  "/hr/helpdesk": ["self:attendance"],
  "/crm/leads": ["crm:leads:view"],
  "/crm/deals": ["crm:leads:view"],
  "/crm/targets": ["crm:targets:view"],
  "/crm/reports": ["crm:reports:view"],
  "/crm/clients": ["crm:clients:read"],
  "/projects": ["projects:view"],
  "/projects/roadmap": ["projects:roadmap:view"],
  "/goals": ["projects:goals:view"],
  "/timesheets": ["projects:timesheets:view"],
  "/support": ["projects:tickets:view"],
  "/support/inbox": ["projects:tickets:view"],
  "/support/kb": ["support:kb:view"],
  "/support/macros": ["support:macros:view"],
  "/support/routing": ["support:macros:view"],
  "/settings/automations": ["settings:automations:view"],
  "/chat": ["chat:submit_lead", "self:attendance"],
  "/sales": ["dashboard:sales:view"],
  "/customer-executive": ["dashboard:customer-executive:view"],
  "/settings": ["settings:view"],
  "/settings/roles": ["settings:rbac:manage"],
  "/settings/branches": ["settings:manage"],
  "/billing": ["settings:manage"],
  "/billing/invoices": ["settings:manage"],
  "/notifications": ["self:attendance"],
  "/ceo": ["reports:view"],
  "/ai": ["settings:manage"],
  "/blogs/admin": ["settings:manage"],
};

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

// The public blog lives at /blogs and /blogs/[slug]; only the /blogs/admin CMS is
// gated. Match it exactly (or as a sub-path) so a post slug like "admin-tips"
// stays public.
function isBlogAdminPath(pathname: string): boolean {
  return pathname === "/blogs/admin" || pathname.startsWith("/blogs/admin/");
}

function canAccessRoute(
  pathname: string,
  isPlatformAdmin: boolean,
  isOrgOwner: boolean,
  permissions: string[],
): boolean {
  if (isPlatformAdmin || isOrgOwner) return true;

  const matchingRoutes = Object.keys(ROUTE_PERMISSION_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  const required = ROUTE_PERMISSION_MAP[matchingRoutes[0]];
  if (!required || required.length === 0) return true;
  const granted = new Set(permissions);
  return required.some((perm) => granted.has(perm));
}

const BOT_BLOCKED_PREFIXES = [
  "/api/auth/",
  "/api/trpc/auth.",
  "/api/trpc/organization.",
  "/api/chat",
  "/api/ai/",
  "/api/storage/",
  "/api/expenses/",
];

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const tier = resolveTier(pathname);
  const loadTestSecret = process.env.LOAD_TEST_SECRET;
  const isLoadTestBypass =
    process.env.NODE_ENV !== "production" &&
    loadTestSecret &&
    loadTestSecret.length > 0 &&
    req.headers.get("x-load-test-secret") === loadTestSecret;

  if (tier && !isLoadTestBypass) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await checkRateLimit(tier, ip);

    if (!result.allowed) {
      logger.warn("Rate limit exceeded", { ip, path: pathname, tier, retryAfterSecs: result.retryAfterSecs });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSecs),
          },
        },
      );
    }
  }

  if (BOT_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ua = req.headers.get("user-agent");
    if (isSuspiciousBot(ua)) {
      logger.warn("Blocked suspicious bot", {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
        path: pathname,
        userAgent: ua?.slice(0, 200),
      });
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http" &&
    !isLoopbackHostname(req.nextUrl.hostname)
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl, 301);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: authJsSessionCookieName(req),
  });

  const isAuthenticated = !!token;
  if (
    !isAuthenticated &&
    (startsWithAny(pathname, PROTECTED_ROUTES) || isBlogAdminPath(pathname))
  ) {
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
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/api/auth/signout") &&
    !pathname.startsWith("/api/storage/upload")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/reset-password";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    pathname.startsWith("/reset-password") &&
    !token?.forceChangePassword &&
    !req.nextUrl.searchParams.get("token")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.isOrgOwner &&
    !token?.orgOnboardingCompletedAt &&
    token?.orgId &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/org-setup")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/org-setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.orgOnboardingCompletedAt &&
    pathname.startsWith("/org-setup")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && pathname.startsWith("/onboarding")) {
    if (token?.isPlatformAdmin === true || token?.role === PLATFORM_OWNER_ROLE) {
      const url = req.nextUrl.clone();
      url.pathname = OWNER_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (
      (token?.isOrgOwner === true || token?.role === ROLES.OWNER) &&
      token?.orgId
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (token?.userOnboardingCompletedAt) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (
    isAuthenticated &&
    token?.mfaEnforced &&
    !token?.totpEnabled &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/auth/mfa/")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/settings";
    url.search = "?tab=security&mfa=required";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.orgId === null &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/onboarding")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && token?.orgId && redis) {
    try {
      const allowlistRaw = await redis.get<string>(`org:ip-allowlist:${token.orgId as string}`);
      if (allowlistRaw) {
        const allowlist: string[] = typeof allowlistRaw === "string"
          ? (JSON.parse(allowlistRaw) as string[])
          : (allowlistRaw as unknown as string[]);
        if (allowlist.length > 0) {
          const clientIp =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
          const allowed = allowlist.some((entry) => clientIp === entry || clientIp.startsWith(entry));
          if (!allowed) {
            logger.warn("IP not in org allowlist", { ip: clientIp, orgId: token.orgId });
            return NextResponse.json(
              { error: "Access denied: your IP is not permitted for this organization." },
              { status: 403 }
            );
          }
        }
      }
    } catch {
    }
  }

  if (
    isAuthenticated &&
    (startsWithAny(pathname, PROTECTED_ROUTES) || isBlogAdminPath(pathname))
  ) {
    const isPlatformAdmin = (token?.isPlatformAdmin as boolean | undefined) === true;
    const isOrgOwner = (token?.isOrgOwner as boolean | undefined) === true;
    const userPermissions = Array.isArray(token?.permissions)
      ? (token!.permissions as string[])
      : [];
    if (!canAccessRoute(pathname, isPlatformAdmin, isOrgOwner, userPermissions)) {
      const url = req.nextUrl.clone();
      url.pathname = isBlogAdminPath(pathname) ? "/blogs" : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
