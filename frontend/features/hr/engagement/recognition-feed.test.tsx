import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
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

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
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

describe("HRMS-B2-011 the badge and leaderboard panels keep their honest empty states, and their error branches are reachable", () => {
  const ENGAGEMENT_HOOKS = join(process.cwd(), "hooks/api/hr/engagement.ts");

  it("opts the badge and leaderboard reads out of the /hr boundary, so the error branches above are not dead code", () => {
    const source = readFileSync(ENGAGEMENT_HOOKS, "utf8");
    const optOuts = source.match(/\.\.\.INLINE_READ_ERROR,/g) ?? [];

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(optOuts.length).toBeGreaterThanOrEqual(5);
  });

  it("still says no badges have been created when the read genuinely returns none", () => {
    mockUseEngagementBadges.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<BadgesGrid />);

    expect(screen.getByText(/no badges created yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still says no points have been earned when the leaderboard genuinely returns none", () => {
    mockUseLeaderboard.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<PointsLeaderboard />);

    expect(screen.getByText(/no points earned yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
