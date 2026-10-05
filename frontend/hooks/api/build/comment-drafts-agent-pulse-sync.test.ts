import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";

jest.mock("@/lib/api-client", () => ({
  apiClient: { put: jest.fn(), post: jest.fn(), delete: jest.fn() },
  isImpersonating: () => false,
}));
jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } }) }));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
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
    return React.createElement(OrgStorageScopeProvider, { scope: "authenticated:org-a:user-a" }, React.createElement(QueryClientProvider, { client: qc }, children));
  };
}

function pulseInvalidations(spy: jest.SpiedFunction<QueryClient["invalidateQueries"]>) {
  return spy.mock.calls.filter(
    ([opts]) => JSON.stringify(opts?.queryKey) === JSON.stringify(PULSE_KEY),
  );
}
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

describe("comment draft mutations keep the sidebar agent-pulse signal in step with the draft list", () => {
  it("invalidates the agent pulse after saving a draft, so the sidebar stops saying a draft awaits review once it has been reviewed", async () => {
    jest.mocked(apiClient.put).mockResolvedValue({ id: 1, ticketId: 9, body: "reviewed" });
    const qc = makeClient();
    const spy = jest.spyOn(qc, "invalidateQueries");

    const { useUpsertCommentDraft } = await import("./comment-draft-commands");
    const { result } = renderHook(() => useUpsertCommentDraft(), { wrapper: wrapper(qc) });

    await act(async () => {
      result.current.mutate({ ticketId: 9, body: "reviewed" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(pulseInvalidations(spy)).toHaveLength(1);
  });

  it("invalidates the agent pulse after generating a draft, so the sidebar signal appears without waiting for a refetch", async () => {
    jest.mocked(apiClient.post).mockResolvedValue({ body: "generated" });
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
    jest.mocked(apiClient.delete).mockResolvedValue({ deleted: true });
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
