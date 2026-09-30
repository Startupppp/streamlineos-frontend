import { render, screen } from "@testing-library/react";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";

describe("PageTabsToolbar responsive layout", () => {
  it("keeps labeled tabs and controls in one wrapping row from tablet widths", () => {
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
    const controls = container.querySelector(
      '[data-slot="page-tabs-toolbar-controls"]',
    );

    expect(toolbar).toHaveClass(
      "flex-col",
      "md:flex-row",
      "md:flex-wrap",
      "md:items-center",
    );
    expect(tabs).toHaveClass("w-full", "md:w-auto", "md:shrink-0");
    expect(controls).toHaveClass("flex", "flex-wrap", "md:contents");
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
});
