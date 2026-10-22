import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const usePayrollRun = jest.fn();
jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRun: (...args: unknown[]) => usePayrollRun(...args),
}));

const allowed = { permission: "payroll:runs:view", allowed: true, denied: false, pending: false, unavailable: false };
const usePermissionGate = jest.fn(() => allowed);
const refetchAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => usePermissionGate(),
  useAccess: () => ({ refetch: refetchAccess }),
}));

jest.mock("@/features/payroll/runs/run-actions-slot", () => ({ RunActionsSlot: () => null }));
jest.mock("@/features/payroll/runs/mobile-lifecycle-bar", () => ({ MobileLifecycleBar: () => null }));
jest.mock("@/features/payroll/payout", () => ({ ApprovalStagePanel: () => null, MarkPaidPanel: () => null }));
jest.mock("@/features/payroll/runs/employees-tab", () => ({ EmployeesTab: () => <div>employees-tab</div> }));
jest.mock("@/features/payroll/runs/exceptions-tab", () => ({ ExceptionsTab: () => null }));
jest.mock("@/features/payroll/runs/blocker-fix-card", () => ({ BlockerFixCard: () => null }));
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
  return { data: undefined, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false, ...over };
}

describe("RunDetailContent (QA 2026-10-13)", () => {
  beforeEach(() => {
    usePermissionGate.mockReturnValue(allowed);
  });

  it("shows the loading shell, not 'Run not found', while access resolves (the read is still disabled)", () => {
    usePermissionGate.mockReturnValue({ ...allowed, allowed: false, pending: true });
    usePayrollRun.mockReturnValue(state({}));
    render(<RunDetailContent runId={1} />);
    expect(screen.queryByText("Run not found")).toBeNull();
    expect(screen.getByText("Loading run…")).toBeInTheDocument();
  });

  it("shows the loading shell while the run read is in flight", () => {
    usePayrollRun.mockReturnValue(state({ isLoading: true }));
    render(<RunDetailContent runId={1} />);
    expect(screen.getByText("Loading run…")).toBeInTheDocument();
  });

  it("BUG-017: a failed access read is an error with a Retry, not 'Loading run…' for ever", () => {
    usePermissionGate.mockReturnValue({ ...allowed, allowed: false, unavailable: true });
    usePayrollRun.mockReturnValue(state({}));
    render(<RunDetailContent runId={1} />);
    expect(screen.queryByText("Loading run…")).toBeNull();
    expect(screen.getByText("Failed to load run")).toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetchAccess).toHaveBeenCalled();
  });

  it("BUG-017: a denied reader sees a permission state, not 'Loading run…' for ever", () => {
    usePermissionGate.mockReturnValue({ ...allowed, allowed: false, denied: true });
    usePayrollRun.mockReturnValue(state({}));
    render(<RunDetailContent runId={1} />);
    expect(screen.queryByText("Loading run…")).toBeNull();
    expect(screen.queryByText("Run not found")).toBeNull();
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
