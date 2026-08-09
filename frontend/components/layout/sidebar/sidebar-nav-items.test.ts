import {
  flattenNavRoutes,
  getNavGroupsForProduct,
  getProductFromPathname,
  isNavRouteActive,
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
