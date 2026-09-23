import {
  buildToolbarLayout,
  type BuildToolbarFilter,
  type BuildToolbarSearch,
} from "./build-list-toolbar-layout";

function filter(id: string, active = false): BuildToolbarFilter {
  return { id, label: id, control: null, active };
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
  it("leaves a lone filter inline so it fills the mobile row", () => {
    const layout = buildToolbarLayout({ filters: [filter("status")] });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
  });

  it("leaves search plus one filter inline as two equal columns", () => {
    const layout = buildToolbarLayout({ search, filters: [filter("status")] });
    expect(layout.collapse).toBe(false);
    expect(collapsedIds(layout)).toEqual([]);
  });

  it("collapses every filter behind the drawer once search plus two exist", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status"), filter("severity")],
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["status", "severity"]);
  });

  it("keeps the most general filter visible when there is no search", () => {
    const layout = buildToolbarLayout({
      filters: [filter("status"), filter("severity"), filter("owner")],
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["severity", "owner"]);
  });

  it("collapses when a trailing control would otherwise make a third slot", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status")],
      trailing: true,
    });
    expect(layout.collapse).toBe(true);
    expect(collapsedIds(layout)).toEqual(["status"]);
  });

  it("counts only the active filters the drawer hides", () => {
    const layout = buildToolbarLayout({
      search,
      filters: [filter("status", true), filter("severity"), filter("owner", true)],
    });
    expect(layout.collapsedActiveCount).toBe(2);
    expect(layout.activeCount).toBe(2);
  });

  it("treats a typed search as active so Clear all can appear", () => {
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
