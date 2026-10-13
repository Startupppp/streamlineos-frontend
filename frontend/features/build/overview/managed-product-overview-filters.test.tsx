import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ManagedProductOverviewFilters } from "./managed-product-overview-filters";

let measuredWidth = 936;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => measuredWidth,
  });
});

afterAll(() => {
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

function renderFilters(width: number, isFiltered = false) {
  measuredWidth = width;
  return render(
    <TooltipProvider>
      <ManagedProductOverviewFilters
        rawPeriod={null}
        teamSelectValue="all"
        initiativeStatus="all"
        segmentSelectValue="all"
        teamOptions={[{ value: "all", label: "All teams" }]}
        segmentOptions={[{ value: "all", label: "All segments" }]}
        from={undefined}
        to={undefined}
        isFiltered={isFiltered}
        onPeriodChange={jest.fn()}
        onTeamChange={jest.fn()}
        onInitiativeStatusChange={jest.fn()}
        onSegmentChange={jest.fn()}
        onDateRangeChange={jest.fn()}
        onClearFilters={jest.fn()}
      />
    </TooltipProvider>,
  );
}

describe("ManagedProductOverviewFilters responsive overflow", () => {
  it("keeps visible controls in one non-wrapping row", () => {
    const { container } = renderFilters(375);

    expect(container.firstElementChild).toHaveClass("flex-nowrap");
    expect(container.firstElementChild?.childElementCount).toBe(3);
    expect(screen.getByRole("button", { name: "More filters" })).toBeInTheDocument();
  });

  it("moves the date range into the filter popover when the row cannot fit it", () => {
    renderFilters(746);

    expect(screen.queryByRole("button", { name: "Pick a date range" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More filters" }));
    expect(screen.getByRole("button", { name: "Pick a date range" })).toBeInTheDocument();
  });

  it("shows every filter inline when all controls fit", () => {
    renderFilters(936);

    expect(screen.getByRole("button", { name: "Pick a date range" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More filters" })).not.toBeInTheDocument();
  });

  it("reserves space for clear and exposes displaced controls through the icon trigger", () => {
    renderFilters(936, true);

    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pick a date range" })).not.toBeInTheDocument();
  });
});
