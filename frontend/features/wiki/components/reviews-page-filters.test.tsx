import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ReviewsPage from "./reviews-page";

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

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: jest.fn(() => ({
    data: { data: [{ id: 9, name: "Engineering", icon: null }] },
  })),
  useKbSpace: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value, onChange, onSearchChange, "aria-label": ariaLabel }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    "aria-label": string;
  }) => (
    <div>
      <button type="button" role="combobox" aria-label={ariaLabel} aria-expanded="false" aria-controls="review-space-options">
        {options.find((option) => option.value === value)?.label ?? "Unknown space"}
      </button>
      <input aria-label="Search spaces" onChange={(event) => onSearchChange(event.target.value)} />
      <div id="review-space-options">
        {options.map((option) => (
          <button key={option.value} type="button" onClick={() => onChange(option.value)}>
            {`Choose ${option.label}`}
          </button>
        ))}
      </div>
    </div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => ({ kind: "ready" })),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ pagination, sortState }: {
    pagination: {
      pageNumber: number;
      hasMore: boolean;
      hasPrevious: boolean;
      onNext: () => void;
      onPrevious: () => void;
    };
    sortState: { onChange: (field: string, direction: "asc" | "desc") => void };
  }) => (
    <div data-testid="data-table" data-page-number={pagination.pageNumber}>
      {pagination.hasMore && <button onClick={pagination.onNext}>Next page</button>}
      {pagination.hasPrevious && <button onClick={pagination.onPrevious}>Previous page</button>}
      <button onClick={() => sortState.onChange("dueAt", "desc")}>Sort due descending</button>
    </div>
  ),
}));

jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResponsivePopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ResponsivePopoverContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ value }: { value: string }) => (
    <div data-testid="reviewer-combobox" data-value={value} />
  ),
}));

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ from, to }: { from?: string; to?: string }) => (
    <div data-testid="due-range" data-from={from ?? ""} data-to={to ?? ""} />
  ),
}));

jest.mock("@/lib/knowledge-routes", () => ({
  pageHref: (id: number) => `/wiki/pages/${id}`,
}));

const { useKbPageReviews } = jest.requireMock("@/hooks/api/kb/page-reviews") as {
  useKbPageReviews: jest.Mock;
};
const { useKbSpaces, useKbSpace } = jest.requireMock("@/hooks/api/kb/spaces") as {
  useKbSpaces: jest.Mock;
  useKbSpace: jest.Mock;
};

const { useSearchParams } = jest.requireMock("next/navigation") as {
  useSearchParams: jest.Mock;
};
const { useRouter } = jest.requireMock("next/navigation") as {
  useRouter: jest.Mock;
};
const replace = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useKbSpaces.mockReturnValue({ data: { data: [{ id: 9, name: "Engineering", icon: null }] } });
  useKbSpace.mockReturnValue({ data: undefined });
  useRouter.mockReturnValue({ push: jest.fn(), replace });
  useSearchParams.mockReturnValue(new URLSearchParams());
  useKbPageReviews.mockReturnValue({
    data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
});

describe("ReviewsPage — space filter discovery", () => {
  it("searches the server for a space beyond the first page and selects it", () => {
    jest.useFakeTimers();
    useKbSpaces.mockImplementation(({ q }: { q?: string }) => ({
      data: {
        data: q === "Deep" ? [{ id: 200, name: "Deep Research" }] : [{ id: 9, name: "Engineering" }],
      },
    }));

    try {
      const { rerender } = render(<ReviewsPage />);
      expect(screen.getByRole("combobox", { name: "Space" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Choose Deep Research" })).toBeNull();

      fireEvent.change(screen.getByRole("textbox", { name: "Search spaces" }), {
        target: { value: "Deep" },
      });
      act(() => jest.advanceTimersByTime(300));
      rerender(<ReviewsPage />);

      expect(useKbSpaces).toHaveBeenLastCalledWith({ q: "Deep", limit: 50 });
      fireEvent.click(screen.getByRole("button", { name: "Choose Deep Research" }));
      const params = new URL(replace.mock.lastCall?.[0], "https://example.test").searchParams;
      expect(params.get("spaceId")).toBe("200");
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps a bookmarked space labeled even when it is outside the first list page", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("spaceId=200"));
    useKbSpace.mockReturnValue({ data: { id: 200, name: "Deep Research" } });

    render(<ReviewsPage />);

    expect(useKbSpace).toHaveBeenCalledWith(200);
    expect(screen.getByRole("combobox", { name: "Space" })).toHaveTextContent("Deep Research");
  });
});

describe("ReviewsPage — every documented filter reaches the server", () => {
  it("renders a search control for the reviews list", () => {
    render(<ReviewsPage />);

    expect(screen.getByLabelText(/search reviews/i)).toBeInTheDocument();
  });

  it("sends q from the URL so search is server-side, not a local array filter", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=onboarding"));

    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ q: "onboarding" }),
    );
  });

  it("updates the search control when URL navigation changes the query", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=first"));

    const { rerender } = render(<ReviewsPage />);
    expect(screen.getByRole("searchbox", { name: "Search reviews" })).toHaveValue("first");

    useSearchParams.mockReturnValue(new URLSearchParams("q=second"));
    rerender(<ReviewsPage />);

    expect(screen.getByRole("searchbox", { name: "Search reviews" })).toHaveValue("second");
    expect(useKbPageReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "second" }),
    );
  });

  it("sends spaceId from the URL as a number the backend filter accepts", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("spaceId=9"));

    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 9 }),
    );
  });

  it("sends reviewer from the URL, so the accepted reviewer filter is reachable", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("reviewer=user-42"));

    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({ reviewer: "user-42" }),
    );
  });

  it("sends the due-date range from the URL as full timestamps", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("dueFrom=2026-01-01&dueTo=2026-02-01"),
    );

    render(<ReviewsPage />);

    const call = useKbPageReviews.mock.calls[0]?.[0] as {
      dueFrom?: string;
      dueTo?: string;
    };
    expect(call.dueFrom).toMatch(/^2026-01-01T/);
    expect(call.dueTo).toMatch(/^2026-02-01T/);
  });

  it("sends no filter keys at all with an empty URL, so the assertions above are not vacuous", () => {
    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        spaceId: undefined,
        reviewer: undefined,
        dueFrom: undefined,
        dueTo: undefined,
      }),
    );
  });

  it("renders the reviewer picker and the due-date range control", () => {
    render(<ReviewsPage />);

    expect(screen.getByTestId("reviewer-combobox")).toBeInTheDocument();
    expect(screen.getByTestId("due-range")).toBeInTheDocument();
  });

  it("stores cursor navigation in the URL and restores a bookmarked later page", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("status=pending"));
    useKbPageReviews.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: true, nextCursor: "page-two" } },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { unmount } = render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    const nextUrl = replace.mock.lastCall?.[0];
    const nextParams = new URL(nextUrl, "https://example.test").searchParams;
    expect(nextParams.get("status")).toBe("pending");
    expect(nextParams.get("cursor")).toBe("page-two");
    expect(nextParams.get("cursorTrail")).toBe("~");

    unmount();
    useSearchParams.mockReturnValue(nextParams);
    render(<ReviewsPage />);

    expect(useKbPageReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "page-two", status: "pending" }),
    );
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-page-number", "2");
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

    const previousParams = new URL(replace.mock.lastCall?.[0], "https://example.test").searchParams;
    expect(previousParams.get("status")).toBe("pending");
    expect(previousParams.has("cursor")).toBe(false);
    expect(previousParams.has("cursorTrail")).toBe(false);
  });

  it("removes cursor and trail in the same URL update as a due-date sort change", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("status=pending&cursor=page-two&cursorTrail=~"),
    );

    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sort due descending" }));

    const sortedParams = new URL(replace.mock.lastCall?.[0], "https://example.test").searchParams;
    expect(sortedParams.get("status")).toBe("pending");
    expect(sortedParams.get("sortDir")).toBe("desc");
    expect(sortedParams.has("cursor")).toBe(false);
    expect(sortedParams.has("cursorTrail")).toBe(false);
  });
});
