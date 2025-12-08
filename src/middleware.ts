import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/projects(.*)", "/hr(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
      await auth.protect();
      
      const { orgId } = await auth();
      if (!orgId && req.nextUrl.pathname !== "/org-selection") {
          const orgSelectionUrl = new URL("/org-selection", req.url);
          return Response.redirect(orgSelectionUrl);
      }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
