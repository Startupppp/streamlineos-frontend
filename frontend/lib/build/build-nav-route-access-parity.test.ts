import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { buildScopeCatalog, splitDestinationHref } from "./build-nav-model";
import { BUILD_MY_WORK_DESTINATIONS } from "./nav/build-stable-destinations";
import { resolveBuildScope } from "./build-scope";
import type { BuildNavDestination } from "./nav/build-nav-destination";
import type { PermissionKey } from "@/lib/rbac/permissions";

const SCOPE_PATHS = [
  "/build",
  "/build/managed-products/7",
  "/build/42",
];

function keysOf(
  requirement: PermissionKey | PermissionKey[],
): PermissionKey[] {
  return Array.isArray(requirement) ? requirement : [requirement];
}

function everyBuildDestination(): BuildNavDestination[] {
  const seen = new Set<string>();
  const all: BuildNavDestination[] = [];
  for (const destination of BUILD_MY_WORK_DESTINATIONS) {
    seen.add(destination.id);
    all.push(destination);
  }
  for (const path of SCOPE_PATHS) {
    const catalog = buildScopeCatalog(resolveBuildScope(path));
    const entries = [
      ...catalog.primary,
      ...catalog.moreTools,
      ...(catalog.settings ? [catalog.settings] : []),
    ];
    for (const destination of entries) {
      if (seen.has(destination.id)) continue;
      seen.add(destination.id);
      all.push(destination);
    }
  }
  return all;
}

const destinations = everyBuildDestination();

function drifted(): string[] {
  const found: string[] = [];
  for (const destination of destinations) {
    const { path } = splitDestinationHref(destination.href);
    const decision = resolveRouteAccess(path);
    if (decision.kind !== "permission") continue;
    const routeKeys = decision.permission ? keysOf(decision.permission) : [];
    if (routeKeys.length === 0) continue;
    const navKeys = new Set<string>(keysOf(destination.requiredPermission));
    if (routeKeys.every((key) => !navKeys.has(key)))
      found.push(`${destination.id} -> ${path}`);
  }
  return found.sort();
}

const KNOWN_KEY_DRIFT: readonly string[] = [];

describe("every Build navigation destination is reachable by its own key", () => {
  it("covers a non-trivial number of destinations, so a catalog that stopped loading cannot pass vacuously", () => {
    expect(destinations.length).toBeGreaterThan(30);
  });

  it("resolves every destination href to a registered route, so none falls through to access-denied", () => {
    const unregistered = destinations
      .map((destination) => splitDestinationHref(destination.href).path)
      .filter((path) => resolveRouteAccess(path).kind === "unknown");
    expect(unregistered).toEqual([]);
  });

  it("adds no destination whose sidebar key and route key disagree", () => {
    expect(drifted()).toEqual(KNOWN_KEY_DRIFT);
  });

  it("tolerates no allowlisted drift, so a disagreement must be fixed rather than suppressed", () => {
    expect(KNOWN_KEY_DRIFT).toEqual([]);
  });
});

describe("BSN-04-001 permission matrix — every primary destination across all four scopes", () => {
  it("every destination declares a required permission so useCan gates are never vacuous", () => {
    const withoutPermission = destinations
      .filter((destination) => {
        const req = destination.requiredPermission;
        return !req || (Array.isArray(req) && req.length === 0);
      })
      .map((destination) => destination.id);
    expect(withoutPermission).toEqual([]);
  });

  it("BT-73f88b7d630d — no Build route resolves as universal so every destination requires a permission check", () => {
    const universalRoutes = destinations
      .map((destination) => splitDestinationHref(destination.href).path)
      .filter((path) => resolveRouteAccess(path).kind === "universal");
    expect(universalRoutes).toEqual([]);
  });
});

type CrossScopeCase = [
  crossScopePath: string,
  scopeLocalPermission: PermissionKey,
  basePermission: PermissionKey,
];

const CROSS_SCOPE_CASES: CrossScopeCase[] = [
  [
    "/build/managed-products/7/feedbucket",
    "feedbucket:widgets:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/cycles",
    "build:cycles:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/bugs",
    "build:bugs:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/qa",
    "build:qa:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/approvals",
    "build:approvals:view",
    "build:managed-products:view",
  ],
];

describe("BSN-01-026 cross-scope deep links — project extensions do not over-match product URLs", () => {
  it("covers representative cross-scope paths so a missing entry cannot pass vacuously", () => {
    expect(CROSS_SCOPE_CASES.length).toBeGreaterThan(3);
  });

  it.each(CROSS_SCOPE_CASES)(
    "%s resolves to the base scope key %s, not the project-local key %s",
    (crossScopePath, scopeLocalPermission, basePermission) => {
      const decision = resolveRouteAccess(crossScopePath);
      expect(decision.kind).toBe("permission");
      if (decision.kind !== "permission") return;
      const resolved = decision.permission
        ? keysOf(decision.permission)
        : [];
      expect(resolved).not.toContain(scopeLocalPermission);
      expect(resolved).toContain(basePermission);
    },
  );
});
