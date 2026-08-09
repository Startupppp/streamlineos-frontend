import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  flattenNavRoutes,
  getAccessibleProductHref,
  getNavGroupsForProduct,
  getProductFromPathname,
  isNavRouteActive,
  NAV_GROUPS,
  type NavRoute,
} from "./sidebar-nav-items";

const EMPLOYEE_PERMISSIONS = [
  "mail:inbox:view",
  "calendar:read",
  "chat:channels:read",
  "self:leaves",
  "self:attendance",
  "self:expenses",
  "self:payroll",
  "self:payslips",
  "self:onboarding-docs",
  "self:recruitment",
  "directory:people:view",
];

describe("Home employee navigation", () => {
  it("always exposes Home documents and Knowledge to an active member", () => {
    const homeRoutes = getNavGroupsForProduct("home", "MEMBER", [], ["build"])
      .flatMap((group) => flattenNavRoutes(group.routes));
    const knowledgeRoutes = getNavGroupsForProduct(
      "documents",
      "MEMBER",
      [],
      ["build"],
    ).flatMap((group) => flattenNavRoutes(group.routes));

    expect(homeRoutes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/dashboard", "/me/documents"]),
    );
    expect(knowledgeRoutes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/knowledge/chat", "/knowledge/wiki"]),
    );
  });

  it("keeps self-service available when only Build is enabled", () => {
    const groups = getNavGroupsForProduct(
      "home",
      "MEMBER",
      EMPLOYEE_PERMISSIONS,
      ["build"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const hrefs = routes.map((route) => route.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/me/time-off",
        "/me/attendance",
        "/me/expenses",
        "/me/pay",
        "/me/documents",
        "/me/recruitment",
      ]),
    );
    expect(hrefs).not.toContain("/hr/recruitment/interviews");
    expect(hrefs).not.toContain("/build/my-work");
    expect(hrefs).not.toContain("/build");
    expect(routes.every((route) => route.module === undefined)).toBe(true);
  });

  it("keeps employee self-service routes in the Home product", () => {
    expect(getProductFromPathname("/me/time-off")).toBe("home");
    expect(getProductFromPathname("/me/attendance")).toBe("home");
    expect(getProductFromPathname("/me/expenses")).toBe("home");
    expect(getProductFromPathname("/me/pay")).toBe("home");
    expect(getProductFromPathname("/me/documents")).toBe("home");
    expect(getProductFromPathname("/me/recruitment")).toBe("home");
    expect(getProductFromPathname("/directory")).toBe("home");
    expect(getProductFromPathname("/directory/person-1")).toBe("home");
    expect(getProductFromPathname("/directory/workers")).toBe("home");
  });
});

describe("Administration information architecture", () => {
  it("matches the owning settings item without activating broader siblings", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["hr"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const account = routes.find((route) => route.href === "/settings");
    const orgSettings = routes.find(
      (route) => route.href === "/settings/organization",
    );
    const directory = routes.find(
      (route) => route.href === "/settings/directory",
    );

    expect(account && isNavRouteActive(account, "/settings/users")).toBe(false);
    expect(
      orgSettings &&
        isNavRouteActive(
          orgSettings,
          "/settings/organization/departments",
        ),
    ).toBe(false);
    expect(
      directory &&
        isNavRouteActive(directory, "/settings/directory/person-1"),
    ).toBe(true);
  });

  it("keeps settings-owned directory routes inside Administration", () => {
    expect(getProductFromPathname("/settings/directory")).toBe(
      "administration",
    );
    expect(getProductFromPathname("/settings/directory/person-1")).toBe(
      "administration",
    );
  });

  it("lists organization structure as the base route with flat entity links", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["hr"],
    );
    const organization = groups.find((group) => group.label === "Organization");

    expect(organization?.routes.map((route) => route.href)).toEqual([
      "/settings/organization/structure",
      "/settings/organization/business-units",
      "/settings/organization/branches",
      "/settings/organization/departments",
      "/settings/organization/teams",
      "/settings/organization/locations",
      "/settings/organization/cost-centers",
      "/settings/organization/chart",
    ]);
  });

  it("hides HR organization structure when HR is not enabled", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["build"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(groups.some((group) => group.label === "Organization")).toBe(false);
    expect(hrefs).not.toContain("/directory/workers");
    expect(hrefs).toContain("/settings/directory");
    expect(hrefs).toContain("/settings/users");
  });

  it("shows operational workers in Home when payroll is enabled without HR", () => {
    const groups = getNavGroupsForProduct(
      "home",
      "OWNER",
      [],
      ["payroll"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(hrefs).toContain("/directory/workers");
    expect(hrefs).not.toContain("/settings/directory/workers");
  });

  it("shows AI Credits to its permission without requiring settings management", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "MEMBER",
      ["billing:ai-credits:view"],
      [],
    );
    const hrefs = groups
      .flatMap((group) => flattenNavRoutes(group.routes))
      .map((route) => route.href);

    expect(hrefs).toContain("/settings/billing/ai-credits");
    expect(hrefs).not.toContain("/settings/billing");
  });

  it("places business parties in CRM and classifies the route as CRM", () => {
    const groups = getNavGroupsForProduct(
      "crm",
      "MEMBER",
      ["party:parties:view"],
      ["crm"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(hrefs).toContain("/parties");
    expect(getProductFromPathname("/parties")).toBe("crm");
  });

  it("keeps operational customer invoices in Finance, not Settings", () => {
    expect(getProductFromPathname("/billing/invoices")).toBe("finance");
    expect(getProductFromPathname("/billing/invoices/invoice-1")).toBe(
      "finance",
    );
  });
});

describe("permission-aware product navigation", () => {
  const accessOnlyCases = [
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

  const hrefsFor = (
    product: Parameters<typeof getNavGroupsForProduct>[0],
    permissions: string[],
  ) =>
    getNavGroupsForProduct(product, "MEMBER", permissions, [])
      .flatMap((group) => flattenNavRoutes(group.routes))
      .map((route) => route.href);

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
      permissions,
      [],
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
      ["hr:access:view"],
      [],
    );

    expect(getAccessibleProductHref(groups, "/hr")).toBe("/hr/access");
  });

  it.each(accessOnlyCases)(
    "shows only the %s access screen for an access-only role",
    (product, permission, accessHref) => {
      expect(hrefsFor(product, [permission])).toEqual([accessHref]);
    },
  );

  it("hides protected product navigation when no product permission is granted", () => {
    for (const [product] of accessOnlyCases) {
      expect(hrefsFor(product, [])).toEqual([]);
    }
  });

  it("keeps every server-gated page aligned with its navigation permission", () => {
    const routePermissions = new Map<string, string[]>();

    function collect(
      routes: NavRoute[],
      inherited: string | string[] | undefined,
    ) {
      for (const route of routes) {
        const effective = route.requiredPermission ?? inherited;
        if (effective) {
          routePermissions.set(
            route.href,
            Array.isArray(effective) ? effective : [effective],
          );
        }
        collect(route.children ?? [], effective);
      }
    }

    for (const group of NAV_GROUPS) {
      collect(group.routes, group.requiredPermission);
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
      const call = source.match(
        /requirePermission\(\s*(\[[\s\S]*?\]|["'][^"']+["'])/,
      );
      if (!call) continue;

      const pagePermissions = [
        ...call[1].matchAll(/["']([^"']+)["']/g),
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
