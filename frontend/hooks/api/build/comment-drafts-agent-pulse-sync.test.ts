import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: { put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((fn: () => unknown) => fn),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("./comment-draft-offline-buffer", () => ({
  bufferDraft: jest.fn(),
  drainBuffer: jest.fn(() => []),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = jest.requireActual("@tanstack/react-query");
      return useMutation(options);
    },
  ),
}));

import { apiClient } from "@/lib/api-client";

const PULSE_KEY = buildWorkQueryKeys.projects.agentPulseAll();

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function pulseInvalidations(spy: jest.SpyInstance) {
  return spy.mock.calls.filter(
    ([opts]) => JSON.stringify((opts as { queryKey?: unknown })?.queryKey) === JSON.stringify(PULSE_KEY),
  );
}

describe("comment draft mutations keep the sidebar agent-pulse signal in step with the draft list", () => {
  it("invalidates the agent pulse after saving a draft, so the sidebar stops saying a draft awaits review once it has been reviewed", async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ id: 1, ticketId: 9, body: "reviewed" });
    const qc = makeClient();
    const spy = jest.spyOn(qc, "invalidateQueries");

    const { useUpsertCommentDraft } = await import("./comment-drafts");
    const { result } = renderHook(() => useUpsertCommentDraft(), { wrapper: wrapper(qc) });

    await act(async () => {
      result.current.mutate({ ticketId: 9, body: "reviewed" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(pulseInvalidations(spy)).toHaveLength(1);
  });

  it("invalidates the agent pulse after generating a draft, so the sidebar signal appears without waiting for a refetch", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ body: "generated" });
    const qc = makeClient();
    const spy = jest.spyOn(qc, "invalidateQueries");

    const { useGenerateCommentDraft } = await import("./comment-drafts");
    const { result } = renderHook(() => useGenerateCommentDraft(), { wrapper: wrapper(qc) });

    await act(async () => {
      result.current.mutate({ ticketId: 9 });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(pulseInvalidations(spy)).toHaveLength(1);
  });

  it("still invalidates the agent pulse after deleting a draft, which was already correct and must not regress", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ deleted: true });
    const qc = makeClient();
    const spy = jest.spyOn(qc, "invalidateQueries");

    const { useDeleteCommentDraft } = await import("./comment-drafts");
    const { result } = renderHook(() => useDeleteCommentDraft(), { wrapper: wrapper(qc) });

    await act(async () => {
      result.current.mutate(4);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(pulseInvalidations(spy)).toHaveLength(1);
  });
});
