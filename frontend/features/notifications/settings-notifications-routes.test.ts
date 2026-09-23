import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { isUniversalRoute } from "@/lib/rbac/route-access/universal-routes";
import { HOME_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-home-nav";
import { NAV_GROUPS, flattenNavRoutes } from "@/components/layout/sidebar/sidebar-nav-items";
import { buildMenuEntries } from "@/components/layout/header/user-avatar-menu-entries";
import { CARD_GROUPS } from "@/features/hr/settings-hub/hub-grid";

describe("Settings → Notifications route access declarations", () => {
  describe("/settings/notifications/my-preferences is universal", () => {
    it("resolves as universal", () => {
      expect(resolveRouteAccess("/settings/notifications/my-preferences").kind).toBe("universal");
    });

    it("isUniversalRoute returns true", () => {
      expect(isUniversalRoute("/settings/notifications/my-preferences")).toBe(true);
    });

    it("BITE: a sibling administration route is NOT universal, so the above is a real grant and not a blanket one", () => {
      expect(isUniversalRoute("/settings/notifications/templates")).toBe(false);
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

  describe("retired /notifications routes are undeclared and served by next.config.ts redirects", () => {
    it("/notifications is no longer a declared app route", () => {
      expect(resolveRouteAccess("/notifications").kind).toBe("unknown");
    });

    it("/notifications/providers is no longer permission-gated — the page moved to /settings/notifications/providers", () => {
      expect(isUniversalRoute("/notifications/providers")).toBe(false);
    });

    it("BITE: the replacement /settings/notifications/providers IS declared, so the retirement did not drop the surface", () => {
      expect(resolveRouteAccess("/settings/notifications/providers").kind).toBe("permission");
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

describe("Avatar menu — notification preferences link points at the canonical URL", () => {
  const entries = buildMenuEntries({
    canManageSettings: false,
    canManagePersonalTokens: false,
    canViewAiCredits: false,
    canSeeOrgPeople: false,
    canManageRbac: false,
    showAccessGroup: false,
  });

  function allMenuHrefs(menuEntries: ReturnType<typeof buildMenuEntries>): string[] {
    return menuEntries.flatMap((e) => (e.kind === "links" ? e.links.map((l) => l.href) : []));
  }

  it("contains /settings/notifications/my-preferences", () => {
    expect(allMenuHrefs(entries)).toContain("/settings/notifications/my-preferences");
  });

  it("BITE: does NOT contain the retired /notifications/preferences href", () => {
    expect(allMenuHrefs(entries)).not.toContain("/notifications/preferences");
  });

  it("BITE: the entry list is non-empty so the absence test is real", () => {
    expect(allMenuHrefs(entries).length).toBeGreaterThan(0);
  });
});

describe("HR settings hub — Notification Providers card points at the canonical URL", () => {
  const allHubHrefs = CARD_GROUPS.flatMap((g) => g.cards.map((c) => c.href));

  it("contains /settings/notifications/providers", () => {
    expect(allHubHrefs).toContain("/settings/notifications/providers");
  });

  it("BITE: does NOT contain the retired /notifications/providers href", () => {
    expect(allHubHrefs).not.toContain("/notifications/providers");
  });

  it("BITE: the hub card list is non-empty so the absence test is real", () => {
    expect(allHubHrefs.length).toBeGreaterThan(0);
  });
});

describe("No UI navigation target in features/ or components/ points at a retired /notifications/* page route", () => {
  const RETIRED_NAV_HREFS = [
    "/notifications/preferences",
    "/notifications/providers",
    "/notifications/templates",
    "/notifications/broadcasts",
    "/notifications/events",
    "/notifications/policy",
  ];

  const FRONTEND_ROOT = join(__dirname, "..", "..");

  function collectSourceFiles(dir: string, files: string[] = []): string[] {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return files;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        collectSourceFiles(fullPath, files);
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  function isApiCallLine(line: string): boolean {
    return (
      line.includes("apiClient") ||
      line.includes("api-client") ||
      line.includes("fetch(") ||
      line.includes("axios.") ||
      line.includes("// ")
    );
  }

  function findRetiredNavHrefs(content: string, retired: string[]): string[] {
    const found: string[] = [];
    for (const line of content.split("\n")) {
      if (isApiCallLine(line)) continue;
      for (const href of retired) {
        if (
          line.includes(`href="${href}"`) ||
          line.includes(`href='${href}'`) ||
          line.includes(`href: "${href}"`) ||
          line.includes(`href: '${href}'`) ||
          (line.includes(`"${href}"`) && !line.includes("apiClient") && !line.includes("RETIRED"))
        ) {
          found.push(href);
        }
      }
    }
    return found;
  }

  const dirsToScan = [
    join(FRONTEND_ROOT, "features"),
    join(FRONTEND_ROOT, "components"),
  ];

  const violations: Array<{ file: string; hrefs: string[] }> = [];

  for (const dir of dirsToScan) {
    for (const file of collectSourceFiles(dir)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const content = readFileSync(file, "utf8");
      const found = findRetiredNavHrefs(content, RETIRED_NAV_HREFS);
      if (found.length > 0) {
        violations.push({ file: file.replace(FRONTEND_ROOT, ""), hrefs: found });
      }
    }
  }

  it("no source file under features/ or components/ navigates to a retired /notifications/* page route", () => {
    expect(violations).toEqual([]);
  });

  it("BITE: the scan covered at least 50 files so the empty result is not vacuous", () => {
    let count = 0;
    for (const dir of dirsToScan) count += collectSourceFiles(dir).length;
    expect(count).toBeGreaterThan(50);
  });
});
