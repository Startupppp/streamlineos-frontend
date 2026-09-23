import { getNavGroupsForProduct } from "./sidebar-nav-items";

it("keeps a plan-locked destination visible so the owner can discover and buy it", () => {
  const groups = getNavGroupsForProduct("payroll", "OWNER", {}, ["PAYROLL"], ["payroll"]);
  const routes = groups.flatMap((group) => group.routes);
  expect(routes.length).toBeGreaterThan(0);
  expect(routes.every((route) => route.locked === true)).toBe(true);
});

it("still removes a destination the caller has no permission for", () => {
  const groups = getNavGroupsForProduct("hrms", "MEMBER", {}, ["HR"], []);
  expect(groups.flatMap((group) => group.routes)).toEqual([]);
});

it("leaves navigation intact when the billing read returns nothing", () => {
  const groups = getNavGroupsForProduct("payroll", "OWNER", {}, ["PAYROLL"], []);
  const routes = groups.flatMap((group) => group.routes);
  expect(routes.some((route) => route.locked === true)).toBe(false);
});
