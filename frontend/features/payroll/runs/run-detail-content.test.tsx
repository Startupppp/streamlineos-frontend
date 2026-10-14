import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const usePayrollRun = jest.fn();
jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRun: (...args: unknown[]) => usePayrollRun(...args),
}));

jest.mock("@/features/payroll/runs/run-actions-slot", () => ({ RunActionsSlot: () => null }));
jest.mock("@/features/payroll/runs/mobile-lifecycle-bar", () => ({ MobileLifecycleBar: () => null }));
jest.mock("@/features/payroll/payout", () => ({ ApprovalStagePanel: () => null, MarkPaidPanel: () => null }));
jest.mock("@/features/payroll/runs/employees-tab", () => ({ EmployeesTab: () => <div>employees-tab</div> }));
jest.mock("@/features/payroll/runs/exceptions-tab", () => ({ ExceptionsTab: () => null }));
jest.mock("@/features/payroll/runs/inputs-tab", () => ({ InputsTab: () => null }));
jest.mock("@/features/payroll/runs/variance-tab", () => ({ VarianceTab: () => null }));
jest.mock("@/features/payroll/shared/readiness-rail", () => ({ ReadinessRail: () => null }));

import { RunDetailContent } from "./run-detail-content";

const run = {
  id: 1,
  month: "2026-10",
  status: "EXCEPTIONS_FOUND",
  grossTotal: "1000.00",
  deductionTotal: "0.00",
  netTotal: "1000.00",
  employeeCount: 4,
  exceptionCount: 0,
};

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, error: null, refetch: jest.fn(), isRefetching: false, ...over };
}

describe("RunDetailContent (QA 2026-10-13)", () => {
  it("shows the loading shell, not 'Run not found', while the query is still pending", () => {
    usePayrollRun.mockReturnValue(state({ isPending: true }));
    render(<RunDetailContent runId={1} />);
    expect(screen.queryByText("Run not found")).toBeNull();
    expect(screen.getByText("Loading run…")).toBeInTheDocument();
  });

  it("keeps the last loaded run on screen when a refetch fails, with a Retry", () => {
    usePayrollRun.mockReturnValue(state({ data: { run }, error: new Error("500") }));
    render(<RunDetailContent runId={1} />);
    expect(screen.getByText("employees-tab")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't refresh this run");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Failed to load run")).toBeNull();
  });

  it("shows the error state only when no run ever loaded", () => {
    usePayrollRun.mockReturnValue(state({ error: new Error("500") }));
    render(<RunDetailContent runId={1} />);
    expect(screen.getByText("Failed to load run")).toBeInTheDocument();
  });
});
