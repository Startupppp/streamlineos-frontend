import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { KbContentGaps } from "./kb-content-gaps";

const mockUseContentGaps = jest.fn();

jest.mock("@/hooks/api/kb/analytics", () => ({
  useKbContentGaps: () => mockUseContentGaps(),
}));

const firstPage = [{
  query: "How do I reset access?",
  count: 4,
  lastOccurredAt: "2026-10-01T12:00:00.000Z",
  gapKind: "search" as const,
}];

it("shows the request reference and retry when the first content-gap read fails", () => {
  const refetch = jest.fn();
  mockUseContentGaps.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "req-gap-first" }, "/kb/analytics/content-gaps"),
    refetch,
  });

  render(<KbContentGaps />);

  expect(screen.queryByText("No content gaps")).not.toBeInTheDocument();
  expect(screen.getByText("req-gap-first")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("keeps the loaded rows and retries only the failed next page", () => {
  const fetchNextPage = jest.fn();
  const refetch = jest.fn();
  mockUseContentGaps.mockReturnValue({
    data: firstPage,
    isLoading: false,
    isFetchNextPageError: true,
    error: new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "req-gap-next" }, "/kb/analytics/content-gaps"),
    refetch,
    fetchNextPage,
    hasNextPage: true,
    isFetchingNextPage: false,
  });

  render(<KbContentGaps />);

  expect(screen.getByText("How do I reset access?")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load more content gaps");
  expect(screen.getByText("req-gap-next")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading content gaps" }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  expect(refetch).not.toHaveBeenCalled();
});

it("hides cached gap queries when access to analytics is revoked", () => {
  mockUseContentGaps.mockReturnValue({
    data: firstPage,
    isLoading: false,
    error: new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/kb/analytics/content-gaps"),
    refetch: jest.fn(),
  });

  render(<KbContentGaps />);

  expect(screen.queryByText("How do I reset access?")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
