import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useRunEmployee, useSetEmployeeHold } from "../run-employees";
import { useRunApprovals } from "../approvals";
import { usePayrollEarnings, usePayrollDeductions } from "../reports";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
    download: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("payroll request hygiene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({});
    mockedPost.mockResolvedValue({ ok: true });
  });

  it("useRunEmployee does not fetch while no employee is selected", async () => {
    const client = createClient();
    const { result } = renderHook(() => useRunEmployee(12, 0), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useRunEmployee fetches once a real employee id is provided", async () => {
    const client = createClient();
    const { result } = renderHook(() => useRunEmployee(12, 7), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/payroll/runs/12/employees/7");
  });

  it("useRunApprovals does not fetch when the panel is not visible", () => {
    const client = createClient();
    const { result } = renderHook(() => useRunApprovals(12, { enabled: false }), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("only the selected pivot report fetches", async () => {
    const client = createClient();
    const params = { month: "2026-07" };
    const { result } = renderHook(
      () => ({
        earnings: usePayrollEarnings(params, { enabled: true }),
        deductions: usePayrollDeductions(params, { enabled: false }),
      }),
      { wrapper: wrapperFor(client) },
    );

    await waitFor(() => expect(result.current.earnings.isSuccess).toBe(true));
    expect(result.current.deductions.fetchStatus).toBe("idle");
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/payroll/reports/earnings", params);
  });

  it("useSetEmployeeHold invalidates only run-scoped and command-center keys", async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSetEmployeeHold(12, 7), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ hold: true, reason: "verify bank" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => call[0]?.queryKey as readonly unknown[],
    );
    expect(invalidatedKeys).toContainEqual(queryKeys.payroll.runEmployeesAll(12));
    expect(invalidatedKeys).toContainEqual(queryKeys.payroll.run(12));
    expect(invalidatedKeys).toContainEqual(queryKeys.payroll.runExceptionsAll(12));
    expect(invalidatedKeys).toContainEqual(queryKeys.payroll.commandCenterAll);
    expect(invalidatedKeys).not.toContainEqual(queryKeys.payroll.all);
  });
});
