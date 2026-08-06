import {
  flattenNavRoutes,
  getNavGroupsForProduct,
  getProductFromPathname,
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
  });
});

describe("Administration information architecture", () => {
  it("lists organization structure as the base route with flat entity links", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["hr"],
    );
    const organization = groups.find((group) => group.label === "Organization");

    expect(organization?.routes.map((route) => route.href)).toEqual([
      "/organization",
      "/organization/business-units",
      "/organization/branches",
      "/organization/departments",
      "/organization/teams",
      "/organization/locations",
      "/organization/cost-centers",
      "/organization/tree",
    ]);
  });

  it("hides HR organization structure and workers when neither HR nor payroll is enabled", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["build"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(groups.some((group) => group.label === "Organization")).toBe(false);
    expect(hrefs).not.toContain("/directory/workers");
    expect(hrefs).toContain("/directory");
    expect(hrefs).toContain("/users");
  });

  it("shows workers when payroll is enabled without HR", () => {
    const groups = getNavGroupsForProduct(
      "administration",
      "OWNER",
      [],
      ["payroll"],
    );
    const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

    expect(hrefs).toContain("/directory/workers");
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
});
