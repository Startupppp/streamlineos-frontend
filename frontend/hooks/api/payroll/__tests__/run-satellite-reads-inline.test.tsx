import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { useRunApprovals } from "@/hooks/api/payroll/approvals";
import { usePayoutBatches } from "@/hooks/api/payroll/payout-batches";
import { usePayrollRunBlockers } from "@/hooks/api/payroll/readiness";
import { useRunEmployees, useRunVariance } from "@/hooks/api/payroll/run-employees";
import { useRunExceptions } from "@/hooks/api/payroll/run-exceptions";
import { useRunInputs } from "@/hooks/api/payroll/run-inputs";
import { usePayrollRun } from "@/hooks/api/payroll/runs";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

const READS: ReadonlyArray<[string, () => { isError: boolean }]> = [
  ["usePayrollRun", () => usePayrollRun(7)],
  ["useRunEmployees", () => useRunEmployees(7)],
  ["useRunVariance", () => useRunVariance(7)],
  ["useRunExceptions", () => useRunExceptions(7)],
  ["useRunInputs", () => useRunInputs(7)],
  ["useRunApprovals", () => useRunApprovals(7)],
  ["usePayrollRunBlockers", () => usePayrollRunBlockers("2026-10", 7)],
  ["usePayoutBatches", () => usePayoutBatches(7)],
];

describe("payroll run satellite reads keep a 5xx inline", () => {
  beforeEach(() => {
    jest.mocked(apiClient.get).mockRejectedValue(new ApiError("boom", 500));
  });

  it.each(READS)("%s reports isError instead of throwing to the route boundary", async (_name, useRead) => {
    const client = createAppQueryClient();
    client.setDefaultOptions({
      ...client.getDefaultOptions(),
      queries: { ...client.getDefaultOptions().queries, retry: false },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useRead, { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
