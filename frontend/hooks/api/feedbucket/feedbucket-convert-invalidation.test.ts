import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    refetch: jest.fn().mockResolvedValue({ data: { isOrgOwner: true } }),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
  },
  isApiError: () => false,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { post: jest.Mock };
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useConvertFeedbucketToTicket — cache invalidation after success", () => {
  const SUBMISSION_ID = 42;
  const TICKET_ID = 99;

  const submissionsAllKey = growthAndSignQueryKeys.feedbucket.all;
  const submissionDetailKey = growthAndSignQueryKeys.feedbucket.submission(SUBMISSION_ID);
  const ticketsListKey = buildWorkQueryKeys.projects.tickets();

  function seedCache(client: QueryClient) {
    client.setQueryData(submissionsAllKey, []);
    client.setQueryData(submissionDetailKey, { id: SUBMISSION_ID, linkedTicketId: null });
    client.setQueryData(ticketsListKey, { data: [], total: 0 });
  }

  function invalidationState(client: QueryClient) {
    return {
      submissionsAll: client.getQueryState(submissionsAllKey)?.isInvalidated ?? null,
      submissionDetail: client.getQueryState(submissionDetailKey)?.isInvalidated ?? null,
      ticketsList: client.getQueryState(ticketsListKey)?.isInvalidated ?? null,
    };
  }

  it("invalidates feedbucket.all so the submissions list reflects the linked ticket", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seedCache(client);
    apiClient.post.mockResolvedValue({ ticketId: TICKET_ID });

    const { useConvertFeedbucketToTicket } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useConvertFeedbucketToTicket(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: SUBMISSION_ID });
    });

    await waitFor(() => expect(invalidationState(client).submissionsAll).toBe(true));
  });

  it("invalidates the submission detail so the linked ticket badge renders immediately on re-open", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seedCache(client);
    apiClient.post.mockResolvedValue({ ticketId: TICKET_ID });

    const { useConvertFeedbucketToTicket } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useConvertFeedbucketToTicket(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: SUBMISSION_ID });
    });

    await waitFor(() => expect(invalidationState(client).submissionDetail).toBe(true));
  });

  it("invalidates the project tickets list so the new ticket appears on the board without a page reload", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seedCache(client);
    apiClient.post.mockResolvedValue({ ticketId: TICKET_ID });

    const { useConvertFeedbucketToTicket } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useConvertFeedbucketToTicket(), { wrapper: wrapper(client) });

    expect(invalidationState(client).ticketsList).toBe(false);

    await act(async () => {
      await result.current.mutateAsync({ submissionId: SUBMISSION_ID });
    });

    await waitFor(() => expect(invalidationState(client).ticketsList).toBe(true));
  });

  it("does not invalidate the tickets list when conversion fails so stale data cannot corrupt an already-valid board", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seedCache(client);
    apiClient.post.mockRejectedValue(new Error("Server error"));

    const { useConvertFeedbucketToTicket } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(
      () => useConvertFeedbucketToTicket(),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync({ submissionId: SUBMISSION_ID }).catch(() => undefined);
    });

    expect(invalidationState(client).ticketsList).toBe(false);
  });
});
