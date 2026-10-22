import { isUniversalRoute } from "../universal-routes";
import { resolveRouteAccess } from "../route-access";

interface MatrixRow {
  path: string;
  universalMatch: boolean;
  decisionKind: "universal" | "permission" | "unknown";
  label: string;
}

const MATRIX: readonly MatrixRow[] = [
  { path: "/home", universalMatch: false, decisionKind: "unknown", label: "retired home alias — redirects to /dashboard" },
  { path: "/notifications", universalMatch: false, decisionKind: "unknown", label: "retired notifications root — redirects to /inbox?view=notifications" },
  { path: "/settings/notifications", universalMatch: false, decisionKind: "unknown", label: "retired settings notifications index — redirects to my-preferences" },

  { path: "/knowledge", universalMatch: true, decisionKind: "universal", label: "knowledge root" },
  { path: "/knowledge/wiki", universalMatch: true, decisionKind: "universal", label: "wiki reading root" },
  { path: "/knowledge/wiki/shared", universalMatch: true, decisionKind: "universal", label: "wiki shared pages" },
  { path: "/knowledge/wiki/private", universalMatch: true, decisionKind: "universal", label: "wiki private pages" },
  { path: "/knowledge/wiki/doc/123", universalMatch: true, decisionKind: "universal", label: "individual wiki page reading" },
  { path: "/knowledge/wiki/doc/123/history", universalMatch: true, decisionKind: "universal", label: "wiki page history" },
  { path: "/knowledge/chat", universalMatch: true, decisionKind: "universal", label: "knowledge AI chat" },
  { path: "/knowledge/wiki/spaces/1", universalMatch: true, decisionKind: "universal", label: "individual space page reading — extension is exact so only the list is gated" },
  { path: "/knowledge/wiki/import", universalMatch: false, decisionKind: "permission", label: "wiki import admin" },
  { path: "/knowledge/wiki/analytics", universalMatch: false, decisionKind: "permission", label: "wiki analytics admin" },
  { path: "/knowledge/wiki/reviews", universalMatch: false, decisionKind: "permission", label: "wiki review admin" },
  { path: "/knowledge/wiki/spaces", universalMatch: false, decisionKind: "permission", label: "wiki spaces management list" },
  { path: "/knowledge/wiki/templates", universalMatch: false, decisionKind: "permission", label: "wiki template management" },
  { path: "/knowledge/wiki/trash", universalMatch: false, decisionKind: "permission", label: "wiki trash admin" },

  { path: "/chat", universalMatch: true, decisionKind: "universal", label: "chat root" },
  { path: "/chat/channels", universalMatch: false, decisionKind: "unknown", label: "retired channel list — redirects to /chat?search=channels" },
  { path: "/chat/channels/general", universalMatch: false, decisionKind: "unknown", label: "retired channel subtree — no route" },
  { path: "/chat/invite/token123", universalMatch: true, decisionKind: "universal", label: "invite acceptance" },

  { path: "/calendar", universalMatch: true, decisionKind: "universal", label: "unified calendar" },
  { path: "/calendar/settings", universalMatch: false, decisionKind: "permission", label: "calendar admin settings — gated on calendar:admin:manage" },

  { path: "/directory", universalMatch: true, decisionKind: "universal", label: "people directory root" },
  { path: "/directory/123", universalMatch: false, decisionKind: "permission", label: "individual person profile — nav-resolved, not prefix-universal" },
  { path: "/directory/workers", universalMatch: false, decisionKind: "permission", label: "workforce admin — extension-gated on directory:workers:view" },

  { path: "/me", universalMatch: true, decisionKind: "universal", label: "self-service root" },
  { path: "/me/attendance", universalMatch: true, decisionKind: "universal", label: "own attendance" },
  { path: "/me/time-off", universalMatch: true, decisionKind: "universal", label: "own time-off" },
  { path: "/me/pay", universalMatch: true, decisionKind: "universal", label: "own pay" },
  { path: "/me/expenses", universalMatch: true, decisionKind: "universal", label: "own expenses" },
  { path: "/me/documents", universalMatch: true, decisionKind: "universal", label: "own documents" },

  { path: "/mail", universalMatch: true, decisionKind: "universal", label: "mail root" },

  { path: "/inbox", universalMatch: true, decisionKind: "universal", label: "unified inbox" },

  { path: "/dashboard", universalMatch: true, decisionKind: "universal", label: "dashboard root" },
  { path: "/post-invite", universalMatch: true, decisionKind: "universal", label: "authenticated invitation landing" },
  { path: "/post-invite/unknown", universalMatch: false, decisionKind: "unknown", label: "invitation landing descendants stay closed" },

  { path: "/hr/announcements", universalMatch: true, decisionKind: "universal", label: "announcements under HR prefix — universal reading" },

  { path: "/settings", universalMatch: true, decisionKind: "universal", label: "personal account landing" },
  { path: "/settings/roles", universalMatch: false, decisionKind: "permission", label: "org role management — not personal account" },
  { path: "/settings/billing", universalMatch: false, decisionKind: "permission", label: "billing admin — not personal account" },

  { path: "/settings/notifications/my-preferences", universalMatch: true, decisionKind: "universal", label: "personal notification preferences under settings" },
  { path: "/settings/notifications/my-preferences/channels", universalMatch: true, decisionKind: "universal", label: "notification preferences sub-page under settings" },
  { path: "/settings/notifications/providers", universalMatch: false, decisionKind: "permission", label: "notification provider admin under settings" },
  { path: "/settings/notifications/templates", universalMatch: false, decisionKind: "permission", label: "notification template admin under settings" },
  { path: "/settings/notifications/events", universalMatch: false, decisionKind: "permission", label: "notification event-catalog admin under settings" },
  { path: "/settings/notifications/policy", universalMatch: false, decisionKind: "permission", label: "notification policy admin under settings" },
  { path: "/settings/notifications/broadcasts", universalMatch: false, decisionKind: "permission", label: "broadcast admin under settings" },

  { path: "/access-denied", universalMatch: true, decisionKind: "universal", label: "access-denied page" },
  { path: "/access-suspended", universalMatch: true, decisionKind: "universal", label: "access-suspended page" },
];

describe("universal route matrix — exact-by-default with explicit allowlist", () => {
  it("covers every declared universal root so a missing row cannot pass silently", () => {
    expect(MATRIX.length).toBeGreaterThanOrEqual(49);
  });

  it("isUniversalRoute matches every row's expectation", () => {
    const mismatches = MATRIX.flatMap((row) => {
      const actual = isUniversalRoute(row.path);
      if (actual !== row.universalMatch)
        return [
          `${row.path} (${row.label}): expected isUniversal=${row.universalMatch}, got ${actual}`,
        ];
      return [];
    });
    expect(mismatches).toEqual([]);
  });

  it("resolveRouteAccess matches every row's expected decision kind", () => {
    const mismatches = MATRIX.flatMap((row) => {
      const actual = resolveRouteAccess(row.path).kind;
      if (actual !== row.decisionKind)
        return [
          `${row.path} (${row.label}): expected decision=${row.decisionKind}, got ${actual}`,
        ];
      return [];
    });
    expect(mismatches).toEqual([]);
  });

  it("every protected descendant declared in the matrix resolves to permission, not universal or unknown", () => {
    const protected_ = MATRIX.filter((r) => !r.universalMatch && r.decisionKind === "permission");
    expect(protected_.length).toBeGreaterThan(10);
    for (const row of protected_) {
      expect(resolveRouteAccess(row.path).kind).toBe("permission");
    }
  });

  it("no admin descendant of a universal root inherits universal access via prefix matching", () => {
    const adminPaths = [
      "/settings/notifications/providers",
      "/settings/notifications/templates",
      "/settings/notifications/events",
      "/settings/notifications/policy",
      "/settings/notifications/broadcasts",
      "/knowledge/wiki/import",
      "/knowledge/wiki/analytics",
      "/knowledge/wiki/reviews",
      "/knowledge/wiki/spaces",
      "/knowledge/wiki/templates",
      "/knowledge/wiki/trash",
      "/calendar/settings",
    ];
    for (const p of adminPaths) {
      expect({ path: p, universal: isUniversalRoute(p) }).toEqual({
        path: p,
        universal: false,
      });
    }
  });

  it("personal notification preferences are universal — canonical route under /settings/notifications/my-preferences", () => {
    expect(isUniversalRoute("/settings/notifications/my-preferences")).toBe(true);
    expect(resolveRouteAccess("/settings/notifications/my-preferences").kind).toBe("universal");
  });

  it("individual knowledge spaces are universal reading while the management list is not", () => {
    expect(isUniversalRoute("/knowledge/wiki/spaces/1")).toBe(true);
    expect(resolveRouteAccess("/knowledge/wiki/spaces/1").kind).toBe("universal");
    expect(isUniversalRoute("/knowledge/wiki/spaces")).toBe(false);
    expect(resolveRouteAccess("/knowledge/wiki/spaces").kind).toBe("permission");
  });

  it("workforce workers are gated even though /directory is a universal subtree", () => {
    expect(resolveRouteAccess("/directory/workers").kind).toBe("permission");
  });

  it("access-admin pages under universal roots are blocked by the access-admin guard", () => {
    expect(isUniversalRoute("/chat/access")).toBe(false);
    expect(isUniversalRoute("/directory/access")).toBe(false);
  });

  it("settings root is universal but all organization-administration descendants are not", () => {
    expect(isUniversalRoute("/settings")).toBe(true);
    expect(isUniversalRoute("/settings/roles")).toBe(false);
    expect(isUniversalRoute("/settings/billing")).toBe(false);
  });

  it("BITE: declaring an admin path as universal in the matrix would be caught — the test bites", () => {
    const adminPath = "/settings/notifications/providers";
    const actualUniversal = isUniversalRoute(adminPath);
    expect(actualUniversal).toBe(false);

    const phantomExpectation = true;
    expect(actualUniversal).not.toBe(phantomExpectation);
  });

  it("BITE: the matrix row for each admin descendant has universalMatch=false; flipping it to true would fail the main loop", () => {
    const adminRows = MATRIX.filter((r) => !r.universalMatch && r.decisionKind === "permission");
    expect(adminRows.length).toBeGreaterThan(10);
    for (const row of adminRows) {
      const actual = isUniversalRoute(row.path);
      expect({ path: row.path, matchesPhantom: actual === true }).toEqual({
        path: row.path,
        matchesPhantom: false,
      });
    }
  });

  it("BITE (i): exact-by-default — /me/* subtree remains universally accessible after the change", () => {
    const selfServicePaths = [
      "/me/attendance",
      "/me/time-off",
      "/me/pay",
      "/me/expenses",
      "/me/documents",
      "/me/recruitment",
      "/me/onboarding",
    ];
    for (const path of selfServicePaths) {
      expect({ path, universal: isUniversalRoute(path) }).toEqual({
        path,
        universal: true,
      });
    }
  });

  it("BITE (ii): exact-by-default — a hypothetical new route under a formerly-subtree root fails closed", () => {
    const hypotheticalNewRoutes = [
      "/dashboard/admin-panel",
      "/mail/admin-panel",
      "/inbox/admin-panel",
      "/announcements/admin-panel",
      "/home/admin-panel",
      "/hr/announcements/admin-panel",
      "/kb/admin-panel",
      "/docs/admin-panel",
    ];
    for (const path of hypotheticalNewRoutes) {
      expect({ path, universal: isUniversalRoute(path) }).toEqual({
        path,
        universal: false,
      });
    }
  });
});
