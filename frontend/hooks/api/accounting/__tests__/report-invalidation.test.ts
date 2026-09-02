import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useClosePeriod } from "../core-periods";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
}));

jest.mock("@/features/accounting/shared", () => ({}));

jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    accounting: {
      all: ["streamlineos", "accounting"] as const,
      trialBalance: (asOf: string) =>
        ["streamlineos", "accounting", "trialBalance", asOf] as const,
    },
  },
}));

const REPORT_KEY = ["streamlineos", "accounting", "trialBalance", "2026-01-01"] as const;

describe("useClosePeriod — report-key invalidation regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invalidates queryKeys.accounting.all so report queries become stale after a period is closed", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      id: 1,
      orgId: "org-1",
      name: "Jan 2026",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      status: "CLOSED",
      closedBy: "user-1",
      closedAt: "2026-01-31T23:59:59Z",
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    queryClient.setQueryData(REPORT_KEY, { rows: [], asOf: "2026-01-01" });

    const stateBefore = queryClient.getQueryState(REPORT_KEY);
    expect(stateBefore?.data).toEqual({ rows: [], asOf: "2026-01-01" });
    expect(stateBefore?.isInvalidated).toBe(false);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useClosePeriod(1), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stateAfter = queryClient.getQueryState(REPORT_KEY);
    expect(stateAfter?.isInvalidated).toBe(true);
  });
});
