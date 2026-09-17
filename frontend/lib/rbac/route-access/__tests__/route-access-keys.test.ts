import * as fs from "fs";
import * as path from "path";
import { resolveNavRouteAccess } from "@/components/layout/sidebar/sidebar-nav-items";
import { collectAppRoutes } from "../app-routes";
import {
  ROUTE_ACCESS_EXTENSIONS,
  matchRouteAccessExtension,
  routeAccessExtensionCovers,
} from "../route-access-extensions";
import {
  UNIVERSAL_ROUTES,
  isUniversalRoute,
} from "../universal-routes";
import { hasAssignedProductAccess, resolveRouteAccess } from "../route-access";
import {
  PERMISSION_CATALOG_PATH,
  backendPermissionNames as readBackendPermissionNames,
  delegableModuleIds as readDelegableModuleIds,
  memberDefaultPermissions,
} from "@/test-utils/permission-catalog";

function keysOf(pathname: string): string[] {
  const decision = resolveRouteAccess(pathname);
  if (decision.kind !== "permission" || !decision.permission) return [];
  return Array.isArray(decision.permission)
    ? [...decision.permission]
    : [decision.permission];
}

describe("route-access registry keys", () => {
  const routes = collectAppRoutes("(authenticated)");
  let backendNames: Set<string>;

  beforeAll(() => {
    backendNames = readBackendPermissionNames();
  });

  it("can reach the backend catalog, so a silent empty sweep cannot pass", () => {
    expect(fs.existsSync(PERMISSION_CATALOG_PATH)).toBe(true);
    expect(backendNames.size).toBeGreaterThan(400);
  });

  it("expands the generated module-access keys the literal scan cannot see", () => {
    expect(readDelegableModuleIds().length).toBeGreaterThan(5);
    expect(backendNames.has("build:access:view")).toBe(true);
    expect(backendNames.has("hr:access:manage")).toBe(true);
  });

  it("has no frontend-only permission key in any route decision", () => {
    const ghosts = new Set<string>();
    for (const route of routes)
      for (const key of keysOf(route.path))
        if (!backendNames.has(key)) ghosts.add(`${key}  (${route.path})`);
    expect([...ghosts].sort()).toEqual([]);
  });

  it("has no frontend-only permission key in a registry extension", () => {
    const declared = ROUTE_ACCESS_EXTENSIONS.flatMap((entry) => {
      if (!entry.permission) return [];
      return Array.isArray(entry.permission)
        ? entry.permission
        : [entry.permission];
    });
    const ghosts = declared.filter((key) => !backendNames.has(key)).sort();
    expect(ghosts).toEqual([]);
  });

  it("each backendRoute entry carries the same permission the backend operation declares (x-permission in contracts/openapi.json)", () => {
    // x-permission is an internal stamp, read from the vendored artifact, not a published contract.
    const OPENAPI_PATH = path.resolve(__dirname, "../../../../contracts/openapi.json");
    type OpenApiDoc = {
      paths: Record<string, Record<string, { "x-permission"?: string } | undefined> | undefined>;
    };
    const doc = JSON.parse(fs.readFileSync(OPENAPI_PATH, "utf8")) as OpenApiDoc;
    const mismatches: string[] = [];
    for (const entry of ROUTE_ACCESS_EXTENSIONS) {
      if (!entry.backendRoute) continue;
      const { method, path: backendPath } = entry.backendRoute;
      const op = doc.paths[backendPath]?.[method];
      const xPermission = op?.["x-permission"];
      if (typeof xPermission !== "string") {
        mismatches.push(
          `${entry.prefix}: ${method.toUpperCase()} ${backendPath} has no x-permission in contracts/openapi.json`,
        );
        continue;
      }
      const frontendKey = entry.permission;
      if (frontendKey === undefined) {
        mismatches.push(`${entry.prefix}: has backendRoute but no permission field`);
        continue;
      }
      const match = Array.isArray(frontendKey)
        ? frontendKey.some((key) => key === xPermission)
        : frontendKey === xPermission;
      if (!match)
        mismatches.push(
          `${entry.prefix}: frontend "${String(frontendKey)}" !== backend x-permission "${xPermission}" on ${method.toUpperCase()} ${backendPath}`,
        );
    }
    expect(mismatches).toEqual([]);
  });

  function navDisagreesWithRegistry(routePath: string): boolean {
    if (isUniversalRoute(routePath)) return false;
    const nav = resolveNavRouteAccess(routePath);
    if (!nav.matched || !nav.requiredPermission) return false;
    const navKeys = Array.isArray(nav.requiredPermission)
      ? [...nav.requiredPermission].sort()
      : [nav.requiredPermission];
    return JSON.stringify(navKeys) !== JSON.stringify(keysOf(routePath).sort());
  }

  it("never contradicts navigation for a route navigation already owns and the registry does not claim", () => {
    const conflicts = routes
      .filter((route) => !matchRouteAccessExtension(route.path))
      .filter((route) => navDisagreesWithRegistry(route.path))
      .map((route) => `${route.path}: nav vs registry disagree`);
    expect(conflicts).toEqual([]);
  });

  it("lets an extension outrank navigation only when it names the backend operation it mirrors, so an override cannot be invented", () => {
    const overriding = ROUTE_ACCESS_EXTENSIONS.filter((entry) =>
      routes.some(
        (route) =>
          matchRouteAccessExtension(route.path) === entry &&
          navDisagreesWithRegistry(route.path),
      ),
    );
    expect(overriding.length).toBeGreaterThan(0);
    const unproven = overriding
      .filter((entry) => !entry.backendRoute)
      .map((entry) => entry.prefix)
      .sort();
    expect(unproven).toEqual([]);
  });

  it("gives every universal route and every extension a stated reason", () => {
    const unreasoned = [
      ...UNIVERSAL_ROUTES.filter((route) => route.reason.trim().length < 20).map(
        (route) => route.path,
      ),
...ROUTE_ACCESS_EXTENSIONS.filter(
        (entry) => entry.reason.trim().length < 20,
      ).map((entry) => entry.prefix),
    ];
    expect(unreasoned).toEqual([]);
  });

  it("keeps every registry extension live, so a stale entry cannot accumulate", () => {
    const stale = ROUTE_ACCESS_EXTENSIONS.filter(
      (entry) => !routes.some((route) => routeAccessExtensionCovers(entry, route.path)),
    ).map((entry) => entry.prefix);
    expect(stale).toEqual([]);
  });

  it("never leaves a navigable route undecidable, which would deny everyone", () => {
    const undecidable: string[] = [];
    for (const route of routes) {
      if (isUniversalRoute(route.path)) continue;
      const nav = resolveNavRouteAccess(route.path);
      if (!nav.matched) continue;
      if (resolveRouteAccess(route.path).kind === "unknown")
        undecidable.push(
          `${route.path}: navigation owns it but the registry cannot decide`,
        );
    }
    expect(undecidable).toEqual([]);
  });

  it("never treats access administration as universal", () => {
    expect(isUniversalRoute("/chat/access")).toBe(false);
    expect(isUniversalRoute("/directory/access")).toBe(false);
    expect(isUniversalRoute("/chat")).toBe(true);
  });

  it("does not treat administrative descendants of universal roots as universal", () => {
    const protectedRoutes = [
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
      "/chat/settings",
      "/calendar/settings",
    ];
    for (const route of protectedRoutes) {
      expect(isUniversalRoute(route)).toBe(false);
      expect(resolveRouteAccess(route).kind).toBe("permission");
    }
    expect(isUniversalRoute("/knowledge/wiki/spaces/1")).toBe(true);
    expect(isUniversalRoute("/notifications/preferences")).toBe(true);
  });

  it("gates a universal page only on a permission every member keeps by default", () => {
    const defaults = memberDefaultPermissions();
    expect(defaults.size).toBeGreaterThan(20);

    const offenders: string[] = [];
    for (const route of routes) {
      if (!isUniversalRoute(route.path)) continue;
      const source = fs.readFileSync(
        path.resolve(__dirname, "../../../../app", route.file),
        "utf8",
      );
      for (const match of source.matchAll(
        /requirePermission\(\s*(?:\[)?\s*"([^"]+)"/g,
      ))
        if (!defaults.has(match[1]))
          offenders.push(`${route.path}: ${match[1]}`);
    }
    expect(offenders.sort()).toEqual([]);
  });

  it("keeps organization administration out of the universal personal landing page", () => {
    expect(isUniversalRoute("/settings")).toBe(true);
    expect(isUniversalRoute("/settings/roles")).toBe(false);
    expect(isUniversalRoute("/settings/billing")).toBe(false);
  });

  it("BITE: accounting routes resolve to the accounting module — layout must check module enablement via enforceRouteAccess", () => {
    const accountingRoutes = [
      "/accounting/settings",
      "/accounting/budgets",
      "/accounting/journal",
      "/accounting/coa",
      "/accounting/banking",
      "/accounting/assets",
      "/accounting/taxes",
      "/accounting/reports",
    ];
    for (const route of accountingRoutes) {
      const decision = resolveRouteAccess(route);
      expect(decision.kind).toBe("permission");
      if (decision.kind === "permission") {
        expect(decision.orgModuleKey).toBe("accounting");
        expect(decision.permission).toBeTruthy();
      }
    }
  });

  it("BITE: accounting layout uses enforceRouteAccess, not requirePermission directly", () => {
    const layoutPath = path.resolve(
      __dirname,
      "../../../../app/(authenticated)/accounting/layout.tsx",
    );
    const src = fs.readFileSync(layoutPath, "utf8");
    expect(src).toContain("enforceRouteAccess");
    expect(src).not.toContain("requirePermission");
  });

  it("BITE: each accounting descendant carries its own permission, not the blanket accounting:read", () => {
    const checks: Array<{ path: string; expected: string | string[] }> = [
      { path: "/accounting/invoices", expected: "accounting:receivables:read" },
      { path: "/accounting/coa", expected: "accounting:accounts:read" },
      { path: "/accounting/journal", expected: "accounting:journal:read" },
      { path: "/accounting/banking", expected: "accounting:banking:read" },
      { path: "/accounting/general-ledger", expected: "accounting:general-ledger:read" },
      { path: "/accounting/taxes", expected: "accounting:taxes:read" },
      { path: "/accounting/reports", expected: "accounting:reports:read" },
    ];
    for (const { path, expected } of checks) {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      if (decision.kind === "permission") {
        const keys = Array.isArray(decision.permission)
          ? decision.permission
          : [decision.permission];
        const expectedKeys = Array.isArray(expected) ? expected : [expected];
        expect(keys.some((k) => expectedKeys.includes(k as string))).toBe(true);
      }
    }
  });

  it("BITE: workflows settings routes resolve as permission-gated — confirms the route move to /workflows/settings/*", () => {
    const settingsRoutes: Array<{ path: string; expectedPermission: string }> = [
      { path: "/workflows/settings/variables", expectedPermission: "workflows:variables:manage" },
      { path: "/workflows/settings/secrets", expectedPermission: "workflows:secrets:manage" },
      { path: "/workflows/settings/access", expectedPermission: "workflows:access:view" },
    ];
    for (const { path, expectedPermission } of settingsRoutes) {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      if (decision.kind === "permission") {
        const keys = Array.isArray(decision.permission)
          ? decision.permission
          : [decision.permission];
        expect(keys).toContain(expectedPermission);
      }
    }
  });
});

describe("assigned product access", () => {
  it("always exposes home", () => {
    expect(hasAssignedProductAccess("home", {})).toBe(true);
  });

  it("ignores universal member defaults", () => {
    expect(hasAssignedProductAccess("hrms", { "self:attendance": "own" })).toBe(false);
    expect(hasAssignedProductAccess("timesheets", { "timesheets:entries:view": "own" })).toBe(false);
    expect(hasAssignedProductAccess("documents", { "kb:articles:view": "all" })).toBe(false);
  });

  it("recognizes direct and administered Build namespaces", () => {
    expect(hasAssignedProductAccess("build", { "build:tickets:view": "all" })).toBe(true);
    expect(hasAssignedProductAccess("build", { "projects:members:view": "all" })).toBe(true);
  });
});
