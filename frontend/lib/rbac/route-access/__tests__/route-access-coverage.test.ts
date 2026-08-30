import { collectAppRoutes } from "../app-routes";
import { resolveRouteAccess, describeRouteAccess } from "../route-access";

describe("every authenticated route resolves through the registry", () => {
  const routes = collectAppRoutes("(authenticated)");

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
});
