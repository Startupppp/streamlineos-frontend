import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/hr",
  "/settings",
  "/onboarding",
  "/ceo",
];
const authRoutes = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const setupRoute = "/setup-organization";
const invitationRoute = "/invitation";

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = !!token;

  // Force password change redirect
  if (isAuthenticated && token?.forceChangePassword) {
    if (
      !pathname.startsWith("/auth/reset-password") &&
      !pathname.startsWith("/api/auth/signout") &&
      !pathname.startsWith("/api/storage/upload")
    ) {
      return NextResponse.redirect(new URL("/auth/reset-password", req.url));
    }
  }

  // Redirect away from reset-password if no password change required
  if (
    pathname.startsWith("/auth/reset-password") &&
    isAuthenticated &&
    !token?.forceChangePassword
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Force signout for inactive users
  if (isAuthenticated && token?.isActive === false) {
    if (!pathname.startsWith("/api/auth/signout")) {
      return NextResponse.redirect(new URL("/api/auth/signout", req.url));
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isSetupRoute = pathname.startsWith(setupRoute);
  const isInvitationRoute = pathname.startsWith(invitationRoute);
  const isForcedPasswordResetRoute = pathname.startsWith(
    "/auth/reset-password"
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth routes
  // Exceptions: setup-organization, invitation routes, and forced password reset
  if (
    isAuthRoute &&
    isAuthenticated &&
    !isSetupRoute &&
    !isInvitationRoute &&
    !isForcedPasswordResetRoute
  ) {
    const callbackUrl = searchParams.get("callbackUrl");
    const redirectUrl =
      callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     * - api/auth (NextAuth API routes - important!)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
