import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { BadgesGrid, PointsLeaderboard } from "./recognition-feed";

const mockUseEngagementBadges = jest.fn();
const mockUseLeaderboard = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/engagement", () => ({
  useEngagementBadges: () => mockUseEngagementBadges(),
  useLeaderboard: () => mockUseLeaderboard(),
  useAwardBadge: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

function failed() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("engagement badges and leaderboard offer retry on a failed load", () => {
  it("BadgesGrid renders the shared error state and retries through refetch", () => {
    mockUseEngagementBadges.mockReturnValue(failed());
    render(<BadgesGrid />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load badges/i);
    expect(screen.queryByText(/no badges/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("PointsLeaderboard renders the shared error state and retries through refetch", () => {
    mockUseLeaderboard.mockReturnValue(failed());
    render(<PointsLeaderboard />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the leaderboard/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
