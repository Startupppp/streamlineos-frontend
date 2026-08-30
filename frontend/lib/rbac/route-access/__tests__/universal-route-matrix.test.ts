import { isUniversalRoute } from "../universal-routes";
import { resolveRouteAccess } from "../route-access";

interface MatrixRow {
  path: string;
  universalMatch: boolean;
  decisionKind: "universal" | "permission";
  label: string;
}

const MATRIX: readonly MatrixRow[] = [
  { path: "/notifications", universalMatch: true, decisionKind: "universal", label: "notification inbox root" },
  { path: "/notifications/preferences", universalMatch: true, decisionKind: "universal", label: "personal notification preferences" },
  { path: "/notifications/preferences/channels", universalMatch: true, decisionKind: "universal", label: "notification preferences sub-page" },
  { path: "/notifications/providers", universalMatch: false, decisionKind: "permission", label: "notification provider admin" },
  { path: "/notifications/providers/1", universalMatch: false, decisionKind: "permission", label: "notification provider detail" },
  { path: "/notifications/templates", universalMatch: false, decisionKind: "permission", label: "notification template admin" },
  { path: "/notifications/events", universalMatch: false, decisionKind: "permission", label: "notification event-catalog admin" },
  { path: "/notifications/policy", universalMatch: false, decisionKind: "permission", label: "notification policy admin" },
  { path: "/notifications/broadcasts", universalMatch: false, decisionKind: "permission", label: "broadcast admin" },

  { path: "/knowledge", universalMatch: true, decisionKind: "universal", label: "knowledge root" },
  { path: "/knowledge/wiki", universalMatch: true, decisionKind: "universal", label: "wiki reading root" },
  { path: "/knowledge/wiki/favorites", universalMatch: true, decisionKind: "universal", label: "wiki favorites" },
  { path: "/knowledge/wiki/favorites/sub", universalMatch: true, decisionKind: "universal", label: "wiki favorites sub-page" },
  { path: "/knowledge/wiki/recent", universalMatch: true, decisionKind: "universal", label: "wiki recent pages" },
  { path: "/knowledge/wiki/shared", universalMatch: true, decisionKind: "universal", label: "wiki shared pages" },
  { path: "/knowledge/wiki/private", universalMatch: true, decisionKind: "universal", label: "wiki private pages" },
  { path: "/knowledge/wiki/pages/123", universalMatch: true, decisionKind: "universal", label: "individual wiki page reading" },
  { path: "/knowledge/wiki/pages/123/history", universalMatch: true, decisionKind: "universal", label: "wiki page history" },
  { path: "/knowledge/wiki/chat", universalMatch: true, decisionKind: "universal", label: "wiki AI chat" },
  { path: "/knowledge/wiki/spaces/1", universalMatch: true, decisionKind: "permission", label: "individual space (nominally universal; extension gates kb:spaces:view)" },
  { path: "/knowledge/wiki/settings", universalMatch: false, decisionKind: "permission", label: "wiki settings admin" },
  { path: "/knowledge/wiki/import", universalMatch: false, decisionKind: "permission", label: "wiki import admin" },
  { path: "/knowledge/wiki/analytics", universalMatch: false, decisionKind: "permission", label: "wiki analytics admin" },
  { path: "/knowledge/wiki/reviews", universalMatch: false, decisionKind: "permission", label: "wiki review admin" },
  { path: "/knowledge/wiki/spaces", universalMatch: false, decisionKind: "permission", label: "wiki spaces management list" },
  { path: "/knowledge/wiki/templates", universalMatch: false, decisionKind: "permission", label: "wiki template management" },
  { path: "/knowledge/wiki/trash", universalMatch: false, decisionKind: "permission", label: "wiki trash admin" },

  { path: "/chat", universalMatch: true, decisionKind: "universal", label: "chat root" },
  { path: "/chat/channels", universalMatch: true, decisionKind: "universal", label: "channel list" },
  { path: "/chat/channels/general", universalMatch: true, decisionKind: "universal", label: "channel conversation" },
  { path: "/chat/invite/token123", universalMatch: true, decisionKind: "universal", label: "invite acceptance" },

  { path: "/calendar", universalMatch: true, decisionKind: "universal", label: "unified calendar" },

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
  { path: "/mail/inbox", universalMatch: true, decisionKind: "universal", label: "mail inbox" },

  { path: "/announcements", universalMatch: true, decisionKind: "universal", label: "announcements root" },
  { path: "/announcements/1", universalMatch: true, decisionKind: "universal", label: "announcement detail" },

  { path: "/referrals", universalMatch: true, decisionKind: "universal", label: "referrals root" },
  { path: "/jobs", universalMatch: true, decisionKind: "universal", label: "internal job openings" },

  { path: "/settings", universalMatch: true, decisionKind: "universal", label: "personal account landing" },

  { path: "/access-denied", universalMatch: true, decisionKind: "universal", label: "access-denied page" },
  { path: "/access-suspended", universalMatch: true, decisionKind: "universal", label: "access-suspended page" },
];

describe("universal route matrix — exact-by-default with explicit allowlist", () => {
  it("covers every declared universal root so a missing row cannot pass silently", () => {
    expect(MATRIX.length).toBeGreaterThan(40);
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
      "/notifications/providers",
      "/notifications/templates",
      "/notifications/events",
      "/notifications/policy",
      "/notifications/broadcasts",
      "/knowledge/wiki/settings",
      "/knowledge/wiki/import",
      "/knowledge/wiki/analytics",
      "/knowledge/wiki/reviews",
      "/knowledge/wiki/spaces",
      "/knowledge/wiki/templates",
      "/knowledge/wiki/trash",
    ];
    for (const p of adminPaths) {
      expect({ path: p, universal: isUniversalRoute(p) }).toEqual({
        path: p,
        universal: false,
      });
    }
  });

  it("personal notification preferences are universal — not confused with admin surfaces", () => {
    expect(isUniversalRoute("/notifications/preferences")).toBe(true);
    expect(resolveRouteAccess("/notifications/preferences").kind).toBe("universal");
  });

  it("individual knowledge spaces are nominally universal while the management list is not", () => {
    expect(isUniversalRoute("/knowledge/wiki/spaces/1")).toBe(true);
    expect(isUniversalRoute("/knowledge/wiki/spaces")).toBe(false);
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
});
