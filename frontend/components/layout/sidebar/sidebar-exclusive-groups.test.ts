import {
  allGroupsOpen,
  exclusiveCollapsedGroups,
  isSidebarGroupOpen,
  mergeCollapsedGroups,
  resolveExclusiveOpenLabel,
  toggleCollapsedGroup,
} from "./sidebar-exclusive-groups";

describe("sidebar exclusive groups", () => {
  it("opens exactly one label and collapses the rest", () => {
    expect(exclusiveCollapsedGroups(["Library", "Manage"], "Manage")).toEqual({
      Library: true,
      Manage: false,
    });
  });

  it("collapses every label when nothing is open", () => {
    expect(exclusiveCollapsedGroups(["Library", "Manage"], null)).toEqual({
      Library: true,
      Manage: true,
    });
  });

  it("treats a missing key as open for migration from the old multi-open map", () => {
    expect(isSidebarGroupOpen({}, "Library")).toBe(true);
    expect(isSidebarGroupOpen({ Library: true }, "Library")).toBe(false);
  });

  it("prefers the active route group, otherwise the first already-open group", () => {
    expect(
      resolveExclusiveOpenLabel(
        ["Library", "Manage"],
        { Library: false, Manage: false },
        "Manage",
      ),
    ).toBe("Manage");
    expect(
      resolveExclusiveOpenLabel(
        ["Library", "Manage"],
        { Library: true, Manage: false },
        null,
      ),
    ).toBe("Manage");
  });
});

describe("sidebar multi-open groups", () => {
  it("defaults every group to open", () => {
    expect(allGroupsOpen(["Overview", "For Me"])).toEqual({
      Overview: false,
      "For Me": false,
    });
  });

  it("keeps stored collapses and opens unknown labels", () => {
    expect(
      mergeCollapsedGroups(["Overview", "For Me", "Company"], {
        Overview: true,
        Stale: true,
      }),
    ).toEqual({
      Overview: true,
      "For Me": false,
      Company: false,
    });
  });

  it("toggles one group without closing the others", () => {
    expect(
      toggleCollapsedGroup(
        { Overview: false, "For Me": false, Company: false },
        "For Me",
      ),
    ).toEqual({
      Overview: false,
      "For Me": true,
      Company: false,
    });
  });
});
