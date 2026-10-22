import {
  flattenNavRoutes,
  getNavGroupsForModule,
  getProductFromPathname,
  isNavRouteActive,
  NAV_GROUPS,
  resolveProductSidebarChrome,
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
    const homeRoutes = getNavGroupsForModule("home", "MEMBER", scopesOf([]), ["build"])
      .flatMap((group) => flattenNavRoutes(group.routes));
    const knowledgeRoutes = getNavGroupsForModule(
      "documents",
      "MEMBER",
      scopesOf([]),
      ["build"],
    ).flatMap((group) => flattenNavRoutes(group.routes));

    expect(homeRoutes.map((route) => route.href)).toContain("/dashboard");
    expect(homeRoutes.map((route) => route.href)).toContain("/me/records");
    expect(homeRoutes.map((route) => route.href)).not.toContain("/me/workday");
    expect(homeRoutes.map((route) => route.href)).not.toContain("/me/money");
    expect(homeRoutes.map((route) => route.href)).not.toContain("/directory/workers");
    expect(knowledgeRoutes.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/knowledge/chat", "/knowledge/wiki"]),
    );
    expect(knowledgeRoutes[0]?.href).toBe("/knowledge/wiki");
    expect(knowledgeRoutes.map((route) => route.href)).not.toContain(
      "/knowledge/research-briefs",
    );
  });

  it("hides HR and payroll self-service in Home when those modules are off", () => {
    const groups = getNavGroupsForModule(
      "home",
      "MEMBER",
      scopesOf(EMPLOYEE_PERMISSIONS),
      ["build"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const hrefs = routes.map((route) => route.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/me/records",
        "/dashboard",
      ]),
    );
    expect(hrefs).not.toContain("/me/time-off");
    expect(hrefs).not.toContain("/me/attendance");
    expect(hrefs).not.toContain("/me/expenses");
    expect(hrefs).not.toContain("/me/pay");
    expect(hrefs).not.toContain("/me/onboarding");
    expect(hrefs).not.toContain("/me/recruitment");
    expect(hrefs).not.toContain("/hr/announcements");
    expect(routes.find((route) => route.href === "/me/records")?.module).toBeUndefined();
  });

  it("shows HR and payroll self-service in Home when those modules are enabled", () => {
    const groups = getNavGroupsForModule(
      "home",
      "MEMBER",
      scopesOf(EMPLOYEE_PERMISSIONS),
      ["build", "hr", "payroll"],
    );
    const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
    const hrefs = routes.map((route) => route.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/me/workday",
        "/me/money",
        "/me/records",
        "/me/career",
      ]),
    );
    expect(hrefs).not.toContain("/recruitment/interviews");
    expect(hrefs).not.toContain("/build/my-work");
    expect(hrefs).not.toContain("/build");
  });

  it("keeps owner navigation focused on shared services and operational products", () => {
    const routes = getNavGroupsForModule(
      "home",
      "OWNER",
      scopesOf(EMPLOYEE_PERMISSIONS),
      ["hr", "payroll"],
    ).flatMap((group) => flattenNavRoutes(group.routes));
    const hrefs = routes.map((route) => route.href);

    expect(hrefs).toEqual(expect.arrayContaining(["/dashboard", "/me/records", "/me/support"]));
    for (const employeeRoute of ["/me/team", "/me/workday", "/me/money", "/me/career", "/me/resignation"]) {
      expect(hrefs).not.toContain(employeeRoute);
    }
  });

  it("keeps employee self-service routes in the Home product", () => {
    expect(getProductFromPathname("/me/workday")).toBe("home");
    expect(getProductFromPathname("/me/money")).toBe("home");
    expect(getProductFromPathname("/me/records")).toBe("home");
    expect(getProductFromPathname("/me/career")).toBe("home");
    expect(getProductFromPathname("/directory")).toBe("home");
    expect(getProductFromPathname("/directory/person-1")).toBe("home");
    expect(getProductFromPathname("/directory/workers")).toBe("home");
  });
});

describe("Build route product selection", () => {
  it("keeps Build entry and specialist project paths in Build without matching lookalikes", () => {
    expect(getProductFromPathname("/build")).toBe("build");
    expect(getProductFromPathname("/build/projects")).toBe("build");
    expect(getProductFromPathname("/build/42/chat")).toBe("build");
    expect(getProductFromPathname("/build-lookalike")).toBe("home");
  });
});
describe("Administration information architecture", () => {
  it("matches the owning settings item without activating broader siblings", () => {
    const groups = getNavGroupsForModule(
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
    const groups = getNavGroupsForModule(
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

  it("keeps organization structure available when HR is not enabled", () => {
    const groups = getNavGroupsForModule(
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
    const groups = getNavGroupsForModule(
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
    const groups = getNavGroupsForModule(
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
    const groups = getNavGroupsForModule(
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
  const PRODUCT_KEYED_MODULE_IDS = new Set(
    MANIFEST.modules
      .filter((m) => m.productKey !== null)
      .map((m) => m.id),
  );
  const ALWAYS_ENABLED_MODULE_IDS = new Set([
    "billing", "calendar", "directory", "mail", "notifications",
    "settings", "tasks",
  ]);

  it("every nav group gated on an independently-enabled module permission uses product-level gating", () => {
    const violations: string[] = [];
    for (const group of NAV_GROUPS) {
      const perm = group.requiredPermission;
      if (!perm) continue;
      const permStr = Array.isArray(perm) ? perm[0] : perm;
      const modulePrefix = permStr.split(":")[0] ?? "";
      if (PRODUCT_KEYED_MODULE_IDS.has(modulePrefix)) continue;
      if (ALWAYS_ENABLED_MODULE_IDS.has(modulePrefix)) continue;
      const isManifestModule = MANIFEST.modules.some((m) => m.id === modulePrefix);
      if (!isManifestModule) continue;
      if (group.module !== modulePrefix && group.module !== "administration")
        violations.push(`"${group.label}" (module=${group.module}) requires "${permStr}" but module doesn't gate the module`);
    }
    expect(violations).toEqual([]);
  });
});

describe("resolveProductSidebarChrome", () => {
  it("shows the header collapse toggle on wiki even though the product sidebar is hidden", () => {
    expect(
      resolveProductSidebarChrome({
        sessionReady: true,
        emptyNav: false,
        isWikiPath: true,
        isPortalPath: false,
      }),
    ).toEqual({ hideSidebar: true, showSidebarToggle: true });
  });

  it("hides the toggle when there is no sidebar at all", () => {
    expect(
      resolveProductSidebarChrome({
        sessionReady: true,
        emptyNav: true,
        isWikiPath: false,
        isPortalPath: false,
      }),
    ).toEqual({ hideSidebar: true, showSidebarToggle: false });
  });

  it("hides the toggle on portal chromeless routes", () => {
    expect(
      resolveProductSidebarChrome({
        sessionReady: true,
        emptyNav: false,
        isWikiPath: false,
        isPortalPath: true,
      }),
    ).toEqual({ hideSidebar: true, showSidebarToggle: false });
  });

  it("shows the toggle when the product sidebar is visible", () => {
    expect(
      resolveProductSidebarChrome({
        sessionReady: true,
        emptyNav: false,
        isWikiPath: false,
        isPortalPath: false,
      }),
    ).toEqual({ hideSidebar: false, showSidebarToggle: true });
  });
});
