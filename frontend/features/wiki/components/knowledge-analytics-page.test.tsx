import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

const useAccess = jest.fn();
const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "kb:analytics:view": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const useKbAnalyticsOverview = jest.fn();
const useKbNoResults = jest.fn();
const usePageAnalytics = jest.fn();
const useKnowledgeGaps = jest.fn();
const useGapRelatedPages = jest.fn();
const useCitationReuse = jest.fn();
const useReviewSla = jest.fn();

let searchParams = new URLSearchParams();
const routerReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: routerReplace }),
  usePathname: () => "/knowledge/wiki/analytics",
  useSearchParams: () => searchParams,
}));

const useKbSpaces = jest.fn();

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => useKbSpaces(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbAnalyticsOverview: (...args: unknown[]) => useKbAnalyticsOverview(...args),
  useKbNoResults: (...args: unknown[]) => useKbNoResults(...args),
  usePageAnalytics: (...args: unknown[]) => usePageAnalytics(...args),
  useKnowledgeGaps: (...args: unknown[]) => useKnowledgeGaps(...args),
  useGapRelatedPages: (...args: unknown[]) => useGapRelatedPages(...args),
  useCitationReuse: (...args: unknown[]) => useCitationReuse(...args),
  useReviewSla: (...args: unknown[]) => useReviewSla(...args),
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

import KnowledgeAnalyticsPage from "./knowledge-analytics-page";

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

const OVERVIEW = {
  totalCount: 12,
  publishedCount: 9,
  archivedCount: 1,
  totalViews: 340,
  helpfulUp: 7,
  helpfulDown: 1,
  helpfulRatio: 0.875,
  searches: 100,
  noResults: 15,
  searchSuccessRate: 0.85,
  aiAnswers: 4,
  aiNoContext: 1,
  views: 340,
  ticketsDeflected: 3,
  verifiedPublished: 5,
  trustScore: 0.55,
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

function settledPages<T>(data: T) {
  return {
    ...settled(data),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

function settledGaps(rows: { query: string | null; count: number; lastOccurredAt: string }[]) {
  return {
    gaps: rows,
    data: { pages: [{ data: rows, pagination: { limit: 50, hasMore: false, nextCursor: null } }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

function cancelled() {
  return { data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  searchParams = new URLSearchParams();
  useKbSpaces.mockReturnValue({
    data: { data: [{ id: 42, name: "Engineering" }] },
    isLoading: false,
  });
  useAccess.mockReturnValue(accessGranted);
  useKbAnalyticsOverview.mockReturnValue(settled(OVERVIEW));
  useKbNoResults.mockReturnValue(settled([]));
  usePageAnalytics.mockReturnValue(settledPages([]));
  useKnowledgeGaps.mockReturnValue(settledGaps([]));
  useGapRelatedPages.mockReturnValue({ pages: [], isLoading: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false });
  useCitationReuse.mockReturnValue(cancelled());
  useReviewSla.mockReturnValue(cancelled());
});

describe("KnowledgeAnalyticsPage — access is three-valued, not a boolean", () => {
  it("shows the skeleton while the access snapshot is still in flight, never an access denial", () => {
    useAccess.mockReturnValue(accessLoading);

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/permission/i)).toBeNull();
    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("says denied only once the snapshot has actually said no", () => {
    useAccess.mockReturnValue(accessDenied);

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/permission/i)).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — a read that never landed is not an empty page", () => {
  it("offers a retry instead of rendering a bare header when the overview was cancelled", () => {
    useKbAnalyticsOverview.mockReturnValue(cancelled());

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("does not claim the knowledge base is empty when the request was interrupted", () => {
    useKbAnalyticsOverview.mockReturnValue(cancelled());

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/no page data yet/i)).toBeNull();
  });
});

describe("KnowledgeAnalyticsPage — a ratio is not a percentage", () => {
  it("renders a 0.85 success ratio as 85%, not as 1%", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.queryByText("1%")).toBeNull();
  });

  it("renders a zero ratio as 0%", () => {
    useKbAnalyticsOverview.mockReturnValue(
      settled({ ...OVERVIEW, searches: 0, searchSuccessRate: 0 }),
    );

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — a stat names what it actually counted", () => {
  it("does not label a help-centre article count as the wiki's page count", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText("Total pages")).toBeNull();
  });
});

describe("KnowledgeAnalyticsPage — activity counts are not success metrics", () => {
  it("does not headline a bare content count, which the strategy names as a non-metric", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText("Help centre articles")).toBeNull();
    expect(screen.queryByText(String(OVERVIEW.totalCount))).toBeNull();
  });

  it("reports helpfulness as a rate rather than a raw upvote tally", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("Helpful ratio")).toBeInTheDocument();
    expect(screen.queryByText("Helpful votes")).toBeNull();
  });

  it("still shows the decision-useful rates it is meant to drive action from", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("Search success")).toBeInTheDocument();
    expect(screen.getByText("Tickets deflected")).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — the reader can choose the window the figures cover", () => {
  it("offers a date range control", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByLabelText("Date range")).toBeInTheDocument();
  });

  it("bounds every ranged read to the selected window", () => {
    searchParams = new URLSearchParams("range=7d");

    render(<KnowledgeAnalyticsPage />);

    for (const hook of [
      useKbAnalyticsOverview,
      useKbNoResults,
      useKnowledgeGaps,
      useCitationReuse,
      useReviewSla,
    ]) {
      expect(hook).toHaveBeenCalledWith(
        expect.objectContaining({ from: expect.any(String) }),
      );
    }
  });

  it("sends no lower bound when the reader asks for all time", () => {
    searchParams = new URLSearchParams("range=all");

    render(<KnowledgeAnalyticsPage />);

    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.not.objectContaining({ from: expect.anything() }),
    );
    expect(useKnowledgeGaps).toHaveBeenCalledWith(
      expect.not.objectContaining({ from: expect.anything() }),
    );
  });
});

describe("KnowledgeAnalyticsPage — the reader can narrow the figures to one space", () => {
  it("offers a space control", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByLabelText("Space")).toBeInTheDocument();
  });

  it("scopes the page drill-down and the overview to the selected space", () => {
    searchParams = new URLSearchParams("space=42");

    render(<KnowledgeAnalyticsPage />);

    expect(usePageAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 42 }),
    );
    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 42 }),
    );
  });

  it("scopes nothing to a space when the reader has not chosen one", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(usePageAnalytics).toHaveBeenCalledWith(
      expect.not.objectContaining({ spaceId: expect.anything() }),
    );
    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.not.objectContaining({ spaceId: expect.anything() }),
    );
  });
});

describe("KnowledgeAnalyticsPage — a filtered zero result is not first-run emptiness", () => {
  it("offers a way back out once a filter is narrowing the figures", () => {
    searchParams = new URLSearchParams("space=42");

    render(<KnowledgeAnalyticsPage />);

    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("does not offer to clear filters when none are applied", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull();
  });

  it("blames the filter, not a missing knowledge base, when a narrowed read returns nothing", () => {
    searchParams = new URLSearchParams("space=42");

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/No page data yet/i)).toBeNull();
    expect(screen.getByText(/No pages match these filters/i)).toBeInTheDocument();
  });

  it("still explains genuine first-run emptiness when nothing is filtered", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/No page data yet/i)).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — stale high-use pages are reachable, not just inferable", () => {
  it("offers a control that narrows the drill-down to stale pages", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(
      screen.getByRole("button", { name: /stale/i }),
    ).toBeInTheDocument();
  });

  it("asks the drill-down for stale pages only once the reader turns it on", () => {
    searchParams = new URLSearchParams("stale=1");

    render(<KnowledgeAnalyticsPage />);

    expect(usePageAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ staleOnly: true }),
    );
  });

  it("does not ask for stale pages when the reader has not turned it on", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(usePageAnalytics).toHaveBeenCalledWith(
      expect.not.objectContaining({ staleOnly: true }),
    );
  });
});

describe("KnowledgeAnalyticsPage — gap rows render without crashing and support drill-down", () => {
  it("renders gap rows when the hook returns flattened gaps array", () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([
        { query: "how to export pdf", count: 12, lastOccurredAt: "2024-03-01T00:00:00Z" },
        { query: "billing questions", count: 7, lastOccurredAt: "2024-02-28T00:00:00Z" },
      ]),
    );

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("how to export pdf")).toBeInTheDocument();
    expect(screen.getByText("billing questions")).toBeInTheDocument();
  });

  it("the gaps list is not an array crash — gaps.map does not throw when hook shape changed", () => {
    useKnowledgeGaps.mockReturnValue(settledGaps([
      { query: "reset password", count: 5, lastOccurredAt: "2024-03-01T00:00:00Z" },
    ]));

    expect(() => render(<KnowledgeAnalyticsPage />)).not.toThrow();
  });

  it("shows the related-pages section when a gap row is clicked", () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "reset password", count: 5, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );
    useGapRelatedPages.mockReturnValue({
      pages: [{ id: 1, title: "Password Reset Guide", status: "published", updatedAt: "2024-01-01T00:00:00Z" }],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<KnowledgeAnalyticsPage />);

    const gapRow = screen.getByRole("button", { name: /Gap: reset password/i });
    fireEvent.click(gapRow);

    expect(screen.getByText("Password Reset Guide")).toBeInTheDocument();
    expect(useGapRelatedPages).toHaveBeenCalledWith("reset password");
  });
});
