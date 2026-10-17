import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_DISPLAY_OPTIONS } from "@/features/build/views/display-options-model";

let mockIsBelowLg = false;

jest.mock("@/hooks/common/use-after-load", () => ({
  useAfterLoad: () => true,
}));

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => mockIsBelowLg,
  useIsBelowLg: () => mockIsBelowLg,
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({
    tabs,
    search,
    className,
    searchClassName,
  }: {
    tabs: ReactNode;
    search: ReactNode;
    className?: string;
    searchClassName?: string;
  }) => (
    <div
      data-testid="tabs-toolbar"
      className={className}
      data-search-class-name={searchClassName}
    >
      <div>{tabs}</div>
      <div>{search}</div>
    </div>
  ),
}));

jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: ({
    showSearch = true,
    showFilters = true,
    desktopIconOnlyFilters = false,
    collapsibleSearch = false,
    searchExpanded = true,
    trailing,
  }: {
    showSearch?: boolean;
    showFilters?: boolean;
    desktopIconOnlyFilters?: boolean;
    collapsibleSearch?: boolean;
    searchExpanded?: boolean;
    trailing?: ReactNode;
  }) => (
    <div
      data-testid={showSearch ? "search-filter-bar" : "filter-only-bar"}
      data-desktop-icon-only={desktopIconOnlyFilters}
      data-collapsible-search={collapsibleSearch}
      data-search-expanded={searchExpanded}
    >
      {showFilters ? <button type="button" aria-label="Filters" /> : null}
      {showSearch ? <input type="search" aria-label="Search tickets" /> : null}
      {trailing}
    </div>
  ),
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => <div data-testid="view-switcher" />,
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: ({ iconOnly = false }: { iconOnly?: boolean }) => (
    <button type="button" aria-label="Display options" data-icon-only={iconOnly} />
  ),
}));

jest.mock("@/features/build/views/display-options-content", () => ({
  DisplayOptionsContent: () => <div data-testid="display-options-content" />,
}));

jest.mock("./my-work-sort-control", () => ({
  MyWorkSortControl: () => <div data-testid="sort-control" />,
}));

import { MyWorkTicketsFilters } from "./my-work-sections";

const noop = jest.fn();

function renderFilters() {
  return render(
    <MyWorkTicketsFilters
      activeTab="assigned"
      activeView="list"
      hasActiveFilters={false}
      showViewSwitcher
      sortField="updated"
      sortDirection="desc"
      orgStates={[]}
      displayOptions={DEFAULT_DISPLAY_OPTIONS}
      showGroupingSidebar={false}
      searchInputRef={{ current: null }}
      onTabChange={noop}
      onSortChange={noop}
      onViewChange={noop}
      onDisplayOptionsChange={noop}
      onToggleSidebar={noop}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsBelowLg = false;
});

describe("My Work responsive toolbar", () => {
  it("keeps scope and filters in row one, search and options in row two until desktop", async () => {
    mockIsBelowLg = true;
    renderFilters();

    const toolbar = screen.getByTestId("tabs-toolbar");
    const scope = await screen.findByRole("combobox", { name: "Work scope" });
    const filters = screen.getByRole("button", { name: "Filters" });
    const search = screen.getByRole("searchbox", { name: "Search tickets" });
    const moreOptions = screen.getByRole("button", { name: "More options" });

    expect(toolbar).toHaveClass("flex-col", "items-stretch");
    expect(toolbar).toHaveClass("lg:flex-row", "lg:flex-nowrap", "lg:items-center");
    expect(toolbar).toHaveAttribute(
      "data-search-class-name",
      expect.stringContaining("!flex-none !basis-auto"),
    );
    expect(scope.parentElement).toContainElement(filters);
    expect(screen.getByTestId("search-filter-bar")).toContainElement(search);
    expect(screen.getByTestId("search-filter-bar")).toHaveAttribute(
      "data-collapsible-search",
      "false",
    );
    expect(screen.getByTestId("search-filter-bar")).toHaveAttribute(
      "data-search-expanded",
      "true",
    );
    expect(scope.parentElement).toContainElement(moreOptions);
    expect(screen.getByTestId("search-filter-bar")).not.toContainElement(moreOptions);
    expect(screen.getByTestId("search-filter-bar")).not.toContainElement(filters);
    expect(screen.getByTestId("filter-only-bar")).not.toContainElement(search);
  });

  it("opens one More drawer with direct sort and presentation controls", () => {
    mockIsBelowLg = true;
    renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByTestId("sort-control")).toBeInTheDocument();
    expect(screen.getByText("Sort", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("View", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Display", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByTestId("display-options-content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Display options" })).not.toBeInTheDocument();
  });

  it("keeps sort, view, display and grouping inline in the desktop row", () => {
    renderFilters();

    expect(screen.getByTestId("tabs-toolbar")).not.toHaveClass(
      "rounded-xl",
      "border",
      "bg-card/55",
      "p-2",
      "shadow-sm",
    );
    expect(screen.getByTestId("filter-only-bar")).toHaveAttribute(
      "data-desktop-icon-only",
      "true",
    );
    expect(screen.queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
    expect(screen.getByTestId("desktop-work-actions")).toBeInTheDocument();
    expect(screen.getByTestId("search-filter-bar")).toHaveAttribute(
      "data-collapsible-search",
      "true",
    );
    expect(screen.getByTestId("search-filter-bar")).toHaveAttribute(
      "data-search-expanded",
      "false",
    );
    expect(screen.getByTestId("sort-control")).toBeInTheDocument();
    expect(screen.getByTestId("view-switcher")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Display options" })).toHaveAttribute(
      "data-icon-only",
      "true",
    );
    expect(screen.getByRole("button", { name: "Toggle grouping sidebar" })).toBeInTheDocument();
  });
});
