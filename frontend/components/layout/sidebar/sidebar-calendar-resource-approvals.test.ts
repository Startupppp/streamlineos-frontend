import { flattenNavRoutes, getNavGroupsForModule } from "./sidebar-nav-items";

const approvalPath = "/calendar/resource-approvals";

it("shows the combined Calendar entry to an Inventory warehouse manager without Calendar read", () => {
  const groups = getNavGroupsForModule("home", "MEMBER", { "inventory:warehouses:manage": "all" }, ["calendar", "inventory"]);
  const routes = groups.flatMap((group) => flattenNavRoutes(group.routes));
  const hrefs = routes.map((route) => route.href);

  expect(routes).toContainEqual(expect.objectContaining({ href: "/calendar", label: "Calendar" }));
  expect(hrefs).not.toContain(approvalPath);
});

it("keeps a single Calendar entry for a reader without owner management rights", () => {
  const groups = getNavGroupsForModule("home", "MEMBER", { "calendar:read": "all" }, ["calendar", "inventory"]);
  const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

  expect(hrefs).toContain("/calendar");
  expect(hrefs).not.toContain(approvalPath);
});
