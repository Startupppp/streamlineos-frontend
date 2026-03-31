import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
} from "@/lib/rate-limit";

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
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/auth/reset-password",
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
  "/hr/work-logs": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/performance": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/org-chart": ["CEO", "HR"],
  "/hr/incentives": ["CEO", "HR"],

  // Self-service HR — all roles (explicit override for sub-routes of /hr)
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],

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
    const result = checkRateLimit(tier, ip);

    if (!result.allowed) {
      console.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "Rate limit exceeded",
        meta: { ip, path: pathname, tier, retryAfterSecs: result.retryAfterSecs },
      }));
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
      // Log blocked bot attempt for monitoring
      console.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "Blocked suspicious bot",
        meta: {
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
          path: pathname,
          userAgent: ua?.slice(0, 200),
        },
      }));
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  // ── Enforce HTTPS in production ─────────────────────────────────────
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
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
