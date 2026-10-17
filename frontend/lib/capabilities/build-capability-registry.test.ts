import {
  BUILD_CAPABILITY_REGISTRY,
  findBuildCapability,
  authorizedBuildRouteIds,
} from "./build-capability-registry";
import { BUILD_ROUTE_MANIFEST } from "@/lib/build/build-route-manifest";
import { buildOrganizationCatalog } from "@/lib/build/nav/build-organization-catalog";
import {
  BUILD_MY_WORK_DESTINATIONS,
  BUILD_BROWSE_ALL_DESTINATION,
} from "@/lib/build/nav/build-stable-destinations";

describe("BT-23009d74e88d — build capability registry", () => {
  it("registry contains at least one entry for org catalog and stable destinations", () => {
    expect(BUILD_CAPABILITY_REGISTRY.length).toBeGreaterThan(5);
  });

  it("every entry has a non-empty routeId", () => {
    const empty = BUILD_CAPABILITY_REGISTRY.filter((e) => !e.routeId).map(
      (e) => e.routeId,
    );
    expect(empty).toEqual([]);
  });

  it("every entry has at least one permissionKey", () => {
    const missing = BUILD_CAPABILITY_REGISTRY.filter(
      (e) => e.permissionKeys.length === 0,
    ).map((e) => e.routeId);
    expect(missing).toEqual([]);
  });

  it("no two entries have the same routeId", () => {
    const ids = BUILD_CAPABILITY_REGISTRY.map((e) => e.routeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findBuildCapability returns entry with build:view for org-overview", () => {
    const entry = findBuildCapability("org-overview");
    expect(entry).toBeDefined();
    expect(entry?.permissionKeys).toContain("build:view");
  });

  it("findBuildCapability returns undefined for an unknown route", () => {
    expect(findBuildCapability("unknown-nonexistent-route")).toBeUndefined();
  });

  it("my-work-assigned is in the registry with build:tickets:view", () => {
    const entry = findBuildCapability("my-work-assigned");
    expect(entry?.permissionKeys).toContain("build:tickets:view");
  });
});

describe("BT-23009d74e88d — authorizedBuildRouteIds filters by can()", () => {
  it("returns all routes when can returns true for everything", () => {
    const allRoutes = authorizedBuildRouteIds(() => true);
    expect(allRoutes.length).toBe(BUILD_CAPABILITY_REGISTRY.length);
  });

  it("returns empty array when can returns false for everything", () => {
    const noRoutes = authorizedBuildRouteIds(() => false);
    expect(noRoutes).toEqual([]);
  });

  it("returns only routes whose permission keys the actor has", () => {
    const routes = authorizedBuildRouteIds((key) => key === "build:view");
    expect(routes.length).toBeGreaterThan(0);
    for (const routeId of routes) {
      const entry = findBuildCapability(routeId);
      expect(entry?.permissionKeys).toContain("build:view");
    }
  });

  it.each(["build:members:view", "build:access:view"])(
    "allows org-members through the %s alternative",
    (permission) => {
      const routes = authorizedBuildRouteIds((key) => key === permission);
      expect(routes).toContain("org-members");
      expect(routes).not.toContain("org-overview");
    },
  );

  it("denies org-members when neither alternative is allowed", () => {
    const routes = authorizedBuildRouteIds((key) => key === "build:view");
    expect(routes).not.toContain("org-members");
    expect(routes).toContain("org-overview");
  });
});

describe("ARCH-16 — nav destinations parity: every org-scope nav destination has a KEEP manifest route", () => {
  const keptRoutes = new Set(
    BUILD_ROUTE_MANIFEST.filter((e) => e.decision === "KEEP").map((e) => e.route),
  );

  it("covers enough destinations that a empty catalog cannot pass vacuously", () => {
    const catalog = buildOrganizationCatalog();
    const all = [...catalog.primary, ...(catalog.moreTools ?? [])];
    expect(all.length).toBeGreaterThan(5);
  });

  it("every org catalog primary and moreTools destination href is a KEEP manifest route so nav cannot link to a removed route", () => {
    const catalog = buildOrganizationCatalog();
    const all = [...catalog.primary, ...(catalog.moreTools ?? [])];
    const notInManifest = all
      .map((d) => ({ id: d.id, route: d.href.split("?")[0] }))
      .filter(({ route }) => !keptRoutes.has(route));
    expect(notInManifest).toEqual([]);
  });

  it("every stable destination href is a KEEP manifest route so my-work and browse-all cannot link to a removed route", () => {
    const all = [...BUILD_MY_WORK_DESTINATIONS, BUILD_BROWSE_ALL_DESTINATION];
    const notInManifest = all
      .map((d) => ({ id: d.id, route: d.href.split("?")[0] }))
      .filter(({ route }) => !keptRoutes.has(route));
    expect(notInManifest).toEqual([]);
  });
});
