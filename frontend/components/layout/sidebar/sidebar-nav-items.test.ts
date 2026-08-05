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
  "directory:people:view",
];

describe("Home employee navigation", () => {
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
      ]),
    );
    expect(hrefs).not.toContain("/hr/recruitment/interviews");
    expect(routes.every((route) => route.module === undefined)).toBe(true);
  });

  it("keeps employee self-service routes in the Home product", () => {
    expect(getProductFromPathname("/me/time-off")).toBe("home");
    expect(getProductFromPathname("/me/attendance")).toBe("home");
    expect(getProductFromPathname("/me/expenses")).toBe("home");
    expect(getProductFromPathname("/me/pay")).toBe("home");
    expect(getProductFromPathname("/me/documents")).toBe("home");
  });
});
