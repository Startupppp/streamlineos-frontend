import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { KbPageReview } from "@/hooks/api/kb/page-reviews";
import ReviewsPage from "./reviews-page";
import { RejectDialog } from "./reviews-decision-dialogs";
import { BulkDecideResultsDialog } from "./reviews-bulk-results-dialog";
import type { BulkFailureWithTitle } from "./reviews-bulk-results-dialog";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  usePathname: jest.fn(() => "/knowledge/wiki/reviews"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/hooks/api/kb/page-reviews", () => ({
  useKbPageReviews: jest.fn(),
  useApprovePageReview: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRejectPageReview: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useBulkDecidePageReviews: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("./reviews-filters", () => ({
  ReviewsFilters: () => <div data-testid="reviews-filters" />,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: jest.fn(
    ({
      resolution,
      loading,
      empty,
      children,
    }: {
      resolution: { kind: string };
      loading: React.ReactNode;
      empty?: React.ReactNode;
      children: React.ReactNode;
    }) => {
      if (resolution.kind === "loading") return <>{loading}</>;
      if (resolution.kind === "empty") return <>{empty ?? children}</>;
      return <>{children}</>;
    },
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: jest.fn(
    (props: {
      data: KbPageReview[];
      columns: Array<{ key: string; cell: (row: KbPageReview) => React.ReactNode }>;
      emptyState?: React.ReactNode;
      pagination?: {
        mode: string;
        hasMore: boolean;
        hasPrevious: boolean;
        onNext: () => void;
        onPrevious: () => void;
      };
    }) => {
      if (!props.data || props.data.length === 0) return <>{props.emptyState ?? null}</>;
      return (
        <div data-testid="data-table">
          {props.data.map((row: KbPageReview) => (
            <div key={row.id} data-testid={`row-${row.id}`}>
              {props.columns?.map(
                (c: { key: string; cell: (row: KbPageReview) => React.ReactNode }) => (
                  <div key={c.key} data-testid={`cell-${c.key}-${row.id}`}>
                    {c.cell(row)}
                  </div>
                ),
              )}
            </div>
          ))}
          {props.pagination?.mode === "cursor" && props.pagination.hasMore && (
            <button
              type="button"
              data-testid="next-btn"
              onClick={props.pagination.onNext}
            >
              Next
            </button>
          )}
          {props.pagination?.mode === "cursor" && props.pagination.hasPrevious && (
            <button
              type="button"
              data-testid="prev-btn"
              onClick={props.pagination.onPrevious}
            >
              Previous
            </button>
          )}
        </div>
      );
    },
  ),
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

jest.mock("@/lib/knowledge-routes", () => ({
  pageHref: (id: number) => `/wiki/pages/${id}`,
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbAlertCircleIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert" className={className} />
  ),
  KbCheckCircleIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-check" className={className} />
  ),
  KbXCircleIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className} />
  ),
}));

const {
  useKbPageReviews,
  useRejectPageReview,
} = jest.requireMock("@/hooks/api/kb/page-reviews") as {
  useKbPageReviews: jest.Mock;
  useRejectPageReview: jest.Mock;
};

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

const { useSearchParams } = jest.requireMock("next/navigation") as {
  useSearchParams: jest.Mock;
};

function makeReview(overrides: Partial<KbPageReview> = {}): KbPageReview {
  return {
    id: 1,
    orgId: "org-1",
    pageId: 10,
    pageTitle: "Test Page",
    type: "approval",
    status: "pending",
    isOverdue: false,
    requestedById: "user-1",
    requestedByMembershipId: 1,
    reviewerId: "user-2",
    reviewerMembershipId: 2,
    requestedByName: "Alice",
    reviewerName: "Bob",
    dueAt: "2099-01-01T00:00:00Z",
    decidedAt: null,
    decisionNote: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makePage(
  reviews: KbPageReview[],
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null } = {
    limit: 50,
    hasMore: false,
    nextCursor: null,
  },
) {
  return { data: reviews, pagination };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSearchParams.mockReturnValue(new URLSearchParams());
  usePageState.mockReturnValue({ kind: "ready" });
  useKbPageReviews.mockReturnValue({
    data: makePage([]),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
});

describe("ReviewsPage — overdue rendering driven by server isOverdue field", () => {
  it("a review with isOverdue=true renders the overdue badge regardless of base status", () => {
    useKbPageReviews.mockReturnValue({
      data: makePage([makeReview({ id: 1, isOverdue: true, status: "pending" })]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("a pending review with isOverdue=false and a future dueAt does not render overdue", () => {
    useKbPageReviews.mockReturnValue({
      data: makePage([
        makeReview({
          id: 2,
          isOverdue: false,
          status: "pending",
          dueAt: "2099-12-31T00:00:00Z",
        }),
      ]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });
});

describe("ReviewsPage — overdue filter is server-side, not client-side", () => {
  it("status=overdue in the URL passes status overdue to the hook rather than filtering locally", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("status=overdue"));
    useKbPageReviews.mockReturnValue({
      data: makePage([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ status: "overdue" }),
    );
    expect(useKbPageReviews).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });
});

describe("ReviewsPage — empty states distinguish first-empty from filtered-empty", () => {
  it("first-empty (no filters) renders the no-reviews message without a clear-filters button", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    useKbPageReviews.mockReturnValue({
      data: makePage([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    expect(screen.getByText("No pages under review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("filtered-empty renders a filter-aware message and offers a clear-filters action", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("status=approved"));
    usePageState.mockReturnValue({ kind: "empty" });
    useKbPageReviews.mockReturnValue({
      data: makePage([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    expect(screen.getByText("No reviews match your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });
});

describe("ReviewsPage — cursor pagination preserves URL filter state", () => {
  it("advancing the cursor includes the active status filter in the next hook call", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("status=overdue"));
    useKbPageReviews.mockReturnValue({
      data: makePage(
        [makeReview({ id: 5 })],
        { limit: 50, hasMore: true, nextCursor: "cursor-abc" },
      ),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    jest.clearAllMocks();
    useKbPageReviews.mockReturnValue({
      data: makePage([makeReview({ id: 6 })], { limit: 50, hasMore: false, nextCursor: null }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    fireEvent.click(screen.getByTestId("next-btn"));

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ status: "overdue", cursor: "cursor-abc" }),
    );
  });

  it("retreating the cursor restores the first page while keeping the status filter", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("status=overdue"));
    useKbPageReviews.mockReturnValue({
      data: makePage(
        [makeReview({ id: 7 })],
        { limit: 50, hasMore: true, nextCursor: "cursor-def" },
      ),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ReviewsPage />);

    fireEvent.click(screen.getByTestId("next-btn"));

    jest.clearAllMocks();
    useKbPageReviews.mockReturnValue({
      data: makePage([makeReview({ id: 8 })], { limit: 50, hasMore: false, nextCursor: null }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    fireEvent.click(screen.getByTestId("prev-btn"));

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ status: "overdue", cursor: undefined }),
    );
  });
});

describe("BulkDecideResultsDialog — per-row failure reporting", () => {
  it("renders each failed row by page title and outcome label, not only a count", () => {
    const failures: BulkFailureWithTitle[] = [
      { id: 1, outcome: "denied", pageTitle: "Sales Handbook" },
      { id: 2, outcome: "conflict", pageTitle: "HR Policy" },
      { id: 3, outcome: "notFound", pageTitle: "Missing Page" },
    ];

    render(
      <BulkDecideResultsDialog
        succeeded={2}
        failures={failures}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText("Sales Handbook")).toBeInTheDocument();
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.getByText("HR Policy")).toBeInTheDocument();
    expect(screen.getByText("Already decided")).toBeInTheDocument();
    expect(screen.getByText("Missing Page")).toBeInTheDocument();
    expect(screen.getByText("Review not found")).toBeInTheDocument();
  });

  it("displays the succeeded and failed counts in the dialog title", () => {
    const failures: BulkFailureWithTitle[] = [
      { id: 1, outcome: "notFound", pageTitle: "Gone Page" },
    ];

    render(
      <BulkDecideResultsDialog
        succeeded={4}
        failures={failures}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText(/4 succeeded/)).toBeInTheDocument();
    expect(screen.getByText(/4 succeeded.*1 failed/)).toBeInTheDocument();
  });
});

describe("RejectDialog — reason is required before submission", () => {
  it("the reject button is disabled while the reason textarea is empty", () => {
    useRejectPageReview.mockReturnValue({ mutate: jest.fn(), isPending: false });

    render(
      <RejectDialog
        review={makeReview({ pageTitle: "Test Page" })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("the reject button becomes enabled once a non-empty reason is typed", () => {
    useRejectPageReview.mockReturnValue({ mutate: jest.fn(), isPending: false });

    render(
      <RejectDialog
        review={makeReview({ pageTitle: "Test Page" })}
        onClose={jest.fn()}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText("Explain why this review is rejected…"),
      { target: { value: "Content is outdated" } },
    );

    expect(screen.getByRole("button", { name: "Reject" })).not.toBeDisabled();
  });
});
