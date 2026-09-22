import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { NAV_GROUPS, flattenNavRoutes } from "./sidebar-nav-items";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import type { NavRoute } from "./sidebar-nav-types";

function flattenGroupRoutes(groups: typeof HOME_NAV_GROUPS): NavRoute[] {
  return groups.flatMap((group) => flattenNavRoutes(group.routes));
}

function findGroup(groups: typeof HOME_NAV_GROUPS, label: string) {
  return groups.find((g) => g.label === label);
}

describe("Home information architecture — Notifications restructure", () => {
  describe("Overview group", () => {
    const overview = findGroup(HOME_NAV_GROUPS, "Overview");
    const dashboardEntry = overview?.routes.find((r) => r.href === "/dashboard");

    it("Overview group exists and the /dashboard entry is labelled Home", () => {
      expect(dashboardEntry?.label).toBe("Home");
    });

    it("BITE: the /dashboard entry is NOT still labelled Dashboard", () => {
      expect(dashboardEntry?.label).not.toBe("Dashboard");
    });
  });

  describe("Communication group", () => {
    const communication = findGroup(HOME_NAV_GROUPS, "Communication");
    const hrefs = communication?.routes.map((r) => r.href) ?? [];

    it("Inbox, Mail, Calendar and Chat are all present", () => {
      expect(hrefs).toContain("/inbox");
      expect(hrefs).toContain("/mail");
      expect(hrefs).toContain("/calendar");
      expect(hrefs).toContain("/chat");
    });

    it("Notifications is NOT a peer Communication destination", () => {
      expect(hrefs).not.toContain("/notifications");
    });

    it("BITE: the four communication entries are actually present, so the negative above is not vacuous", () => {
      expect(hrefs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("For Me group — Notification preferences removed", () => {
    const forMe = findGroup(HOME_NAV_GROUPS, "For Me");
    const allForMeHrefs = forMe?.routes.map((r) => r.href) ?? [];

    it("For Me group no longer contains a /notifications/preferences entry", () => {
      expect(allForMeHrefs).not.toContain("/notifications/preferences");
    });

    it("For Me group no longer contains any /settings/notifications entry", () => {
      const settingsNotifEntries = allForMeHrefs.filter((h) =>
        h.startsWith("/settings/notifications"),
      );
      expect(settingsNotifEntries).toHaveLength(0);
    });

    it("BITE: For Me still has entries so the absence assertions above are not vacuous", () => {
      expect(allForMeHrefs.length).toBeGreaterThan(5);
    });
  });

  describe("No /notifications entry anywhere in HOME_NAV_GROUPS", () => {
    const allHomeRoutes = flattenGroupRoutes(HOME_NAV_GROUPS);

    it("no home nav route points at /notifications directly", () => {
      const notificationsRoot = allHomeRoutes.filter(
        (r) => r.href === "/notifications",
      );
      expect(notificationsRoot).toHaveLength(0);
    });

    it("BITE: there are still plenty of home routes, so the negative is not vacuous", () => {
      expect(allHomeRoutes.length).toBeGreaterThan(10);
    });
  });

  describe("Administration nav — Notifications group points at /settings/notifications/*", () => {
    const adminGroups = NAV_GROUPS.filter((g) => g.product === "administration");
    const notificationsGroup = adminGroups.find((g) => g.label === "Notifications");
    const adminRoutes = notificationsGroup?.routes ?? [];

    const EXPECTED_ADMIN_ENTRIES: Array<{
      href: string;
      permission: string;
      label: string;
    }> = [
      {
        href: "/settings/notifications/templates",
        permission: "notifications:templates:view",
        label: "Templates",
      },
      {
        href: "/settings/notifications/broadcasts",
        permission: "notifications:broadcasts:view",
        label: "Broadcasts",
      },
      {
        href: "/settings/notifications/providers",
        permission: "notifications:providers:view",
        label: "Providers",
      },
      {
        href: "/settings/notifications/events",
        permission: "notifications:events:view",
        label: "Events",
      },
      {
        href: "/settings/notifications/policy",
        permission: "notifications:policy:view",
        label: "Policy",
      },
    ];

    it("Notifications group exists in the Administration nav", () => {
      expect(notificationsGroup).toBeDefined();
    });

    it("all five notification admin routes point at /settings/notifications/* in the Administration nav", () => {
      const adminHrefs = adminRoutes.map((r) => r.href);
      for (const entry of EXPECTED_ADMIN_ENTRIES) {
        expect(adminHrefs).toContain(entry.href);
      }
    });

    it("each notification admin route carries its exact permission key", () => {
      for (const entry of EXPECTED_ADMIN_ENTRIES) {
        const route = adminRoutes.find((r) => r.href === entry.href);
        expect({ href: entry.href, permission: route?.requiredPermission }).toEqual({
          href: entry.href,
          permission: entry.permission,
        });
      }
    });

    it("BITE: no notification admin route is ungated", () => {
      for (const route of adminRoutes) {
        expect({ href: route.href, hasPermission: !!route.requiredPermission }).toEqual({
          href: route.href,
          hasPermission: true,
        });
      }
    });

    it("BITE: the five old /notifications/* admin hrefs are absent from the admin Notifications nav", () => {
      const adminHrefs = new Set(adminRoutes.map((r) => r.href));
      const oldHrefs = [
        "/notifications/templates",
        "/notifications/broadcasts",
        "/notifications/providers",
        "/notifications/events",
        "/notifications/policy",
      ];
      for (const oldHref of oldHrefs) {
        expect(adminHrefs.has(oldHref)).toBe(false);
      }
    });

    it("BITE: the five admin hrefs are absent from HOME_NAV_GROUPS (personal and admin surfaces are distinct)", () => {
      const allHomeHrefs = new Set(flattenGroupRoutes(HOME_NAV_GROUPS).map((r) => r.href));
      for (const entry of EXPECTED_ADMIN_ENTRIES) {
        expect(allHomeHrefs.has(entry.href)).toBe(false);
      }
    });
  });

  describe("Administration nav — Account group personal Notifications entry", () => {
    const adminGroups = NAV_GROUPS.filter((g) => g.product === "administration");
    const accountGroup = adminGroups.find((g) => g.label === "Account");
    const notifEntry = accountGroup?.routes.find(
      (r) => r.href === "/settings/notifications/my-preferences",
    );

    it("Account group contains a Notifications entry pointing at /settings/notifications/my-preferences", () => {
      expect(notifEntry).toBeDefined();
      expect(notifEntry?.label).toBe("Notifications");
    });

    it("the personal Notifications entry carries no requiredPermission — the route is universal", () => {
      expect(notifEntry?.requiredPermission).toBeUndefined();
    });

    it("BITE: the entry is really there so the no-permission assertion is not vacuous", () => {
      expect(notifEntry?.href).toBe("/settings/notifications/my-preferences");
    });
  });

  describe("resolveRouteAccess for /notifications compatibility route", () => {
    it("resolves to universal — the /notifications path is still a universal route", () => {
      expect(resolveRouteAccess("/notifications").kind).toBe("universal");
    });

    it("BITE: it does NOT resolve to permission, confirming it is not misclassified as admin", () => {
      expect(resolveRouteAccess("/notifications").kind).not.toBe("permission");
    });
  });
});
