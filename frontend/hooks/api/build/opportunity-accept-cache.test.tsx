import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAcceptOpportunity } from "./opportunity-mutations";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn() } }));

const mockPost = jest.mocked(apiClient.post);

const BOARD_KEY = knowledgeAndSurveysQueryKeys.roadmap.items({ managedProductId: 3 });
const SELECTOR_KEY = [...knowledgeAndSurveysQueryKeys.roadmap.items({ managedProductId: 3 }), "infinite"];

function roadmapItem(id: number) {
  return { id, sortOrder: id, horizon: "next", version: 1, title: `Item ${id}` };
}

describe("useAcceptOpportunity cache patching", () => {
  it("MP-B-006: succeeds while the accept dialog's infinite roadmap selector is cached, so the caller can close the form", async () => {
    mockPost.mockResolvedValue({
      opportunity: { id: 1, state: "accepted", version: 2 },
      roadmapItem: roadmapItem(9),
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const page = { data: [roadmapItem(4)], pagination: { limit: 25, nextCursor: null, hasMore: false } };
    qc.setQueryData(BOARD_KEY, page);
    qc.setQueryData(SELECTOR_KEY, { pages: [page], pageParams: [""] });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAcceptOpportunity(3), { wrapper });
    const onSuccess = jest.fn();

    await act(async () => {
      result.current.mutate(
        { opportunityId: 1, horizon: "next", expectedVersion: 1, isPublic: false },
        { onSuccess },
      );
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(qc.getQueryData<{ data: Array<{ id: number }> }>(BOARD_KEY)?.data.map((r) => r.id)).toEqual([4, 9]);
    expect(qc.getQueryData(SELECTOR_KEY)).toEqual({ pages: [page], pageParams: [""] });
  });
});
