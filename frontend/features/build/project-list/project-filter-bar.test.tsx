import { render, screen } from "@testing-library/react";
import { ProjectFilterBar } from "./project-filter-bar";
import { useBuildMembers } from "@/hooks/api/build/build-members";

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

const mockUseBuildMembers = useBuildMembers as jest.Mock;

describe("ProjectFilterBar", () => {
  it("shows labeled, full-width mobile actions for filters and display", () => {
    mockUseBuildMembers.mockReturnValue({ data: { data: [] } });

    render(
      <ProjectFilterBar
        search=""
        onSearchChange={jest.fn()}
        viewMode="grid"
        onViewModeChange={jest.fn()}
        filters={{}}
        onFiltersChange={jest.fn()}
        prefs={{
          showSummary: false,
          showStatus: true,
          showPriority: true,
          showHealth: false,
          showLead: true,
          showMembers: false,
          showTeams: false,
          showTargetDate: true,
          showStartDate: false,
          showProgress: true,
          showIssueCount: true,
          showClosed: false,
          groupBy: "none",
          orderBy: "name",
          orderDir: "asc",
        }}
        onTogglePrefs={jest.fn()}
        onSetPrefs={jest.fn()}
        onToggleGroupingSidebar={jest.fn()}
      />,
    );

    expect(screen.getByText("Filters")).toHaveClass("max-md:inline");
    expect(screen.getByText("Display")).toHaveClass("max-md:inline");
    expect(
      screen.getByRole("button", { name: "Display" }).closest(
        '[data-slot="build-toolbar-actions"]',
      ),
    ).toHaveClass("max-md:w-full", "max-md:justify-between");
  });
});
