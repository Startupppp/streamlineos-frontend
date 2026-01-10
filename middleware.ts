import { auth } from "./lib/auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/dashboard", "/projects", "/hr", "/settings"];
const authRoutes = ["/signin", "/signup"];

export default async function middleware(req: any) {
  const { pathname } = req.nextUrl;
  
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  if (isAuthenticated && token?.forceChangePassword) {
      if (!pathname.startsWith("/auth/reset-password") && !pathname.startsWith("/api/auth/signout")) {
           return NextResponse.redirect(new URL("/auth/reset-password", req.url));
      }
  }
  
  if (pathname.startsWith("/auth/reset-password") && isAuthenticated && !token?.forceChangePassword) {
       return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAuthenticated && token?.isActive === false) {
     if (!pathname.startsWith("/api/auth/signout")) {
        return NextResponse.redirect(new URL("/api/auth/signout", req.url));
     }
  }


  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
