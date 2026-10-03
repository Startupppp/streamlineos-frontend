import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useReleaseEmployeeHold } from "@/hooks/api/payroll/run-employees";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: jest.fn(async () => ({ data: { isOrgOwner: true, scopes: {} } })),
  })),
}));

const mockedPost = apiClient.post as jest.Mock;

describe("useReleaseEmployeeHold", () => {
  it("posts to the release endpoint and refreshes the run's employees and payslips", async () => {
    mockedPost.mockResolvedValue({ published: 1, total: 1, heldCount: 0, runStatus: "PAID" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const employeesKey = queryKeys.payroll.runEmployeesList(3, { limit: 20 });
    const payslipsKey = queryKeys.payroll.runPublications(3);
    client.setQueryData(employeesKey, { data: [] });
    client.setQueryData(payslipsKey, { items: [] });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useReleaseEmployeeHold(3, 9), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockedPost).toHaveBeenCalledWith(
      "/payroll/runs/3/employees/9/release",
      undefined,
      undefined,
      expect.anything(),
    );
    expect(client.getQueryState(employeesKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(payslipsKey)?.isInvalidated).toBe(true);
  });
});
