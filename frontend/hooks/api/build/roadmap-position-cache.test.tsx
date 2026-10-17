import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { usePositionRoadmapItem } from "./roadmap";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));

const mockPatch = jest.mocked(apiClient.patch);

const BOARD_KEY = knowledgeAndSurveysQueryKeys.roadmap.items({ managedProductId: 39 });
const TITLE_KEY = knowledgeAndSurveysQueryKeys.roadmap.items({ managedProductId: 39, sort: "title" });

function item(id: number, sortOrder: number) {
  return { id, sortOrder, horizon: "next", version: 1, title: `Item ${id}` };
}

function page(items: ReturnType<typeof item>[]) {
  return { data: items, pagination: { limit: 20, nextCursor: null, hasMore: false } };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(BOARD_KEY, page([item(37, 0), item(40, 0)]));
  qc.setQueryData(TITLE_KEY, page([item(37, 0), item(40, 0)]));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

function idsOf(qc: QueryClient, key: readonly unknown[]): number[] {
  return (qc.getQueryData<{ data: Array<{ id: number }> }>(key)?.data ?? []).map((row) => row.id);
}

describe("roadmap position cache", () => {
  it("reorders a position-sorted board from the response and marks the board stale for renumbered siblings", async () => {
    mockPatch.mockResolvedValue({ ...item(40, -1024), version: 2 });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => usePositionRoadmapItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ roadmapItemId: 40, version: 1, beforeItemId: 37 });
    });
    expect(idsOf(qc, BOARD_KEY)).toEqual([40, 37]);
    expect(qc.getQueryState(BOARD_KEY)?.isInvalidated).toBe(true);
  });

  it("keeps the order of a list sorted by another field", async () => {
    mockPatch.mockResolvedValue({ ...item(40, -1024), version: 2 });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => usePositionRoadmapItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ roadmapItemId: 40, version: 1, beforeItemId: 37 });
    });
    expect(idsOf(qc, TITLE_KEY)).toEqual([37, 40]);
  });
});
