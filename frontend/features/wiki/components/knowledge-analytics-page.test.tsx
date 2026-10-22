import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { ApiError } from "@/lib/api-envelope";

import { TooltipProvider } from "@/components/ui/tooltip";

const mockAssignGapMutate = jest.fn();

const useAccess = jest.fn();
const useCan = jest.fn((_permission: string) => true);
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

jest.mock("@/features/wiki/hooks/use-guarded-create-kb-page", () => ({
  useGuardedCreateKbPage: () => ({ submit: jest.fn(), isSubmitting: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => useCan(permission),
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
  useAssignGap: () => ({ mutate: mockAssignGapMutate, isPending: false }),
  useDismissGap: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateGapFix: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
    <button
      data-testid="user-combobox"
      type="button"
      onClick={() => onChange("user-selected-id")}
    >
      {value ? value : "Select member…"}
    </button>
  ),
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
  searchScopeComplete: true,
  aiAnswers: 4,
  aiNoContext: 1,
  views: 340,
  ticketsDeflected: 3,
  verifiedPublished: 5,
  trustScore: 0.55,
  suppressionReasons: {},
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
    scopeComplete: true,
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
  mockAssignGapMutate.mockReset();
  searchParams = new URLSearchParams();
  useKbSpaces.mockReturnValue({
    data: { data: [{ id: 42, name: "Engineering" }] },
    isLoading: false,
  });
  useAccess.mockReturnValue(accessGranted);
  useCan.mockReturnValue(true);
  useKbAnalyticsOverview.mockReturnValue(settled(OVERVIEW));
  useKbNoResults.mockReturnValue(settled({ data: [], scopeComplete: true }));
  usePageAnalytics.mockReturnValue(settledPages([]));
  useKnowledgeGaps.mockReturnValue(settledGaps([]));
  useGapRelatedPages.mockReturnValue({ pages: [], isLoading: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false });
  useCitationReuse.mockReturnValue(cancelled());
  useReviewSla.mockReturnValue(cancelled());
});

describe("KnowledgeAnalyticsPage — access is three-valued, not a boolean", () => {
  it("shows the overview while independent analytics lists are still loading", () => {
    useKbNoResults.mockReturnValue({ ...settled(undefined), isLoading: true });
    usePageAnalytics.mockReturnValue({ ...settledPages(undefined), isLoading: true });
    useKnowledgeGaps.mockReturnValue({ ...settledGaps([]), isLoading: true });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("Article views")).toBeInTheDocument();
    expect(screen.getByText("No-result searches")).toBeInTheDocument();
    expect(screen.getByText("Top pages")).toBeInTheDocument();
    expect(screen.getByText("Knowledge gaps")).toBeInTheDocument();
    expect(screen.queryByText("No zero-result searches")).not.toBeInTheDocument();
    expect(screen.queryByText("No file data yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No knowledge gaps")).not.toBeInTheDocument();
  });

  it("shows no-result search count as a lower bound and can continue the list", () => {
    const fetchNextPage = jest.fn();
    useKbNoResults.mockReturnValue({
      ...settled({
        data: [
          { query: "billing", count: 4 },
          { query: "shipping", count: 3 },
        ],
        scopeComplete: true,
      }),
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("2+ queries")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more searches" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("shows citation reuse as a lower bound and offers continuation", () => {
    const fetchNextPage = jest.fn();
    useCitationReuse.mockReturnValue({
      ...settledPages([
        { kind: "page", refId: 1, title: "A", reuseCount: 3 },
        { kind: "page", refId: 2, title: "B", reuseCount: 2 },
      ]),
      fetchNextPage,
      hasNextPage: true,
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("2+")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more citation results" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("shows the skeleton while the access snapshot is still in flight, never an access denial", () => {
    useAccess.mockReturnValue(accessLoading);

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/permission/i)).toBeNull();
    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("says denied only once the snapshot has actually said no", () => {
    useAccess.mockReturnValue(accessDenied);

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/You need the Kb.*Analytics.*View permission/i)).toBeInTheDocument();
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

    expect(screen.queryByText(/no file data yet/i)).toBeNull();
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

    expect(screen.getByText("Organization search success")).toBeInTheDocument();
    expect(screen.queryByText("Tickets deflected")).toBeNull();
  });

  it("shows suppressed metrics separately from zero and names the tenant search scope", () => {
    useKbAnalyticsOverview.mockReturnValue(settled({
      ...OVERVIEW,
      totalViews: null,
      searches: 0,
      searchSuccessRate: null,
      ticketsDeflected: 0,
      suppressionReasons: { totalViews: "minimum_cohort", searchSuccessRate: "incomplete_scope" },
    }));

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("Organization searches")).toBeInTheDocument();
    expect(screen.getByText("Suppressed")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Fewer than 3 records in this cohort")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
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
      useKbNoResults,
      useKnowledgeGaps,
      useCitationReuse,
      useReviewSla,
    ]) {
      expect(hook).toHaveBeenCalledWith(
        expect.objectContaining({ from: expect.any(String) }),
      );
    }
    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String) }),
      "wiki",
    );
  });

  it("asks the shared overview route for wiki pages, because it defaults to support articles and counted none of this page's pages", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(expect.anything(), "wiki");
  });

  it("sends no lower bound when the reader asks for all time", () => {
    searchParams = new URLSearchParams("range=all");

    render(<KnowledgeAnalyticsPage />);

    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.not.objectContaining({ from: expect.anything() }),
      "wiki",
    );
    expect(useKnowledgeGaps).toHaveBeenCalledWith(
      expect.not.objectContaining({ from: expect.anything() }),
    );
  });
});

describe("KnowledgeAnalyticsPage — the reader can narrow the figures to one space", () => {
  it("offers a space control", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByLabelText("Team folder")).toBeInTheDocument();
  });

  it("scopes the page drill-down and the overview to the selected space", () => {
    searchParams = new URLSearchParams("space=42");

    render(<KnowledgeAnalyticsPage />);

    expect(usePageAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 42 }),
    );
    expect(useKbAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 42 }),
      "wiki",
    );
    expect(useReviewSla).toHaveBeenCalledWith(
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
      "wiki",
    );
    expect(useReviewSla).toHaveBeenCalledWith(
      expect.not.objectContaining({ spaceId: expect.anything() }),
    );
  });

  it("does not show a false zero for space search and gap history with unknown provenance", () => {
    searchParams = new URLSearchParams({ space: "42" });
    useKbAnalyticsOverview.mockReturnValue(settled({
      ...OVERVIEW,
      searches: null,
      noResults: null,
      searchSuccessRate: null,
      aiAnswers: null,
      aiNoContext: null,
      searchScopeComplete: false,
    }));
    useKbNoResults.mockReturnValue(settled({ data: [], scopeComplete: false }));
    useKnowledgeGaps.mockReturnValue({ ...settledGaps([]), scopeComplete: false });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/Team-folder-scoped search and Ask history is incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-result searches for this team folder are unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Knowledge gaps for this team folder are unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("No zero-result searches")).not.toBeInTheDocument();
    expect(useKbNoResults).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 42 }));
    expect(useKnowledgeGaps).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 42 }));
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

    expect(screen.queryByText(/No file data yet/i)).toBeNull();
    expect(screen.getByText(/No files match these filters/i)).toBeInTheDocument();
  });

  it("still explains genuine first-run emptiness when nothing is filtered", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/No file data yet/i)).toBeInTheDocument();
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

  it("renders Assign, Dismiss and Fix controls for each gap row so gap actions are reachable from the table", () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "export report", count: 3, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("button", { name: /assign gap owner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismiss gap/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create fix file/i })).toBeInTheDocument();
  });

  it("keeps page-creation actions hidden from analytics viewers without page-create permission", () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "export report", count: 3, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );
    useCan.mockImplementation((permission: string) => permission !== "kb:pages:create");

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("export report")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create fix file/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page" })).not.toBeInTheDocument();
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

  it("shows a request reference and retries a failed first related-pages read", () => {
    const refetch = jest.fn();
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "reset password", count: 5, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );
    useGapRelatedPages.mockReturnValue({
      pages: [],
      isLoading: false,
      isError: true,
      error: new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE", { correlationId: "related-first-1" }),
      isFetchNextPageError: false,
      refetch,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<KnowledgeAnalyticsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Gap: reset password" }));

    expect(screen.getByText("Could not load related pages")).toBeInTheDocument();
    expect(screen.getByText("related-first-1")).toBeInTheDocument();
    expect(screen.queryByText("No existing pages mention this query.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("retains loaded related pages and retries only a failed later page", () => {
    const refetch = jest.fn();
    const fetchNextPage = jest.fn();
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "reset password", count: 5, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );
    useGapRelatedPages.mockReturnValue({
      pages: [{ id: 1, title: "Password Reset Guide", status: "published", updatedAt: "2024-01-01T00:00:00Z" }],
      isLoading: false,
      isError: true,
      error: new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE", { correlationId: "related-later-2" }),
      isFetchNextPageError: true,
      refetch,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<KnowledgeAnalyticsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Gap: reset password" }));

    expect(screen.getByText("Password Reset Guide")).toBeInTheDocument();
    expect(screen.getByText("Could not load more related pages")).toBeInTheDocument();
    expect(screen.getByText("related-later-2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more related pages" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("keeps keyboard action activation separate from gap selection", async () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "reset password", count: 5, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );
    const user = userEvent.setup();
    render(<KnowledgeAnalyticsPage />);

    const gap = screen.getByRole("button", { name: "Gap: reset password" });
    const assign = screen.getByRole("button", { name: "Assign gap owner" });
    const dismiss = screen.getByRole("button", { name: "Dismiss gap" });
    expect(gap.contains(assign)).toBe(false);
    expect(gap.contains(dismiss)).toBe(false);

    assign.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("user-combobox")).toBeInTheDocument();
    expect(gap).toHaveAttribute("aria-expanded", "false");

    dismiss.focus();
    await user.keyboard(" ");
    expect(screen.getByPlaceholderText("Reason for dismissal")).toBeInTheDocument();
    expect(gap).toHaveAttribute("aria-expanded", "false");

    gap.focus();
    await user.keyboard("{Enter}");
    expect(gap).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(gap).toHaveAttribute("aria-expanded", "false");
  });
});

describe("KnowledgeAnalyticsPage — gap assign uses a person picker, not a raw UUID input", () => {
  it("selecting a member by name passes the user ID to the assign mutation, not a typed UUID string", () => {
    useKnowledgeGaps.mockReturnValue(
      settledGaps([{ query: "export report", count: 3, lastOccurredAt: "2024-03-01T00:00:00Z" }]),
    );

    render(<KnowledgeAnalyticsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Assign gap owner" }));

    fireEvent.click(screen.getByTestId("user-combobox"));

    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    expect(mockAssignGapMutate).toHaveBeenCalledWith(
      expect.objectContaining({ query: "export report", assigneeUserId: "user-selected-id" }),
    );
  });
});

describe("KnowledgeAnalyticsPage — the failing query is the one whose request id is quoted", () => {
  const { ApiError } = jest.requireActual("@/lib/api-envelope") as {
    ApiError: new (m: string, s?: number, c?: string, d?: unknown) => Error;
  };

  function failure(correlationId: string) {
    return new ApiError("Upstream exploded", 500, "INTERNAL", {
      correlationId,
    });
  }

  it("renders the analytics body when no query failed, so the error assertions below are not vacuous", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No zero-result searches")).toBeInTheDocument();
  });

  it("links an analytics row to the canonical KB document route", () => {
    usePageAnalytics.mockReturnValue(settledPages([{
      id: 17,
      title: "Policy",
      status: "published",
      trustState: "verified",
      updatedAt: "2026-10-15T00:00:00.000Z",
      uniqueViewers: 4,
      commentCount: 1,
      versionCount: 2,
    }]));

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("link", { name: "Policy" })).toHaveAttribute("href", "/knowledge/wiki/doc/17");
  });

  it("quotes the overview request id when the overview query is the one that failed", () => {
    useKbAnalyticsOverview.mockReturnValue({
      ...settled(undefined),
      isError: true,
      error: failure("req_overview_1"),
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_overview_1")).toBeInTheDocument();
  });

  it("quotes the no-results request id when only the no-results query failed, because the overview holds no error to quote", () => {
    useKbNoResults.mockReturnValue({
      ...settled(undefined),
      isError: true,
      error: failure("req_noresults_2"),
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_noresults_2")).toBeInTheDocument();
  });

  it("keeps loaded no-result searches on a later-page failure and retries only that cursor", async () => {
    const fetchNextPage = jest.fn();
    const refetch = jest.fn();
    useKbNoResults.mockReturnValue({
      ...settled({ data: [{ query: "billing", count: 4 }], scopeComplete: true }),
      isError: true,
      isFetchNextPageError: true,
      error: failure("req_noresults_later"),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
      refetch,
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("billing")).toBeInTheDocument();
    expect(screen.getByText("req_noresults_later")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more searches" })).not.toBeInTheDocument();
    expect(screen.getByText("Couldn't load more searches")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])("hides cached no-result searches after a %i cursor failure", (status) => {
    useKbNoResults.mockReturnValue({
      ...settled({ data: [{ query: "private billing", count: 4 }], scopeComplete: true }),
      isError: true,
      isFetchNextPageError: true,
      error: new ApiError("Access unavailable", status),
      hasNextPage: true,
      fetchNextPage: jest.fn(),
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText("private billing")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry loading searches" })).not.toBeInTheDocument();
  });

  it("quotes the page-analytics request id when only the page-analytics query failed", () => {
    usePageAnalytics.mockReturnValue({
      ...settledPages(undefined),
      isError: true,
      error: failure("req_pages_3"),
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_pages_3")).toBeInTheDocument();
  });

  it("quotes the gaps request id when only the gaps query failed", () => {
    useKnowledgeGaps.mockReturnValue({
      ...settledGaps([]),
      isError: true,
      error: failure("req_gaps_4"),
    });

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_gaps_4")).toBeInTheDocument();
  });
});
