import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  flattenNavRoutes,
  getAccessibleProductHref,
  getNavGroupsForProduct,
  isModuleEnabled,
  NAV_GROUPS,
  type NavRoute,
} from "./sidebar-nav-items";

const ACCESS_ONLY_CASES = [
  ["hrms", "hr:access:view", "/hr/access"],
  ["crm", "crm:access:view", "/crm/access"],
  ["build", "build:access:view", "/build/access"],
  ["inventory", "inventory:access:view", "/inventory/access"],
  ["finance", "accounting:access:view", "/accounting/access"],
  ["helpdesk", "support:access:view", "/support/access"],
  ["surveys", "surveys:access:view", "/surveys/access"],
  ["payroll", "payroll:access:view", "/payroll/access"],
  ["sign", "sign:access:view", "/sign/access"],
  ["timesheets", "timesheets:access:view", "/timesheets/access"],
] as const;

function scopesOf(keys: readonly string[]): Record<string, "all"> {
  return Object.fromEntries(keys.map((key) => [key, "all" as const]));
}

function hrefsFor(
  product: Parameters<typeof getNavGroupsForProduct>[0],
  permissions: string[],
): string[] {
  return getNavGroupsForProduct(product, "MEMBER", scopesOf(permissions), [
    product === "hrms"
      ? "HR"
      : product === "finance"
        ? "FINANCE"
        : product === "helpdesk"
          ? "HELPDESK"
          : product.toUpperCase(),
  ])
    .flatMap((group) => flattenNavRoutes(group.routes))
    .map((route) => route.href);
}

describe("permission-aware product navigation", () => {
  it("fails closed while module entitlement data is absent or loaded empty", () => {
    expect(isModuleEnabled("hrms", [])).toBe(false);
    expect(getNavGroupsForProduct("hrms", "OWNER", scopesOf([]), [])).toEqual([]);
    expect(isModuleEnabled("home", [])).toBe(true);
    expect(isModuleEnabled("administration", [])).toBe(true);
  });

  it("shows only HR areas covered by a limited HR role", () => {
    const permissions = [
      "hr:access:view",
      "hr:access:manage",
      "hr:employees:view",
      "hr:employees:create",
      "hr:employees:update",
      "hr:employees:delete",
      "hr:employees:manage",
      "hr:attendance:view",
      "hr:attendance:manage",
      "hr:attendance:regularize",
      "hr:leaves:view",
    ];
    const groups = getNavGroupsForProduct(
      "hrms",
      "MEMBER",
      scopesOf(permissions),
      ["HR"],
    );
    const topLevelHrefs = groups.flatMap((group) =>
      group.routes.map((route) => route.href),
    );
    const hrefs = groups
      .flatMap((group) => flattenNavRoutes(group.routes))
      .map((route) => route.href);

    expect(topLevelHrefs).toEqual([
      "/hr",
      "/hr/employees",
      "/hr/attendance",
      "/hr/leaves",
      "/hr/access",
    ]);
    for (const href of [
      "/hr/analytics",
      "/hr/workforce",
      "/hr/performance",
      "/hr/recruitment",
      "/hr/announcements",
      "/hr/settings/policies",
      "/hr/settings/workflows",
      "/hr/settings/templates",
      "/hr/settings/custom-fields",
      "/hr/delegations",
      "/hr/background-verification",
    ]) {
      expect(hrefs).not.toContain(href);
    }
  });

  it("keeps organization structure in Settings and HR limited to job architecture", () => {
    const groups = getNavGroupsForProduct(
      "hrms",
      "MEMBER",
      scopesOf(["hr:employees:view"]),
      ["HR"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const jobArchitecture = routes.find((route) => route.href === "/hr/org");
    const hubSource = readFileSync(
      resolve(process.cwd(), "features", "hr", "org", "org-hub-client.tsx"),
      "utf8",
    );
    const hooksSource = readFileSync(
      resolve(process.cwd(), "hooks", "api", "hr", "hr-org.ts"),
      "utf8",
    );

    expect(jobArchitecture?.label).toBe("Job Architecture");
    expect(hubSource).toContain('const VALID_TABS = ["roles", "levels"]');
    expect(hubSource).not.toMatch(/DepartmentsTab|useOrgLocations|useOrgTeams/);
    expect(hooksSource).not.toMatch(/\/hr\/org\/(locations|teams)/);
  });

  it("does not treat employee-record access as HR analytics access", () => {
    expect(hrefsFor("hrms", ["hr:employees:view"])).not.toContain(
      "/hr/analytics",
    );
    expect(hrefsFor("hrms", ["hr:analytics:read"])).toContain(
      "/hr/analytics",
    );
  });

  it("keeps an authorized child without exposing its unauthorized parent", () => {
    const hrefs = hrefsFor("hrms", ["hr:safety:view"]);

    expect(hrefs).toContain("/hr/safety");
    expect(hrefs).not.toContain("/hr/compliance");
  });

  it("lands a product on the first route the member can actually open", () => {
    const groups = getNavGroupsForProduct(
      "hrms",
      "MEMBER",
      scopesOf(["hr:access:view"]),
      ["HR"],
    );

    expect(getAccessibleProductHref(groups, "/hr")).toBe("/hr/access");
  });

  it.each(ACCESS_ONLY_CASES)(
    "shows only the %s access screen for an access-only role",
    (product, permission, accessHref) => {
      expect(hrefsFor(product, [permission])).toEqual([accessHref]);
    },
  );

  it("hides protected product navigation when no product permission is granted", () => {
    for (const [product] of ACCESS_ONLY_CASES) {
      expect(hrefsFor(product, [])).toEqual([]);
    }
  });

  it("keeps every server-gated page aligned with its navigation permission", () => {
    const routePermissions = new Map<string, string[]>();

    function collectRoutes(
      routes: NavRoute[],
      inheritedPermission: string | string[] | undefined,
    ): void {
      for (const route of routes) {
        const effectivePermission =
          route.requiredPermission ?? inheritedPermission;
        if (effectivePermission) {
          routePermissions.set(
            route.href,
            Array.isArray(effectivePermission)
              ? effectivePermission
              : [effectivePermission],
          );
        }
        collectRoutes(route.children ?? [], effectivePermission);
      }
    }

    for (const group of NAV_GROUPS) {
      collectRoutes(group.routes, group.requiredPermission);
    }

    const mismatches: string[] = [];
    for (const [href, navigationPermissions] of routePermissions) {
      const pagePath = resolve(
        process.cwd(),
        "app",
        "(authenticated)",
        ...href.split("/").filter(Boolean),
        "page.tsx",
      );
      if (!existsSync(pagePath)) continue;

      const source = readFileSync(pagePath, "utf8");
      const permissionCall = source.match(
        /requirePermission\(\s*(\[[\s\S]*?\]|["'][^"']+["'])/,
      );
      if (!permissionCall) continue;

      const pagePermissions = [
        ...permissionCall[1].matchAll(/["']([^"']+)["']/g),
      ].map((match) => match[1]);
      if (
        !navigationPermissions.some((permission) =>
          pagePermissions.includes(permission),
        )
      ) {
        mismatches.push(
          `${href}: nav=${navigationPermissions.join("|")} page=${pagePermissions.join("|")}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });
});
