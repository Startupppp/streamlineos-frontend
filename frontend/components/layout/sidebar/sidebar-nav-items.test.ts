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
