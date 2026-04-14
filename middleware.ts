import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

/** Must match Auth.js session cookie: `__Secure-` prefix only when the response uses a secure cookie (HTTPS). */
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
  "/hr",
  "/settings",
  "/onboarding",
  "/ceo",
  "/sales",
  "/customer-executive",
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/chat",
  "/digital-marketing",
  "/reports",
  "/notifications",
  "/marketing",
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/auth/reset-password",
  "/setup-password",
  "/verify-email",
];

const ALLOW_AUTHENTICATED = [
  "/invitation",
  "/auth/reset-password",
];

// Route → allowed roles. CEO always has access (hardcoded bypass).
// Routes not listed here are accessible to all authenticated users.
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  // HR Management — CEO, HR, and branch roles (branch-scoped access)
  "/hr": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/onboarding": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/payroll": ["CEO", "HR", "BRANCH_HR"],
  "/hr/devices": ["CEO", "HR", "BRANCH_HR"],
  "/hr/documents": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/work-logs": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/performance": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/org-chart": ["CEO", "HR"],
  "/hr/incentives": ["CEO", "HR"],

  // Self-service HR — all roles (explicit override for sub-routes of /hr)
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/helpdesk": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],

  // CRM — CEO, HR, SALES, BRANCH_MANAGER (sales/branch see filtered data)
  "/crm/leads": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/deals": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/targets": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/reports": ["CEO", "HR"],
  "/crm/clients": ["CEO", "HR", "CUSTOMER_SUPPORT", "SALES"],

  // Digital Marketing
  "/digital-marketing": ["CEO", "HR", "DIGITAL_MARKETING"],

  // Projects & Timesheets — all roles
  "/projects": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/timesheets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],

  // Support/Tickets — all roles
  "/support": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],

  // Chat — all roles
  "/chat": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],

  "/sales": ["CEO", "HR", "SALES"],
  "/customer-executive": ["CEO", "HR", "CUSTOMER_SUPPORT"],
  "/marketing": ["CEO", "HR", "DIGITAL_MARKETING"],

  // Settings — CEO and HR
  "/settings": ["CEO", "HR"],
  "/settings/roles": ["CEO", "HR"],
  "/settings/branches": ["CEO", "HR"],

  // Billing & Invoices — CEO, HR
  "/billing": ["CEO", "HR"],
  "/billing/invoices": ["CEO", "HR"],

  // Support Inbox — all roles
  "/support/inbox": ["CEO", "HR", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "SALES"],

  // Notifications — all roles
  "/notifications": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],

  // CEO and HR
  "/ceo": ["CEO", "HR"],
};

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

/**
 * Check if user's role can access this pathname.
 * Matches the most specific route first (longest prefix).
 */
function canAccessRoute(pathname: string, role: string): boolean {
  // CEO bypasses everything
  if (role === "CEO") return true;

  // Find the most specific matching route
  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length); // longest first

  if (matchingRoutes.length === 0) {
    // No specific rule → allow (e.g., /dashboard itself)
    return true;
  }

  const bestMatch = matchingRoutes[0];
  return ROUTE_ROLE_MAP[bestMatch].includes(role);
}

/** Endpoints where automated bot User-Agents are blocked */
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

  // ── Rate limiting (tiered, per-bucket) ──────────────────────────────
  const tier = resolveTier(pathname);
  if (tier) {
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

  // ── Bot / scraper detection on sensitive endpoints ──────────────────
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

  // ── Enforce HTTPS in production (skip loopback: no TLS on `next start`) ─
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

  // Org guard — redirect to onboarding if user has no organization
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

  // IP allowlist — check if org has IP restrictions and enforce them
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
          const allowed = allowlist.some((entry) => {
            // Exact match or simple prefix match (e.g. "192.168.1." for /24 CIDR shorthand)
            return clientIp === entry || clientIp.startsWith(entry);
          });
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
      // Redis unavailable — fail open (don't block access on cache miss)
    }
  }

  // RBAC route protection — block unauthorized role access
  if (isAuthenticated && token?.role && startsWithAny(pathname, PROTECTED_ROUTES)) {
    const userRole = token.role as string;
    if (!canAccessRoute(pathname, userRole)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
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
