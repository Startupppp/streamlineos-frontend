import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import {
  useCreatePayrollComponent,
  useDeletePayrollComponent,
  useUpdatePayrollComponent,
} from "@/hooks/api/payroll/components";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: jest.fn(async () => ({ data: { isOrgOwner: true, scopes: {} } })),
  })),
}));

const COMPONENT = { id: 9, code: "HRA", name: "HRA" };

describe("payroll component mutations settle on the server response, not on the list refetch", () => {
  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    let calls = 0;
    const listFn = jest.fn(() => (calls++ === 0 ? Promise.resolve({ data: [] }) : new Promise(() => {})));
    renderHook(
      () => useQuery({ queryKey: payrollQueryKeys.payroll.components({ limit: 20 }), queryFn: listFn }),
      { wrapper },
    );
    return { wrapper, listFn };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.post).mockResolvedValue(COMPONENT);
    jest.mocked(apiClient.patch).mockResolvedValue(COMPONENT);
    jest.mocked(apiClient.delete).mockResolvedValue(undefined);
  });

  it("create resolves while the list refetch is still in flight", async () => {
    const { wrapper, listFn } = setup();
    await waitFor(() => expect(listFn).toHaveBeenCalledTimes(1));
    const { result } = renderHook(() => useCreatePayrollComponent(), { wrapper });

    await act(async () => {
      result.current.mutate({
        code: "HRA",
        name: "HRA",
        type: "EARNING",
        calcMethod: "FIXED",
        taxable: true,
        showOnPayslip: true,
        includeInCtc: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listFn).toHaveBeenCalledTimes(2);
  });

  it("update and delete resolve while the list refetch is still in flight", async () => {
    const { wrapper } = setup();
    const update = renderHook(() => useUpdatePayrollComponent(), { wrapper });
    const remove = renderHook(() => useDeletePayrollComponent(), { wrapper });

    await act(async () => {
      update.result.current.mutate({ componentId: 9, data: { name: "House rent" } });
      remove.result.current.mutate(9);
    });

    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
  });
});
