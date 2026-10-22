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

  describe("Administration nav — Notifications group removed from sidebar", () => {
    const adminGroups = NAV_GROUPS.filter((g) => g.module === "administration");
    const notificationsGroup = adminGroups.find((g) => g.label === "Notifications");
    const allAdminHrefs = flattenGroupRoutes(adminGroups).map((r) => r.href);

    const RETIRED_ADMIN_HREFS = [
      "/settings/notifications/templates",
      "/settings/notifications/broadcasts",
      "/settings/notifications/providers",
      "/settings/notifications/events",
      "/settings/notifications/policy",
      "/settings/notifications/email-templates",
    ];

    it("Notifications group is absent from the Administration nav", () => {
      expect(notificationsGroup).toBeUndefined();
    });

    it("BITE: notification admin routes are absent from the Administration sidebar", () => {
      for (const href of RETIRED_ADMIN_HREFS) {
        expect(allAdminHrefs).not.toContain(href);
      }
    });

    it("BITE: the five admin hrefs remain absent from HOME_NAV_GROUPS", () => {
      const allHomeHrefs = new Set(flattenGroupRoutes(HOME_NAV_GROUPS).map((r) => r.href));
      for (const href of RETIRED_ADMIN_HREFS) {
        expect(allHomeHrefs.has(href)).toBe(false);
      }
    });
  });

  describe("Administration nav — Account group personal Notifications entry", () => {
    const adminGroups = NAV_GROUPS.filter((g) => g.module === "administration");
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

  describe("retired /notifications routes are no longer declared app routes", () => {
    it("the /notifications root is undeclared — next.config.ts redirects it to /inbox?view=notifications", () => {
      expect(resolveRouteAccess("/notifications").kind).toBe("unknown");
    });

    it("BITE: /inbox is declared universal, so an undeclared /notifications is a deliberate retirement and not a broken registry", () => {
      expect(resolveRouteAccess("/inbox").kind).toBe("universal");
    });
  });
});
