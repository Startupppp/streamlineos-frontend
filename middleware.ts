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
  // HR Management — CEO and HR only
  "/hr": ["CEO", "HR"],
  "/hr/onboarding": ["CEO", "HR"],
  "/hr/payroll": ["CEO", "HR"],
  "/hr/devices": ["CEO", "HR"],
  "/hr/documents": ["CEO", "HR"],
  "/hr/work-logs": ["CEO", "HR"],
  "/hr/org-chart": ["CEO", "HR"],

  // Self-service HR — all roles (explicit override for sub-routes of /hr)
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],

  // CRM — CEO, HR, SALES (sales sees filtered data)
  "/crm/leads": ["CEO", "HR", "SALES"],
  "/crm/deals": ["CEO", "HR"],
  "/crm/targets": ["CEO", "HR"],
  "/crm/reports": ["CEO", "HR"],
  "/crm/clients": ["CEO", "HR"],

  // Projects & Timesheets — all roles
  "/projects": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/timesheets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],

  // Support/Tickets — all roles
  "/support": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],

  // Chat — all roles
  "/chat": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],

  // Dashboards — CEO, HR only
  "/sales": ["CEO", "HR"],
  "/customer-executive": ["CEO", "HR"],

  // Settings — CEO and HR
  "/settings": ["CEO", "HR"],

  // Billing — CEO only
  "/billing": ["CEO"],

  // CEO-only
  "/ceo": ["CEO"],
};

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
