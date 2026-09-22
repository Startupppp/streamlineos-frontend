import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { isUniversalRoute } from "@/lib/rbac/route-access/universal-routes";
import { HOME_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-home-nav";
import { NAV_GROUPS, flattenNavRoutes } from "@/components/layout/sidebar/sidebar-nav-items";

describe("Settings → Notifications route access declarations", () => {
  describe("/settings/notifications/my-preferences is universal", () => {
    it("resolves as universal", () => {
      expect(resolveRouteAccess("/settings/notifications/my-preferences").kind).toBe("universal");
    });

    it("isUniversalRoute returns true", () => {
      expect(isUniversalRoute("/settings/notifications/my-preferences")).toBe(true);
    });

    it("BITE: the root /settings/notifications is also universal so the above is not a special case", () => {
      expect(resolveRouteAccess("/settings/notifications").kind).toBe("universal");
    });
  });

  describe("/settings/notifications/templates resolves to notifications:templates:view", () => {
    it("resolves as permission", () => {
      const decision = resolveRouteAccess("/settings/notifications/templates");
      expect(decision.kind).toBe("permission");
    });

    it("carries the exact notifications:templates:view permission key", () => {
      const decision = resolveRouteAccess("/settings/notifications/templates");
      if (decision.kind !== "permission") return;
      const keys = Array.isArray(decision.permission) ? decision.permission : [decision.permission];
      expect(keys).toContain("notifications:templates:view");
    });

    it("BITE: it is NOT universal, so a member without the permission is denied", () => {
      expect(isUniversalRoute("/settings/notifications/templates")).toBe(false);
    });
  });

  describe("All five admin routes resolve to their permission", () => {
    const ADMIN_ROUTES: Array<{ path: string; permission: string }> = [
      { path: "/settings/notifications/templates", permission: "notifications:templates:view" },
      { path: "/settings/notifications/broadcasts", permission: "notifications:broadcasts:view" },
      { path: "/settings/notifications/providers", permission: "notifications:providers:view" },
      { path: "/settings/notifications/events", permission: "notifications:events:view" },
      { path: "/settings/notifications/policy", permission: "notifications:policy:view" },
    ];

    it.each(ADMIN_ROUTES)("$path resolves as permission:$permission", ({ path, permission }) => {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      if (decision.kind !== "permission") return;
      const keys = Array.isArray(decision.permission) ? decision.permission : [decision.permission];
      expect(keys).toContain(permission);
    });
  });

  describe("/notifications root is still universal — compat redirect to /inbox?view=notifications", () => {
    it("/notifications resolves as universal", () => {
      expect(resolveRouteAccess("/notifications").kind).toBe("universal");
    });

    it("BITE: /notifications/providers is no longer permission-gated — page deleted, handled by next.config.ts redirect", () => {
      expect(isUniversalRoute("/notifications/providers")).toBe(false);
    });
  });

  describe("HOME_NAV_GROUPS no longer contains /notifications/preferences in For Me", () => {
    const allHomeRoutes = HOME_NAV_GROUPS.flatMap((g) => flattenNavRoutes(g.routes));

    it("no HOME_NAV_GROUPS entry points at /notifications/preferences", () => {
      const match = allHomeRoutes.find((r) => r.href === "/notifications/preferences");
      expect(match).toBeUndefined();
    });

    it("BITE: home routes still exist so the absence test is not vacuous", () => {
      expect(allHomeRoutes.length).toBeGreaterThan(10);
    });
  });

  describe("Administration nav Notifications group points at /settings/notifications/*", () => {
    const adminGroups = NAV_GROUPS.filter((g) => g.product === "administration");
    const notificationsGroup = adminGroups.find((g) => g.label === "Notifications");
    const adminRoutes = notificationsGroup?.routes ?? [];

    const EXPECTED_HREFS = [
      "/settings/notifications/templates",
      "/settings/notifications/broadcasts",
      "/settings/notifications/providers",
      "/settings/notifications/events",
      "/settings/notifications/policy",
    ];

    it("all five admin notification routes point at /settings/notifications/*", () => {
      const hrefs = adminRoutes.map((r) => r.href);
      for (const href of EXPECTED_HREFS) {
        expect(hrefs).toContain(href);
      }
    });

    it("BITE: the old /notifications/* hrefs are absent from the admin Notifications group", () => {
      const hrefs = new Set(adminRoutes.map((r) => r.href));
      expect(hrefs.has("/notifications/templates")).toBe(false);
      expect(hrefs.has("/notifications/providers")).toBe(false);
      expect(hrefs.has("/notifications/events")).toBe(false);
      expect(hrefs.has("/notifications/policy")).toBe(false);
      expect(hrefs.has("/notifications/broadcasts")).toBe(false);
    });
  });
});
