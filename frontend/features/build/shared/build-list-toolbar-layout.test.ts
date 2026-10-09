import {
  buildToolbarLayout,
  isToolbarMobileSearchExpanded,
  toolbarDrawerVisibility,
  toolbarInlineVisibility,
  toolbarMoreButtonClass,
  type BuildToolbarFilter,
  type BuildToolbarSearch,
} from "./build-list-toolbar-layout";

function filter(id: string, active = false): BuildToolbarFilter {
  return { id, label: id, control: null, active };
}

function triggerFilter(id: string, active = false): BuildToolbarFilter {
  return { id, label: id, control: null, active, presentation: "trigger" };
}

const search: BuildToolbarSearch = {
  value: "",
  onValueChange: () => undefined,
  placeholder: "Search…",
};

function collapsedIds(layout: ReturnType<typeof buildToolbarLayout>): string[] {
  return layout.filters.filter((e) => e.collapsed).map((e) => e.filter.id);
}

describe("Build adaptive filter layout", () => {
  it("keeps a lone filter available to desktop without assigning it a mobile slot", () => {
    const layout = buildToolbarLayout({ filters: [filter("status")] });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
    expect(layout.mobileColumns).toBe("");
  });

  it("leaves search plus one filter inline as search-grow plus a compact control", () => {
    const layout = buildToolbarLayout({ search, filters: [filter("status")] });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
    expect(layout.mobileColumns).toBe("");
  });

  it("collapses every field filter behind the drawer once search plus two exist", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status"), filter("severity")],
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["status", "severity"]);
    expect(layout.mobileColumns).toBe("");
  });

  it("keeps the most general filter visible when there is no search", () => {
    const layout = buildToolbarLayout({
      filters: [filter("status"), filter("severity"), filter("owner")],
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["severity", "owner"]);
  });

  it("routes two filters through the mobile drawer instead of sharing the row", () => {
    const layout = buildToolbarLayout({
      filters: [filter("status"), filter("severity")],
    });
    expect(layout.collapse).toBe(false);
    expect(layout.mobileColumns).toBe("");
  });

  it("does not collapse a single field filter when trailing is present", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status")],
      trailing: true,
    });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
  });

  it("keeps trigger filters on the toolbar even when trailing would have filled a third slot", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [triggerFilter("filters")],
      trailing: true,
    });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
    expect(layout.fieldFilterCount).toBe(0);
  });

  it("collapses only field filters while trigger filters stay inline", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [
        triggerFilter("filters"),
        filter("status"),
        filter("severity"),
      ],
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["status", "severity"]);
    expect(layout.filters.find((e) => e.filter.id === "filters")?.collapsed).toBe(
      false,
    );
  });

  it("counts only the active filters the drawer hides", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status", true), filter("severity"), filter("owner", true)],
    });
    expect(layout.collapsedActiveCount).toBe(2);
    expect(layout.activeCount).toBe(2);
  });

  it("treats a typed search as active for the drawer clear path", () => {
    const layout = buildToolbarLayout({
      search: { ...search, value: "login" },
      filters: [filter("status")],
    });
    expect(layout.anyActive).toBe(true);
  });

  it("reports nothing active on a pristine toolbar", () => {
    const layout = buildToolbarLayout({ search, filters: [filter("status")] });
    expect(layout.anyActive).toBe(false);
  });
});

describe("isToolbarMobileSearchExpanded", () => {
  it("expands mobile search only while focused and restores actions after nonempty blur", () => {
    expect(
      isToolbarMobileSearchExpanded({ isMobile: true, focused: true }),
    ).toBe(true);
    expect(
      isToolbarMobileSearchExpanded({
        isMobile: true,
        focused: false,
      }),
    ).toBe(false);
  });

  it("stays collapsed on desktop and when mobile search is idle and empty", () => {
    expect(
      isToolbarMobileSearchExpanded({ isMobile: false, focused: true }),
    ).toBe(false);
    expect(
      isToolbarMobileSearchExpanded({ isMobile: true, focused: false }),
    ).toBe(false);
  });
});

describe("toolbar viewport visibility", () => {
  it("hides every direct field trigger on mobile while preserving desktop breakpoints", () => {
    expect(toolbarInlineVisibility(0, false, 1)).toContain("max-md:hidden");
    expect(toolbarInlineVisibility(1, false, 2)).toContain("max-md:hidden");
    expect(toolbarInlineVisibility(2, true, 3)).toContain("lg:block");
    expect(toolbarInlineVisibility(3, true, 4)).toContain("xl:block");
    expect(toolbarInlineVisibility(4, true, 5)).toContain("2xl:block");
  });

  it("keeps two or more overflow filters in the drawer until their wide breakpoint", () => {
    expect(toolbarInlineVisibility(1, true, 3)).toContain("lg:block");
    expect(toolbarInlineVisibility(2, true, 4)).toContain("xl:block");
    expect(toolbarInlineVisibility(3, true, 5)).toContain("2xl:block");
  });

  it("shows drawer fields on mobile and hides them wherever direct desktop controls are visible", () => {
    expect(toolbarDrawerVisibility(0, false, 2)).toBe("md:hidden");
    expect(toolbarDrawerVisibility(0, true, 3)).toBe("md:hidden");
    expect(toolbarDrawerVisibility(1, false, 2)).toBe("md:hidden");
    expect(toolbarDrawerVisibility(2, true, 3)).toBe("lg:hidden");
  });

  it("shows Filters for every mobile field filter and retains wider overflow breakpoints", () => {
    expect(toolbarMoreButtonClass(1, false)).toContain("md:hidden");
    expect(toolbarMoreButtonClass(2, false)).toContain("md:hidden");
    expect(toolbarMoreButtonClass(3, true)).toContain("lg:hidden");
    expect(toolbarMoreButtonClass(4, true)).toContain("xl:hidden");
    expect(toolbarMoreButtonClass(5, true)).toContain("2xl:hidden");
    expect(toolbarMoreButtonClass(6, true)).not.toContain("2xl:hidden");
  });
});
