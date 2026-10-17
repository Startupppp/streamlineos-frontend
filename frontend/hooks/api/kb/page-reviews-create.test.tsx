import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { ApiError, getCorrelationId } from "@/lib/api-envelope";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { useCreatePageReview, useKbPageReviews, type CreatePageReviewInput, type KbPageReview } from "./page-reviews";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _permission: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

const review: KbPageReview = {
  id: 42,
  orgId: "org-1",
  pageId: 9,
  pageTitle: "Runbook",
  pageTrustState: "unverified",
  type: "approval",
  status: "pending",
  isOverdue: false,
  requestedById: "requester",
  requestedByMembershipId: 1,
  reviewerId: "reviewer",
  reviewerMembershipId: 2,
  requestedByName: "Requester",
  reviewerName: "Reviewer",
  dueAt: null,
  decidedAt: null,
  decisionNote: null,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const postMock = jest.mocked(apiClient.post);
const getMock = jest.mocked(apiClient.get);

beforeEach(() => {
  postMock.mockReset();
  getMock.mockReset();
});

it("keeps a first-read Reviews failure inline with its request ID and recovers on retry", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary } } });
  const readWrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  getMock.mockRejectedValueOnce(new ApiError("Review list failed", 500, "INTERNAL", { correlationId: "reviews-read-123" }, "/kb/page-reviews"));
  getMock.mockResolvedValueOnce({ data: [review], pagination: { limit: 50, hasMore: false, nextCursor: null } });

  const { result } = renderHook(() => useKbPageReviews({ status: "pending" }), { wrapper: readWrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(getCorrelationId(result.current.error)).toBe("reviews-read-123");
  await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.data?.data).toEqual([review]));
  expect(getMock).toHaveBeenCalledWith(
    "/kb/page-reviews",
    { status: "pending" },
    expect.any(AbortSignal),
    expect.any(Function),
  );
});

it("reuses a review-create key across failure and retry, then settles after success", async () => {
  postMock.mockRejectedValueOnce(new Error("network interrupted"));
  postMock.mockResolvedValue(review);
  const { result } = renderHook(() => useCreatePageReview(), { wrapper });
  const request: CreatePageReviewInput = { pageId: 9, type: "approval", reviewerId: "reviewer" };

  await act(async () => {
    await expect(result.current.mutateAsync(request)).rejects.toThrow("network interrupted");
    await result.current.mutateAsync(request);
    await result.current.mutateAsync(request);
  });

  expect(postMock).toHaveBeenCalledWith(
    "/kb/pages/9/reviews",
    { type: "approval", reviewerId: "reviewer" },
    expect.any(Object),
    expect.any(Function),
  );
  const keys = postMock.mock.calls.map((call) => new Headers(call[2]?.headers).get("Idempotency-Key"));
  expect(keys[0]).toBeTruthy();
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[1]);
});
