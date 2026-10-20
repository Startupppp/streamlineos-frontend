import type { NavGroup, NavRoute } from "./sidebar-nav-types";
import { presentHrGroups } from "./hr-sidebar-filter";

const Icon = () => null;

function route(partial: Pick<NavRoute, "label" | "href"> & Partial<NavRoute>): NavRoute {
  return { icon: Icon, ...partial };
}

function labels(groups: NavGroup[]): string[] {
  return groups.flatMap((group) => group.routes.map((item) => item.label));
}

const people: NavGroup = {
  label: "HR People",
  product: "hrms",
  routes: [
    route({
      label: "People",
      href: "/hr/employees",
      children: [
        route({ label: "Org Chart", href: "/hr/org-chart" }),
        route({
          label: "Positions",
          href: "/hr/positions",
          searchTerms: ["jobs", "roles"],
        }),
      ],
    }),
  ],
};

const lifecycle: NavGroup = {
  label: "Lifecycle",
  product: "hrms",
  routes: [
    route({ label: "Onboarding", href: "/hr/onboarding" }),
    route({
      label: "Exit",
      href: "/hr/exit",
      children: [
        route({ label: "Final settlement", href: "/hr/exit/fnf" }),
        route({ label: "Termination", href: "/hr/exit/termination" }),
      ],
    }),
  ],
};

describe("presentHrGroups", () => {
  it("lifts the pages of a single parent up beside it", () => {
    expect(labels(presentHrGroups([people], ""))).toEqual([
      "People",
      "Org Chart",
      "Positions",
    ]);
  });

  it("keeps a nested page under its parent when the group has siblings", () => {
    const exit = presentHrGroups([lifecycle], "settlement")[0]?.routes[0];
    expect(exit?.label).toBe("Exit");
    expect(exit?.children?.map((child) => child.label)).toEqual(["Final settlement"]);
  });

  it("matches a page by its search terms and drops the rest of the group", () => {
    expect(labels(presentHrGroups([people], "jobs"))).toEqual(["Positions"]);
  });

  it("keeps the whole group when the query matches the group name", () => {
    expect(labels(presentHrGroups([people, lifecycle], "people"))).toEqual([
      "People",
      "Org Chart",
      "Positions",
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(presentHrGroups([people, lifecycle], "payroll")).toEqual([]);
  });
});
