import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useLinkGoalProduct, useUnlinkGoalProduct } from "./goals";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn(), delete: jest.fn() } }));

const mockPost = jest.mocked(apiClient.post);
const mockDelete = jest.mocked(apiClient.delete);

const PRODUCT_ID = 39;
const ORG_KEY = accountingAndSupportQueryKeys.goals.list({ limit: 50 });
const PRODUCT_KEY = accountingAndSupportQueryKeys.goals.list({ managedProductId: PRODUCT_ID, page: 1, limit: 20 });
const STATS_KEY = accountingAndSupportQueryKeys.goals.stats(PRODUCT_ID);

function goal(id: number, title: string) {
  return { id, title, level: "company", productLinkage: null };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(ORG_KEY, { items: [goal(38, "QA BV Goal"), goal(37, "testing")], total: 2 });
  qc.setQueryData(PRODUCT_KEY, { items: [goal(37, "testing")], total: 1 });
  qc.setQueryData(STATS_KEY, { total: 1 });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

function idsOf(qc: QueryClient, key: readonly unknown[]): number[] {
  return (qc.getQueryData<{ items: Array<{ id: number }> }>(key)?.items ?? []).map((item) => item.id);
}

beforeEach(() => {
  mockPost.mockReset();
  mockDelete.mockReset();
});

describe("goal product link cache", () => {
  it("adds the linked goal to the product list straight away and marks product stats stale", async () => {
    mockPost.mockResolvedValue({ id: 1, managedProductId: PRODUCT_ID });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useLinkGoalProduct(), { wrapper });

    await act(() => result.current.mutateAsync({ goalId: 38, managedProductId: PRODUCT_ID }));

    expect(idsOf(qc, PRODUCT_KEY)).toEqual([38, 37]);
    expect(qc.getQueryData<{ total: number }>(PRODUCT_KEY)?.total).toBe(2);
    expect(qc.getQueryState(STATS_KEY)?.isInvalidated).toBe(true);
  });

  it("does not duplicate a goal that is already in the product list", async () => {
    mockPost.mockResolvedValue({ id: 1, managedProductId: PRODUCT_ID });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useLinkGoalProduct(), { wrapper });

    await act(() => result.current.mutateAsync({ goalId: 37, managedProductId: PRODUCT_ID }));

    expect(idsOf(qc, PRODUCT_KEY)).toEqual([37]);
    expect(qc.getQueryData<{ total: number }>(PRODUCT_KEY)?.total).toBe(1);
  });

  it("removes the unlinked goal from the product list and keeps it in the org list", async () => {
    mockDelete.mockResolvedValue(undefined);
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => useUnlinkGoalProduct(), { wrapper });

    await act(() => result.current.mutateAsync({ goalId: 37, managedProductId: PRODUCT_ID }));

    expect(idsOf(qc, PRODUCT_KEY)).toEqual([]);
    expect(idsOf(qc, ORG_KEY)).toEqual([38, 37]);
    expect(qc.getQueryState(STATS_KEY)?.isInvalidated).toBe(true);
  });
});
