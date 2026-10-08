import { fireEvent, render, screen } from "@testing-library/react";
import { AddFilterPopover } from "./add-filter-popover";
import { useBuildMembers } from "@/hooks/api/build/build-members";

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

const mockUseBuildMembers = useBuildMembers as jest.Mock;

describe("AddFilterPopover", () => {
  beforeEach(() => {
    mockUseBuildMembers.mockReturnValue({
      data: {
        data: [
          {
            id: "build-user-1",
            name: "Build Member",
            firstName: "Build",
            lastName: "Member",
            email: "build@example.com",
            image: null,
            role: "member",
            addedAt: "2026-10-08T00:00:00.000Z",
            teams: [],
          },
        ],
      },
    });
  });

  it("opens with usable status choices instead of an empty instruction panel", () => {
    render(<AddFilterPopover filters={{}} onFiltersChange={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByRole("button", { name: "In progress" })).toBeInTheDocument();
    expect(screen.queryByText("Select a filter category on the left.")).not.toBeInTheDocument();
  });

  it("filters by a Build member from the lead category", () => {
    const handleFiltersChange = jest.fn();
    render(<AddFilterPopover filters={{}} onFiltersChange={handleFiltersChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Lead" }));
    fireEvent.click(screen.getByRole("button", { name: /Build Member/ }));

    expect(handleFiltersChange).toHaveBeenCalledWith({ lead: "build-user-1" });
  });

  it("applies a start-date filter instead of rendering a backend-gap message", () => {
    const handleFiltersChange = jest.fn();
    render(
      <AddFilterPopover
        filters={{ startAfter: "2026-10-01" }}
        onFiltersChange={handleFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Start date" }));
    fireEvent.click(screen.getByRole("button", { name: "Starts on or after" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "8" }));

    expect(handleFiltersChange).toHaveBeenCalledWith({ startAfter: "2026-10-08" });
    expect(screen.queryByText(/backend gap/i)).not.toBeInTheDocument();
  });

  it("clears the target-date filter from the calendar control", () => {
    const handleFiltersChange = jest.fn();
    render(
      <AddFilterPopover
        filters={{ endBefore: "2026-10-31" }}
        onFiltersChange={handleFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Target date" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Target is on or before" }));

    expect(handleFiltersChange).toHaveBeenCalledWith({ endBefore: undefined });
  });
});
