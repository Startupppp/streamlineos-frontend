import { splitOrgChartRoots, unassignedRootsHeading } from "./org-chart-roots";
import type { OrgChartNode } from "./types";

function node(id: string, hasDirectReports: boolean): OrgChartNode {
  return {
    id,
    name: id,
    role: "Employee",
    designation: null,
    image: null,
    departmentId: null,
    departmentName: null,
    hasDirectReports,
  };
}

describe("splitOrgChartRoots", () => {
  it("keeps a hire with no manager out of the peer-root list so the chart shows one top, not several CEOs", () => {
    const { managers, unassigned } = splitOrgChartRoots([
      node("founder", true),
      node("new-hire", false),
    ]);

    expect(managers.map((m) => m.id)).toEqual(["founder"]);
    expect(unassigned.map((m) => m.id)).toEqual(["new-hire"]);
  });

  it("preserves the order the server returned within each group so cursor paging stays stable", () => {
    const { managers, unassigned } = splitOrgChartRoots([
      node("a", false),
      node("b", true),
      node("c", false),
      node("d", true),
    ]);

    expect(managers.map((m) => m.id)).toEqual(["b", "d"]);
    expect(unassigned.map((m) => m.id)).toEqual(["a", "c"]);
  });

  it("returns both groups empty for an empty page rather than throwing", () => {
    expect(splitOrgChartRoots([])).toEqual({ managers: [], unassigned: [] });
  });
});

describe("unassignedRootsHeading", () => {
  it("does not accuse anyone of missing a manager when no reporting line exists at all", () => {
    expect(unassignedRootsHeading(false).title).toBe("No reporting lines yet");
  });

  it("names the missing manager once a real structure exists above", () => {
    expect(unassignedRootsHeading(true).title).toBe("Needs a manager");
  });

  it("points at leave approvals in both states, because an absent manager is what blocks them", () => {
    expect(unassignedRootsHeading(false).description).toContain("leave approvals");
    expect(unassignedRootsHeading(true).description).toContain("approvals");
  });
});
