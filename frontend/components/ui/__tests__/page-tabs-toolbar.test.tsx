import { render, screen } from "@testing-library/react";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";

describe("PageTabsToolbar responsive layout", () => {
  it("keeps labeled tabs and search together, with filters in the trailing controls", () => {
    const { container } = render(
      <PageTabsToolbar
        tabs={<button type="button">List</button>}
        search={<input aria-label="Search work" />}
        filters={<button type="button">Status</button>}
        actions={<button type="button">Create</button>}
      />,
    );

    const toolbar = container.querySelector('[data-slot="page-tabs-toolbar"]');
    const tabs = container.querySelector('[data-slot="page-tabs-toolbar-tabs"]');
    const search = container.querySelector('[data-slot="page-tabs-toolbar-search"]');
    const controls = container.querySelector(
      '[data-slot="page-tabs-toolbar-controls"]',
    );

    expect(toolbar).toHaveClass(
      "flex-col",
      "md:flex-row",
      "md:flex-nowrap",
      "md:items-center",
    );
    expect(tabs).toContainElement(search as HTMLElement);
    expect(tabs).toHaveClass("flex", "items-center", "gap-2");
    expect(controls).toHaveClass("flex", "flex-wrap", "md:ml-auto", "md:flex-nowrap");
    expect(controls).not.toContainElement(search as HTMLElement);
  });

  it("keeps the compact Filters trigger named and available below its collapse point", () => {
    render(
      <PageTabsToolbar
        tabs={<button type="button">List</button>}
        filters={<button type="button">Status</button>}
        collapseBelow="lg"
      />,
    );

    const filtersTrigger = screen.getByRole("button", { name: "Filters" });
    expect(filtersTrigger).toHaveClass("lg:hidden");
  });

  it("does not add a duplicate compact trigger when filters stay inline", () => {
    render(
      <PageTabsToolbar
        tabs={<button type="button">List</button>}
        filters={<button type="button">Status</button>}
        filtersAlwaysVisible
      />,
    );

    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
  });

  it("keeps primary filters inline and parks the rest behind Filters", () => {
    render(
      <PageTabsToolbar
        tabs={<button type="button">List</button>}
        primaryFilters={<button type="button">Status</button>}
        filters={<button type="button">Department</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).not.toHaveClass("md:hidden");
    expect(screen.queryByRole("button", { name: "Department" })).not.toBeInTheDocument();
  });
});
