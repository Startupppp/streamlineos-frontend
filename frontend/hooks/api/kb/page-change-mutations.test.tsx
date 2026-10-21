import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys as qk } from "@/lib/query-keys/knowledge-and-surveys";

const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_perm: string, options: unknown) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

jest.mock("@/hooks/common/use-idempotent-operation", () => ({
  useIdempotentOperation: () => ({ configFor: (v: unknown) => v, settle: jest.fn() }),
}));

import { useMoveKbPage } from "./pages";
import { useApprovePageReview, useRejectPageReview } from "./page-reviews";
import { useCreateKbPageGrant, useRevokeKbPageGrant } from "./page-grants";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { wrapper, invalidate };
}

const successResponse = { success: true };
const reviewResponse = {
  id: 7,
  orgId: "org-1",
  pageId: 99,
  pageTitle: "Runbook",
  pageTrustState: "verified",
  type: "approval",
  status: "approved",
  isOverdue: false,
  requestedById: null,
  requestedByMembershipId: null,
  reviewerId: null,
  reviewerMembershipId: null,
  requestedByName: null,
  reviewerName: null,
  dueAt: null,
  decidedAt: "2026-10-21T00:00:00.000Z",
  decisionNote: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-21T00:00:00.000Z",
};

describe("KB-B-034 useMoveKbPage — moved event invalidates pagesRecent and pagesFavorites (was gap)", () => {
  it("invalidates pagesRecent after a successful move", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce(successResponse);
    const { result } = renderHook(() => useMoveKbPage(), { wrapper });
    result.current.mutate({ pageId: 5, parentPageId: null, index: 0 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesRecent() });
  });

  it("invalidates pagesFavorites after a successful move", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce(successResponse);
    const { result } = renderHook(() => useMoveKbPage(), { wrapper });
    result.current.mutate({ pageId: 5, parentPageId: null, index: 0 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pagesFavorites() });
  });
});

describe("KB-B-035 useApprovePageReview — review approval invalidates page(id) (was gap)", () => {
  it("invalidates page(id) using the pageId from the review response", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce(reviewResponse);
    const { result } = renderHook(() => useApprovePageReview(), { wrapper });
    result.current.mutate({ reviewId: 7 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(99) });
  });

  it("invalidates pageReviews after approval so the review list refreshes", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce(reviewResponse);
    const { result } = renderHook(() => useApprovePageReview(), { wrapper });
    result.current.mutate({ reviewId: 7 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageReviews() });
  });
});

describe("KB-B-036 useRejectPageReview — review rejection invalidates page(id) (was gap)", () => {
  it("invalidates page(id) using the pageId from the review response", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce({ ...reviewResponse, status: "rejected" });
    const { result } = renderHook(() => useRejectPageReview(), { wrapper });
    result.current.mutate({ reviewId: 7, note: "Needs work" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(99) });
  });
});

describe("KB-B-037 useCreateKbPageGrant — grant create invalidates page(id) (was gap)", () => {
  it("invalidates page(id) after creating a grant so the capabilities field refreshes", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce({
      id: 1, pageId: 12, membershipId: 3, role: null, access: "view",
      grantedByMembershipId: 1, createdAt: "2026-10-21T00:00:00.000Z",
      revokedAt: null, granteeName: "Alice", granteeEmail: null, granteeImage: null,
    });
    const { result } = renderHook(() => useCreateKbPageGrant(), { wrapper });
    result.current.mutate({ pageId: 12, membershipId: 3, access: "view" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(12) });
  });

  it("invalidates pageGrants(id) after creating a grant so the grant list refreshes", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockPost.mockResolvedValueOnce({
      id: 1, pageId: 12, membershipId: 3, role: null, access: "view",
      grantedByMembershipId: 1, createdAt: "2026-10-21T00:00:00.000Z",
      revokedAt: null, granteeName: "Alice", granteeEmail: null, granteeImage: null,
    });
    const { result } = renderHook(() => useCreateKbPageGrant(), { wrapper });
    result.current.mutate({ pageId: 12, membershipId: 3, access: "view" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.pageGrants(12) });
  });
});

describe("KB-B-038 useRevokeKbPageGrant — grant revoke invalidates page(id) (was gap)", () => {
  it("invalidates page(id) after revoking a grant so the capabilities field refreshes", async () => {
    const { wrapper, invalidate } = makeWrapper();
    mockDelete.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useRevokeKbPageGrant(), { wrapper });
    result.current.mutate({ pageId: 12, grantId: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.kb.page(12) });
  });
});
