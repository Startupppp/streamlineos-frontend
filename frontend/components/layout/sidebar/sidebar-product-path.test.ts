import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import {
  NAV_GROUPS,
  PRODUCT_PATH_EXCEPTIONS,
  flattenNavRoutes,
  getProductFromPathname,
} from "./sidebar-nav-items";

const NAVIGABLE_HREFS = new Set(
  [...NAV_GROUPS, ...HOME_NAV_GROUPS]
    .flatMap((group) => flattenNavRoutes(group.routes))
    .map((route) => route.href),
);

describe("a pathname resolves to a product through the navigation model", () => {
  it("answers with the product of the longest navigation prefix that owns it", () => {
    expect(getProductFromPathname("/build/all-work")).toBe("build");
    expect(getProductFromPathname("/hr/employees/person-1")).toBe("hrms");
    expect(getProductFromPathname("/payroll/runs/42")).toBe("payroll");
    expect(getProductFromPathname("/inventory/stock/movements")).toBe(
      "inventory",
    );
  });

  it("prefers the more specific owner when two products share a prefix", () => {
    expect(getProductFromPathname("/directory")).toBe("home");
    expect(getProductFromPathname("/settings/directory")).toBe("administration");
    expect(getProductFromPathname("/hr/announcements")).toBe("home");
    expect(getProductFromPathname("/hr/employees")).toBe("hrms");
  });

  it("answers Home for the root and for any path navigation does not own", () => {
    expect(getProductFromPathname("/")).toBe("home");
    expect(getProductFromPathname("/nothing-here")).toBe("home");
  });

  // An exception that navigation has started covering is dead weight that outlives its reason.
  it("keeps no exception that the navigation model already answers", () => {
    const redundant = PRODUCT_PATH_EXCEPTIONS.filter((exception) =>
      NAVIGABLE_HREFS.has(exception.prefix),
    ).map((exception) => `${exception.prefix} -> ${exception.product}`);

    expect(redundant).toEqual([]);
  });

  it("gives every exception a reason a reader can act on", () => {
    const unexplained = PRODUCT_PATH_EXCEPTIONS.filter(
      (exception) => exception.reason.trim().length === 0,
    ).map((exception) => exception.prefix);

    expect(unexplained).toEqual([]);
  });

  it("resolves every exception to the product it declares", () => {
    for (const exception of PRODUCT_PATH_EXCEPTIONS) {
      expect(getProductFromPathname(exception.prefix)).toBe(exception.product);
    }
  });
});
