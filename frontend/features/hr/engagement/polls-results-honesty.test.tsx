import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { PollsTab } from "./polls-tab";

const ENGAGEMENT_HOOKS = join(process.cwd(), "hooks/api/hr/engagement.ts");

const polls = jest.fn();
const results = jest.fn();
const pageState = jest.fn<PageStateResolution, []>();

jest.mock("@/hooks/api/hr/engagement", () => ({
  useEngagementPolls: () => polls(),
  usePollResults: () => results(),
  useCreatePoll: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useVotePoll: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdatePoll: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => pageState(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const OK = { isLoading: false, isError: false, error: null };

const POLL = {
  id: 7,
  question: "Where should the offsite be?",
  options: ["Goa", "Jaipur"],
  status: "active" as const,
  anonymous: false,
  closesAt: null,
};

function openResults() {
  render(<PollsTab />);
  fireEvent.click(screen.getByRole("button", { name: /results/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  pageState.mockReturnValue({ kind: "ready" });
  polls.mockReturnValue({ ...OK, data: [POLL], refetch: jest.fn() });
  results.mockReturnValue({
    ...OK,
    data: {
      counts: [
        { optionIndex: 0, option: "Goa", count: 0 },
        { optionIndex: 1, option: "Jaipur", count: 0 },
      ],
      totalVotes: 0,
      suppressed: false,
      minResponses: 3,
    },
    refetch: jest.fn(),
  });
});

describe("a poll's results report a failure instead of falling back to the ballot", () => {
  it("opts the poll results read out of the /hr boundary, so its inline branch is reachable at all", () => {
    const source = readFileSync(ENGAGEMENT_HOOKS, "utf8");
    const optOuts = source.match(/\.\.\.INLINE_READ_ERROR,/g) ?? [];

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(optOuts.length).toBeGreaterThanOrEqual(6);
  });

  it("says the results could not be loaded, rather than re-offering the ballot, when the read 500d", () => {
    const refetch = jest.fn();
    results.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-lane-d",
      }),
      refetch,
    });
    openResults();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load poll results/i);
    expect(screen.queryByText("req-lane-d")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Goa" })).toBeNull();
    expect(screen.queryByText(/total votes/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the results could not be determined when the read never ran and never failed", () => {
    results.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    openResults();

    expect(screen.getByText(/could not be determined/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Goa" })).toBeNull();
    expect(screen.queryByText(/total votes/i)).toBeNull();
  });

  it("neither reports nor invents a tally while the results are still loading", () => {
    results.mockReturnValue({ ...OK, isLoading: true, data: undefined, refetch: jest.fn() });
    openResults();

    expect(screen.queryByText(/total votes/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Goa" })).toBeNull();
  });

  it("still prints a genuine zero tally when the read returned one", () => {
    openResults();

    expect(screen.getByText("0 total votes")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
