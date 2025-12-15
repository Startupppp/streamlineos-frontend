import { auth } from "./lib/auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/dashboard", "/projects", "/hr", "/settings"];
const authRoutes = ["/signin", "/signup"];

export default async function middleware(req: any) {
  const { pathname } = req.nextUrl;
  
  // 1. Get token to check role and flags
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // 2. FORCE PASSWORD CHANGE CHECK
  // If user is authenticated AND forceChangePassword is true
  // AND they are NOT already on the reset password page or signout
  if (isAuthenticated && token?.forceChangePassword) {
      if (!pathname.startsWith("/auth/reset-password") && !pathname.startsWith("/api/auth/signout")) {
           return NextResponse.redirect(new URL("/auth/reset-password", req.url));
      }
  }
  
  // If they ARE on reset password page but don't need to be there (flag false or not auth), maybe redirect back?
  // Optional but good UX.
  if (pathname.startsWith("/auth/reset-password") && isAuthenticated && !token?.forceChangePassword) {
       return NextResponse.redirect(new URL("/dashboard", req.url));
  }


  // 3. Normal Route Protection
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
