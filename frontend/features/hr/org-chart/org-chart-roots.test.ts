import {
  splitOrgChartRoots,
  topLevelRootsHeading,
  unassignedRootsHeading,
} from "./org-chart-roots";
import type { OrgChartNode } from "./types";

function node(id: string, overrides: Partial<OrgChartNode> = {}): OrgChartNode {
  return {
    id,
    name: id,
    role: "Employee",
    designation: null,
    image: null,
    departmentId: null,
    departmentName: null,
    hasDirectReports: false,
    ...overrides,
  };
}

describe("splitOrgChartRoots", () => {
  it("puts the owner alone at the top and never beside an unmanaged hire who happens to have reports", () => {
    const { owner, topLevel, unassigned } = splitOrgChartRoots([
      node("founder", { isOwner: true, isTopLevel: true, hasDirectReports: true }),
      // Nobody placed them at the top; they just picked up a report and have
      // no manager themselves. This is the fake second CEO.
      node("new-hire", {
        isOwner: false,
        isTopLevel: false,
        hasDirectReports: true,
      }),
    ]);

    expect(owner.map((n) => n.id)).toEqual(["founder"]);
    expect(topLevel).toEqual([]);
    expect(unassigned.map((n) => n.id)).toEqual(["new-hire"]);
  });

  it("separates a deliberate top-level role from someone who is merely missing a manager", () => {
    const { owner, topLevel, unassigned } = splitOrgChartRoots([
      node("cto", { isOwner: false, isTopLevel: true, hasDirectReports: true }),
      node("contractor", {
        isOwner: false,
        isTopLevel: false,
        hasDirectReports: false,
      }),
    ]);

    expect(owner).toEqual([]);
    expect(topLevel.map((n) => n.id)).toEqual(["cto"]);
    expect(unassigned.map((n) => n.id)).toEqual(["contractor"]);
  });

  it("keeps the owner out of the deliberate top-level group even when both flags are set", () => {
    const { owner, topLevel } = splitOrgChartRoots([
      node("founder", { isOwner: true, isTopLevel: true }),
    ]);

    expect(owner.map((n) => n.id)).toEqual(["founder"]);
    expect(topLevel).toEqual([]);
  });

  it("falls back to hasDirectReports only when the server sends neither placement flag", () => {
    const { owner, topLevel, unassigned } = splitOrgChartRoots([
      node("legacy-manager", { hasDirectReports: true }),
      node("legacy-hire", { hasDirectReports: false }),
    ]);

    expect(owner).toEqual([]);
    expect(topLevel.map((n) => n.id)).toEqual(["legacy-manager"]);
    expect(unassigned.map((n) => n.id)).toEqual(["legacy-hire"]);
  });

  it("preserves the order the server returned within each group so cursor paging stays stable", () => {
    const { topLevel, unassigned } = splitOrgChartRoots([
      node("a", { isTopLevel: false }),
      node("b", { isTopLevel: true }),
      node("c", { isTopLevel: false }),
      node("d", { isTopLevel: true }),
    ]);

    expect(topLevel.map((n) => n.id)).toEqual(["b", "d"]);
    expect(unassigned.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("returns all three groups empty for an empty page rather than throwing", () => {
    expect(splitOrgChartRoots([])).toEqual({
      owner: [],
      topLevel: [],
      unassigned: [],
    });
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

describe("topLevelRootsHeading", () => {
  it("says the placement was deliberate, so the group does not read as an omission", () => {
    expect(topLevelRootsHeading().title).toBe("Top-level roles");
    expect(topLevelRootsHeading().description).toContain("deliberately");
  });
});
