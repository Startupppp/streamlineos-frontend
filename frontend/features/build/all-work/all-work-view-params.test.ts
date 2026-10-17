import { buildCurrentFilters, viewToSearchParams } from "./all-work-view-params";

describe("All Work saved-view params", () => {
  it("saves the product, team, grouping, and sort with the filters so a view reopens exactly", () => {
    const params = new URLSearchParams(
      "view=timeline&priority=HIGH&teamId=35&productId=39&scope=mine&group=status&sort=dueDate&dir=asc&cursor=abc",
    );
    expect(buildCurrentFilters(params)).toEqual({
      priority: "HIGH",
      teamId: "35",
      productId: "39",
      scope: "mine",
      group: "status",
      sort: "dueDate",
      dir: "asc",
    });
  });

  it("clears stale product and team filters when applying a view that does not set them", () => {
    const next = viewToSearchParams(
      { filters: { status: "TODO" }, layoutType: "list" },
      new URLSearchParams("teamId=35&productId=39&priority=HIGH&cursor=abc&view=board"),
    );
    expect(next.get("status")).toBe("TODO");
    expect(next.get("teamId")).toBeNull();
    expect(next.get("productId")).toBeNull();
    expect(next.get("priority")).toBeNull();
    expect(next.get("cursor")).toBeNull();
    expect(next.get("view")).toBe("list");
  });

  it.each([
    ["calendar", "calendar"],
    ["gantt", "timeline"],
  ] as const)("restores a saved %s layout as the %s view", (layoutType, view) => {
    const next = viewToSearchParams({ filters: {}, layoutType }, new URLSearchParams("view=list"));
    expect(next.get("view")).toBe(view);
  });
});
