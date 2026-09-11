import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { resolveNavRouteAccess } from "./sidebar-nav-items";
import { collectAppRoutes } from "@/lib/rbac/route-access/app-routes";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";

const HR_ROUTE_PATHS = collectAppRoutes("(authenticated)")
  .map((route) => route.path)
  .filter((path) => path === "/hr" || path.startsWith("/hr/"));

describe("permission-aware product navigation", () => {
  it("resolves HR server gates from the same longest-match navigation graph", () => {
    expect(resolveNavRouteAccess("/hr/employees/person-1")).toMatchObject({
      matched: true,
      module: "hrms",
      requiredPermission: "hr:employees:view",
    });
    expect(resolveNavRouteAccess("/hr/settings/company")).toMatchObject({
      matched: true,
      module: "hrms",
      requiredPermission: "settings:organization:manage",
    });
    expect(resolveNavRouteAccess("/hr/announcements")).toEqual({
      matched: true,
      module: undefined,
      requiredPermission: undefined,
    });
    expect(resolveNavRouteAccess("/hr/not-configured")).toEqual({
      matched: false,
    });
  });

  it("has a permission-owned navigation route for every HR page", () => {
    const hrRoot = resolve(process.cwd(), "app", "(authenticated)", "hr");
    const pages: string[] = [];

    function collectPages(directory: string): void {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) collectPages(entryPath);
        else if (entry.name === "page.tsx") pages.push(entryPath);
      }
    }

    collectPages(hrRoot);
    const unmatched = pages.flatMap((pagePath) => {
      const routeSegments = relative(hrRoot, pagePath)
        .split(sep)
        .slice(0, -1)
        .map((segment) =>
          segment.startsWith("[") && segment.endsWith("]")
            ? "sample"
            : segment,
        );
      const pathname = ["", "hr", ...routeSegments].join("/");
      return resolveNavRouteAccess(pathname).matched ? [] : [pathname];
    });

    expect(unmatched).toEqual([]);
  });

  it("keeps the HR layout fail-closed on the shared route resolver", () => {
    const layoutPath = resolve(
      process.cwd(),
      "app",
      "(authenticated)",
      "hr",
      "layout.tsx",
    );
    const source = readFileSync(layoutPath, "utf8");

    expect(source).toContain("enforceRouteAccess");
    expect(source).not.toContain("getServerAuth");
    expect(source).not.toContain("session?.user?.role");
  });

  it("resolves every HR route through the shared registry rather than a bespoke gate", () => {
    const undecided = HR_ROUTE_PATHS.filter(
      (pathname) => resolveRouteAccess(pathname).kind === "unknown",
    );
    expect(undecided).toEqual([]);
  });

  it("denies an HR path the registry does not know", () => {
    expect(resolveRouteAccess("/hr/not-a-real-hr-surface").kind).toBe("unknown");
  });

  it("gates the employee onboarding route by module and self-service permission", () => {
    const selfServiceRoute = readFileSync(
      resolve(
        process.cwd(),
        "app",
        "(authenticated)",
        "me",
        "onboarding",
        "page.tsx",
      ),
      "utf8",
    );
    const legacyRoute = readFileSync(
      resolve(
        process.cwd(),
        "app",
        "(authenticated)",
        "hr",
        "onboarding",
        "my-tasks",
        "page.tsx",
      ),
      "utf8",
    );

    expect(selfServiceRoute).toContain(
      'requireModulePermission("hr", "self:onboarding-tasks")',
    );
    expect(legacyRoute).toContain('redirect("/me/onboarding")');
  });
});
