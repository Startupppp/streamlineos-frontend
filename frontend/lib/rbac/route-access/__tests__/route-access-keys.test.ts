import * as fs from "fs";
import * as path from "path";
import { resolveNavRouteAccess } from "@/components/layout/sidebar/sidebar-nav-items";
import { collectAppRoutes } from "../app-routes";
import { ROUTE_ACCESS_EXTENSIONS } from "../route-access-extensions";
import {
  UNIVERSAL_ROUTES,
  isUniversalRoute,
} from "../universal-routes";
import { resolveRouteAccess } from "../route-access";

const BACKEND_PERMS_DIR = path.resolve(
  __dirname,
  "../../../../../backend/src/modules/rbac/permissions",
);

const EXCLUDED_BACKEND_FILES = new Set([
  "index.ts",
  "catalog.ts",
  "role-defaults.ts",
  "types.ts",
]);

const BACKEND_MODULE_REGISTRY = path.resolve(
  __dirname,
  "../../../../../backend/src/common/rbac/module-registry.ts",
);

function readDelegableModuleIds(): string[] {
  const source = fs.readFileSync(BACKEND_MODULE_REGISTRY, "utf8");
  const ids: string[] = [];
  const entry = /id:\s*["'`]([^"'`]+)["'`][\s\S]*?ladder:\s*["'`]([^"'`]+)["'`]/g;
  for (const match of source.matchAll(entry))
    if (match[2] === "delegable") ids.push(match[1]);
  return ids;
}

const BACKEND_ROLE_DEFAULTS = path.resolve(
  __dirname,
  "../../../../../backend/src/modules/rbac/permissions/role-defaults.ts",
);

function memberDefaultPermissions(): Set<string> {
  const source = fs.readFileSync(BACKEND_ROLE_DEFAULTS, "utf8");
  const end = source.indexOf("ROLE_DEFAULT_PERMISSIONS");
  const block = source.slice(0, end);
  return new Set(
    [...block.matchAll(/"([a-z0-9-]+:[a-z0-9:-]+)"/g)].map((m) => m[1]),
  );
}

function readBackendPermissionNames(): Set<string> {
  const names = new Set<string>();
  for (const fileName of fs.readdirSync(BACKEND_PERMS_DIR)) {
    if (!fileName.endsWith(".ts")) continue;
    if (EXCLUDED_BACKEND_FILES.has(fileName)) continue;
    const source = fs.readFileSync(
      path.join(BACKEND_PERMS_DIR, fileName),
      "utf8",
    );
    for (const match of source.matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm))
      if (!match[1].includes("${")) names.add(match[1]);
  }
  for (const moduleId of readDelegableModuleIds()) {
    names.add(`${moduleId}:access:view`);
    names.add(`${moduleId}:access:manage`);
  }
  return names;
}

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
    expect(fs.existsSync(BACKEND_PERMS_DIR)).toBe(true);
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

  it("never contradicts navigation for a route navigation already owns", () => {
    const conflicts: string[] = [];
    for (const route of routes) {
      if (isUniversalRoute(route.path)) continue;
      const nav = resolveNavRouteAccess(route.path);
      if (!nav.matched || !nav.requiredPermission) continue;
      const navKeys = Array.isArray(nav.requiredPermission)
        ? [...nav.requiredPermission].sort()
        : [nav.requiredPermission];
      const registryKeys = keysOf(route.path).sort();
      if (JSON.stringify(navKeys) !== JSON.stringify(registryKeys))
        conflicts.push(
          `${route.path}: nav ${navKeys.join(",")} vs registry ${registryKeys.join(",")}`,
        );
    }
    expect(conflicts).toEqual([]);
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
      (entry) =>
        !routes.some(
          (route) =>
            route.path === entry.prefix ||
            route.path.startsWith(`${entry.prefix}/`),
        ),
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
      "/chat/moderation",
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
      { path: "/accounting/budgets", expected: "accounting:budgets:read" },
      { path: "/accounting/coa", expected: "accounting:accounts:read" },
      { path: "/accounting/journal", expected: "accounting:journal:read" },
      { path: "/accounting/banking", expected: "accounting:banking:read" },
      { path: "/accounting/assets", expected: "accounting:assets:read" },
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
});
