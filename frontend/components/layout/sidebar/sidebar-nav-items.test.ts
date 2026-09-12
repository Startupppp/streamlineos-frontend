import {
  flattenNavRoutes,
  getNavGroupsForProduct,
  getProductFromPathname,
  isNavRouteActive,
  NAV_GROUPS,
} from "./sidebar-nav-items";
import { MANIFEST } from "@/lib/module-manifest";

function scopesOf(keys: readonly string[]): Record<string, "all"> {
  return Object.fromEntries(keys.map((key) => [key, "all" as const]));
}

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
  "self:onboarding-tasks",
  "self:recruitment",
  "directory:people:view",
];

describe("Home employee navigation", () => {
  it("keeps universal self-service visible without any granted permission (module state is irrelevant)", () => {
    const homeRoutes = getNavGroupsForProduct("home", "MEMBER", scopesOf([]), ["build"])
      .flatMap((group) => flattenNavRoutes(group.routes));
    const knowledgeRoutes = getNavGroupsForProduct(
      "documents",
      "MEMBER",
      scopesOf([]),
      ["build"],
    ).flatMap((group) => flattenNavRoutes(group.routes));

    expect(homeRoutes.map((route) => route.href)).toContain("/dashboard");
    expect(homeRoutes.map((route) => route.href)).toContain("/me/documents");
    expect(homeRoutes.map((route) => route.href)).toContain("/me/onboarding");
    expect(homeRoutes.map((route) => route.href)).not.toContain("/directory/workers");
    expect(knowledgeRoutes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/knowledge/chat", "/knowledge/wiki"]),
    );
  });

  it("shows permissioned self-service in Home regardless of module enablement", () => {
    const groups = getNavGroupsForProduct(
      "home",
      "MEMBER",
      scopesOf(EMPLOYEE_PERMISSIONS),
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
        "/me/onboarding",
        "/me/recruitment",
      ]),
    );
    expect(hrefs).not.toContain("/hr/recruitment/interviews");
    expect(hrefs).not.toContain("/build/my-work");
    expect(hrefs).not.toContain("/build");
    expect(routes.find((route) => route.href === "/me/documents")?.module).toBeUndefined();
  });

  it("keeps employee self-service routes in the Home product", () => {
    expect(getProductFromPathname("/me/time-off")).toBe("home");
    expect(getProductFromPathname("/me/attendance")).toBe("home");
    expect(getProductFromPathname("/me/expenses")).toBe("home");
    expect(getProductFromPathname("/me/pay")).toBe("home");
    expect(getProductFromPathname("/me/documents")).toBe("home");
    expect(getProductFromPathname("/me/onboarding")).toBe("home");
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
      scopesOf([]),
      ["hr"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const account = routes.find((route) => route.href === "/settings");
    const orgSettings = routes.find(
      (route) => route.href === "/settings/organization",
    );
    const directory = routes.find(
      (route) => route.href === "/directory/settings",
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
        isNavRouteActive(directory, "/directory/settings/person-1"),
    ).toBe(true);
  });

  it("keeps directory-settings routes inside Administration", () => {
    expect(getProductFromPathname("/directory/settings")).toBe(
      "administration",
    );
    expect(getProductFromPathname("/directory/settings/person-1")).toBe(
      "administration",
    );
  });

  it("lists organization structure as the base route with flat entity links", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      scopesOf([]),
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

  // OrgHierarchyController carries no @RequireModule, so gating this nav on HRMS hid a working surface.
  it("keeps organization structure available when HR is not enabled", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      scopesOf([]),
      ["build"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(groups.some((group) => group.label === "Organization")).toBe(true);
    expect(hrefs).toContain("/settings/organization/cost-centers");
    expect(hrefs).not.toContain("/directory/workers");
    expect(hrefs).toContain("/directory/settings");
    expect(hrefs).toContain("/settings/users");
  });

  it("shows operational workers in Home when payroll is enabled without HR", () => {
    const groups = getNavGroupsForProduct(
      "home",
      "OWNER",
      scopesOf([]),
      ["payroll"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(hrefs).toContain("/directory/workers");
    expect(hrefs).not.toContain("/directory/settings/workers");
  });

  it("shows AI Credits to its permission without requiring settings management", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "MEMBER",
      scopesOf(["billing:ai-credits:view"]),
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
      scopesOf(["party:parties:view"]),
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

describe("module-gate completeness", () => {
  // Modules that have a dedicated sidebar product key and are gated via that product.
  // They don't need a NavGroup.module because the product itself carries the gating.
  const PRODUCT_KEYED_MODULE_IDS = new Set(
    MANIFEST.modules
      .filter((m) => m.productKey !== null)
      .map((m) => m.id),
  );
  // Platform-internal manifest modules that are always enabled (no @RequireModule gate).
  // These share a permission prefix with admin groups but never gate a nav group.
  const ALWAYS_ENABLED_MODULE_IDS = new Set([
    "billing", "calendar", "directory", "mail", "notifications",
    "settings", "tasks", "feedbucket",
  ]);

  it("every nav group gated on an independently-enabled module permission carries a module property", () => {
    const violations: string[] = [];
    for (const group of NAV_GROUPS) {
      const perm = group.requiredPermission;
      if (!perm) continue;
      const permStr = Array.isArray(perm) ? perm[0] : perm;
      const modulePrefix = permStr.split(":")[0] ?? "";
      // Skip if the module prefix has a product key (gating handled at the product level)
      // or is a platform-internal service that is always available.
      if (PRODUCT_KEYED_MODULE_IDS.has(modulePrefix)) continue;
      if (ALWAYS_ENABLED_MODULE_IDS.has(modulePrefix)) continue;
      // Any remaining manifest module with no product key and no always-enabled exemption
      // must gate its nav group via the module property so disabled tenants don't see it.
      const isManifestModule = MANIFEST.modules.some((m) => m.id === modulePrefix);
      if (!isManifestModule) continue;
      if (!group.module)
        violations.push(`"${group.label}" (product=${group.product}) requires "${permStr}" but has no module property`);
    }
    expect(violations).toEqual([]);
  });
});
