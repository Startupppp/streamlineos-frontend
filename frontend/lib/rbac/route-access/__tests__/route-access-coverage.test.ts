import { collectAppRoutes } from "../app-routes";
import { resolveRouteAccess, describeRouteAccess } from "../route-access";
import { ROUTE_ACCESS_EXTENSIONS, matchRouteAccessExtension } from "../route-access-extensions";
import { UNIVERSAL_ROUTES, isUniversalRoute } from "../universal-routes";

describe("every authenticated route resolves through the registry", () => {
  const routes = collectAppRoutes("(authenticated)");
  const realPaths = new Set(routes.map((r) => r.path));

  it("finds the authenticated route tree, so an empty sweep cannot pass", () => {
    expect(routes.length).toBeGreaterThan(400);
  });

  it("answers every authenticated route with universal or permission access", () => {
    const unknown = routes
      .filter((route) => resolveRouteAccess(route.path).kind === "unknown")
      .map((route) => `${route.path}  (${route.file})`)
      .sort();
    expect(unknown).toEqual([]);
  });

  it("resolves a route the registry has never seen as unknown, so it fails closed", () => {
    expect(resolveRouteAccess("/not-a-real-surface").kind).toBe("unknown");
    expect(resolveRouteAccess("/build-lookalike").kind).toBe("unknown");
  });

  it("describes each decision without throwing", () => {
    for (const route of routes)
      expect(typeof describeRouteAccess(resolveRouteAccess(route.path))).toBe(
        "string",
      );
  });

  it("every route-access extension prefix matches at least one real authenticated page — catches phantom extensions", () => {
    const phantoms = ROUTE_ACCESS_EXTENSIONS.filter(
      (ext) =>
        !routes.some(
          (r) =>
            r.path === ext.prefix || r.path.startsWith(`${ext.prefix}/`),
        ),
    ).map((ext) => ext.prefix);
    expect(phantoms).toEqual([]);
  });

  it("every exact universal-descendant path has a real authenticated page — catches phantom descendants", () => {
    const exactDescendants = UNIVERSAL_ROUTES.flatMap(
      (r) => r.universalDescendants ?? [],
    ).filter((d) => !d.subtree && !d.childrenOnly);
    const phantoms = exactDescendants
      .filter((d) => !realPaths.has(d.path))
      .map((d) => d.path);
    expect(phantoms).toEqual([]);
  });
});

describe("§8 platform-core surfaces are universally accessible to every active member", () => {
  it("dashboard is universal", () => {
    expect(isUniversalRoute("/dashboard")).toBe(true);
    expect(resolveRouteAccess("/dashboard").kind).toBe("universal");
  });

  it("mail root is universal", () => {
    expect(isUniversalRoute("/mail")).toBe(true);
    expect(resolveRouteAccess("/mail").kind).toBe("universal");
  });

  it("chat channels are universal", () => {
    expect(isUniversalRoute("/chat/channels")).toBe(true);
    expect(resolveRouteAccess("/chat/channels").kind).toBe("universal");
  });

  it("notifications inbox is universal", () => {
    expect(isUniversalRoute("/notifications")).toBe(true);
    expect(resolveRouteAccess("/notifications").kind).toBe("universal");
  });

  it("unified inbox is universal", () => {
    expect(isUniversalRoute("/inbox")).toBe(true);
    expect(resolveRouteAccess("/inbox").kind).toBe("universal");
  });

  it("own time-off is universal — /me is a self-service subtree", () => {
    expect(isUniversalRoute("/me/time-off")).toBe(true);
    expect(resolveRouteAccess("/me/time-off").kind).toBe("universal");
  });

  it("own attendance is universal", () => {
    expect(isUniversalRoute("/me/attendance")).toBe(true);
    expect(resolveRouteAccess("/me/attendance").kind).toBe("universal");
  });

  it("own expenses are universal", () => {
    expect(isUniversalRoute("/me/expenses")).toBe(true);
    expect(resolveRouteAccess("/me/expenses").kind).toBe("universal");
  });

  it("own pay is universal", () => {
    expect(isUniversalRoute("/me/pay")).toBe(true);
    expect(resolveRouteAccess("/me/pay").kind).toBe("universal");
  });

  it("own employment documents are universal", () => {
    expect(isUniversalRoute("/me/documents")).toBe(true);
    expect(resolveRouteAccess("/me/documents").kind).toBe("universal");
  });

  it("announcements are universal via the hr prefix the page actually lives under", () => {
    expect(isUniversalRoute("/hr/announcements")).toBe(true);
    expect(resolveRouteAccess("/hr/announcements").kind).toBe("universal");
  });

  it("employee referrals and job openings are universal via /me self-service", () => {
    expect(isUniversalRoute("/me/recruitment")).toBe(true);
    expect(resolveRouteAccess("/me/recruitment").kind).toBe("universal");
  });

  it("people directory root is universal", () => {
    expect(isUniversalRoute("/directory")).toBe(true);
    expect(resolveRouteAccess("/directory").kind).toBe("universal");
  });

  it("knowledge-base reading is universal via /knowledge/wiki pages", () => {
    expect(isUniversalRoute("/knowledge/wiki/pages/1")).toBe(true);
    expect(resolveRouteAccess("/knowledge/wiki/pages/1").kind).toBe("universal");
  });

  it("knowledge AI chat is universal", () => {
    expect(isUniversalRoute("/knowledge/chat")).toBe(true);
    expect(resolveRouteAccess("/knowledge/chat").kind).toBe("universal");
  });

  it("personal notification preferences are universal", () => {
    expect(isUniversalRoute("/notifications/preferences")).toBe(true);
    expect(resolveRouteAccess("/notifications/preferences").kind).toBe("universal");
  });

  it("notification administration is NOT universal — gated on providers permission", () => {
    expect(isUniversalRoute("/notifications/providers")).toBe(false);
    expect(resolveRouteAccess("/notifications/providers").kind).toBe("permission");
  });

  it("KB administration is NOT universal — gated on settings permission", () => {
    expect(isUniversalRoute("/knowledge/wiki/settings")).toBe(false);
    expect(resolveRouteAccess("/knowledge/wiki/settings").kind).toBe("permission");
  });
});

describe("a gated route is never also a universal route", () => {
  const probes = ROUTE_ACCESS_EXTENSIONS.flatMap((entry) => {
    if (entry.exact) return [entry.prefix];
    if (entry.descendantsOnly) return [`${entry.prefix}/child`];
    return [entry.prefix, `${entry.prefix}/child`];
  });

  it.each(probes)("%s resolves gated, not universal", (path) => {
    expect(matchRouteAccessExtension(path)).not.toBeNull();
    expect(isUniversalRoute(path)).toBe(false);
  });

  it.each(
    ROUTE_ACCESS_EXTENSIONS.filter((entry) => entry.descendantsOnly).map((entry) => entry.prefix),
  )("%s keeps its own root universal while gating descendants", (prefix) => {
    expect(matchRouteAccessExtension(prefix)).toBeNull();
    expect(resolveRouteAccess(prefix).kind).toBe("universal");
    expect(resolveRouteAccess(`${prefix}/child`).kind).toBe("permission");
  });

  it("no universal root's subtree swallows a gated prefix", () => {
    const swallowed = ROUTE_ACCESS_EXTENSIONS.filter((entry) =>
      UNIVERSAL_ROUTES.some(
        (route) => route.subtree === true && entry.prefix.startsWith(`${route.path}/`),
      ),
    ).map((entry) => entry.prefix);
    expect(swallowed).toEqual([]);
  });
});
