import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { PLATFORM_OWNER_ROLE, OWNER_HOME } from "@/lib/platform/role";
import { ROLES } from "@/lib/constants/roles";

function buildCsp(nonce: string, apiUrl?: string): string {
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
    "https://www.googletagmanager.com",
    "https://www.clarity.ms",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.clarity.ms https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.r2.cloudflarestorage.com https://*.r2.dev https://lh3.googleusercontent.com https://streamlineos.app https://images.unsplash.com https://www.googletagmanager.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
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
  "/knowledge-base",
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
  "/hr/my-payslips": ["self:payslips"],
  "/hr/leaves": ["self:leaves"],
  "/hr/expenses": ["self:expenses"],
  "/hr/attendance": ["self:attendance"],
  "/crm/leads": ["crm:leads:view"],
  "/crm/contacts": ["crm:leads:view"],
  "/crm/companies": ["crm:leads:view"],
  "/crm/deals": ["crm:leads:view"],
  "/crm/activities": ["crm:leads:view"],
  "/crm/calendar": ["crm:leads:view"],
  "/crm/tasks": ["crm:leads:view"],
  "/crm/reports": ["crm:reports:view"],
  "/crm/analytics": ["crm:reports:view"],
  "/projects": ["projects:view"],
  "/projects/roadmap": ["projects:roadmap:view"],
  "/goals": ["projects:goals:view"],
  "/timesheets": ["projects:timesheets:view"],
  "/support": ["projects:tickets:view"],
  "/support/inbox": ["projects:tickets:view"],
  "/support/kb": ["support:kb:view"],
  "/knowledge-base": ["kb:articles:view"],
  "/support/macros": ["support:macros:view"],
  "/support/routing": ["support:macros:view"],
  "/settings/automations": ["settings:automations:view"],
  "/chat": ["self:attendance"],
  "/sales": ["dashboard:sales:view"],
  "/customer-executive": ["dashboard:customer-executive:view"],
  "/settings": ["settings:view"],
  "/settings/roles": ["settings:rbac:manage"],
  "/organization/branches": ["settings:manage"],
  "/billing": ["settings:manage"],
  "/billing/invoices": ["settings:manage"],
  "/notifications": ["self:attendance"],
  "/ceo": ["reports:view"],
  "/reports": ["reports:view"],
  "/ai": ["settings:manage"],
  "/blogs/admin": ["settings:manage"],
};

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

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

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));

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
    token?.isActive === false &&
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
    !pathname.startsWith("/api/auth/signout")
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

  const orgSetupDone = req.cookies.get("org-setup-done")?.value;
  if (
    isAuthenticated &&
    token?.isOrgOwner &&
    !token?.orgOnboardingCompletedAt &&
    !orgSetupDone &&
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

  const onboardingDone = req.cookies.get("onboarding-done")?.value;
  if (
    isAuthenticated &&
    !token?.userOnboardingCompletedAt &&
    !onboardingDone &&
    token?.isOrgOwner !== true &&
    token?.role !== ROLES.OWNER &&
    token?.isPlatformAdmin !== true &&
    token?.role !== PLATFORM_OWNER_ROLE &&
    token?.orgId &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/onboarding")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
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
    !pathname.startsWith("/api/auth/")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/settings";
    url.search = "?tab=security&mfa=required";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.orgId == null &&
    !orgSetupDone &&
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

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NEXT_PUBLIC_API_URL));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
