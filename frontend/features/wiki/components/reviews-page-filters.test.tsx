import React from "react";
import { render, screen } from "@testing-library/react";
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
  DataTable: () => <div data-testid="data-table" />,
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

const { useSearchParams } = jest.requireMock("next/navigation") as {
  useSearchParams: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  useSearchParams.mockReturnValue(new URLSearchParams());
  useKbPageReviews.mockReturnValue({
    data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
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
});
