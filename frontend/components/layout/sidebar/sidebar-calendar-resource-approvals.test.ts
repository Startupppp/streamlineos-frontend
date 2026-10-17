import { flattenNavRoutes, getNavGroupsForProduct } from "./sidebar-nav-items";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";

const approvalPath = "/calendar/resource-approvals";

it("shows the Calendar approvals route to an Inventory warehouse manager without Calendar read", () => {
  const groups = getNavGroupsForProduct("home", "MEMBER", { "inventory:warehouses:manage": "all" }, ["calendar", "inventory"]);
  const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

  expect(hrefs).toContain(approvalPath);
  expect(resolveRouteAccess(approvalPath)).toMatchObject({
    kind: "permission",
    permission: ["calendar:admin:manage", "hr:assets:manage", "inventory:warehouses:manage"],
  });
});

it("hides the approvals route from a Calendar reader without owner management rights", () => {
  const groups = getNavGroupsForProduct("home", "MEMBER", { "calendar:read": "all" }, ["calendar", "inventory"]);
  const hrefs = groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);

  expect(hrefs).not.toContain(approvalPath);
});
