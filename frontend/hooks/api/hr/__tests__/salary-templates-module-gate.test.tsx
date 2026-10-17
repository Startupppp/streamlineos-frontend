import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { useSalaryStructureTemplates } from "@/hooks/api/hr/salary-structures";

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const enabledModules = new Set<string>();
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: (key: string) => enabledModules.has(key),
}));

describe("salary structure templates follow the backend's module gate", () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    enabledModules.clear();
    jest.mocked(apiClient.get).mockResolvedValue({ data: [], pagination: { nextCursor: null, hasMore: false } });
  });

  it("reads when payroll is on and HR is off", async () => {
    enabledModules.add("payroll");
    const { result } = renderHook(() => useSalaryStructureTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not read when payroll is off, even with HR on", () => {
    enabledModules.add("hr");
    renderHook(() => useSalaryStructureTemplates(), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
