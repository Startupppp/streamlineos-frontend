import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  usePayoutBatch,
  usePayoutBatches,
} from "@/hooks/api/payroll/payout-batches";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

const mockedGet = apiClient.get as jest.Mock;


const LIST_PAGE = {
  data: [
    {
      id: 1,
      runId: 1,
      batchNumber: "BATCH-0001",
      status: "GENERATED",
      itemCount: 3,
      totalAmount: "150000",
      format: "NEFT_CSV",
      generatedAt: "2026-01-05T00:00:00.000Z",
    },
  ],
  pagination: { limit: 20, nextCursor: null, hasMore: false },
};

const DETAIL = {
  batch: {
    id: 1,
    runId: 1,
    batchNumber: "BATCH-0001",
    status: "GENERATED",
    itemCount: 3,
    totalAmount: "150000",
    format: "NEFT_CSV",
    generatedAt: "2026-01-05T00:00:00.000Z",
  },
  items: {
    data: [
      {
        id: 9,
        batchId: 1,
        userId: "user-1",
        amount: "50000",
        status: "PENDING",
      },
    ],
    hasMore: false,
    nextCursor: null,
  },
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockImplementation((url: string) => {
    if (url === "/payroll/payout/batches") return Promise.resolve(LIST_PAGE);
    if (url === "/payroll/payout/batches/1") return Promise.resolve(DETAIL);
    return Promise.reject(new Error(`unexpected url ${url}`));
  });
});

describe("payout batch list and detail keys", () => {
  it("does not produce the same query key for run 1 and batch 1", () => {
    expect(queryKeys.payroll.bankBatches(1)).not.toEqual(
      queryKeys.payroll.bankBatch(1),
    );
  });

  it("keeps the payout/batches prefix so create-batch invalidation still reaches both", () => {
    const prefix = queryKeys.payroll.bankBatches();
    expect(queryKeys.payroll.bankBatches(1).slice(0, prefix.length)).toEqual([
      ...prefix,
    ]);
    expect(queryKeys.payroll.bankBatch(1).slice(0, prefix.length)).toEqual([
      ...prefix,
    ]);
  });

  it("gives the detail sheet the batch object, not the list page, when runId === batchId", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrap = wrapper(client);

    const list = renderHook(() => usePayoutBatches(1), { wrapper: wrap });
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const detail = renderHook(() => usePayoutBatch(1), { wrapper: wrap });

    expect(detail.result.current.data).toBeUndefined();

    await waitFor(() => expect(detail.result.current.data).toBeDefined());
    expect(detail.result.current.data?.batch.batchNumber).toBe("BATCH-0001");
    expect(detail.result.current.data?.items.data).toHaveLength(1);

    expect(list.result.current.data?.data).toHaveLength(1);
    expect(list.result.current.data?.pagination.hasMore).toBe(false);
  });
});
