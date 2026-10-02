import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { useModuleEnabled } from "@/hooks/api/access";
import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedModule = useModuleEnabled as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BUG-HRMS-020: payroll readiness with Payroll off", () => {
  beforeEach(() => {
    mockedGet.mockReset().mockResolvedValue({ cutoff: null });
  });

  it("never calls /payroll/readiness when the payroll module is disabled", async () => {
    mockedModule.mockReturnValue(false);

    const { result } = renderHook(() => usePayrollReadiness("2026-10"), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedModule).toHaveBeenCalledWith("payroll");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("reads readiness when the module is on", async () => {
    mockedModule.mockReturnValue(true);

    renderHook(() => usePayrollReadiness("2026-10"), { wrapper });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    expect(mockedGet.mock.calls[0][0]).toBe("/payroll/readiness");
  });
});
