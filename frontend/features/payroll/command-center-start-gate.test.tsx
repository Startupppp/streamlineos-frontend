import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const allowed = { permission: "payroll:runs:view", allowed: true, denied: false, pending: false, unavailable: false };
const gate = jest.fn(() => allowed);
const refetchAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => gate(),
  useAccess: () => ({ refetch: refetchAccess }),
  useCan: () => true,
}));

const commandCenter = jest.fn();
jest.mock("@/hooks/api/payroll/command-center", () => ({ useCommandCenter: () => commandCenter() }));
jest.mock("@/hooks/api/payroll/policies", () => ({
  usePayrollPolicyCurrent: () => ({ data: { policy: { id: 1 } }, isLoading: false }),
}));
jest.mock("@/hooks/api/payroll/runs", () => ({ useCreateRun: () => ({ mutate: jest.fn(), isPending: false }) }));
jest.mock("@/features/payroll/setup-tour/payroll-setup-tour", () => ({ PayrollSetupTour: () => null }));
jest.mock("@/features/payroll/runs/command-center-panels", () => ({ CommandCenterPanels: () => null }));
jest.mock("@/features/payroll/shared/readiness-rail", () => ({ ReadinessRail: () => null }));
jest.mock("@/features/payroll/shared/month-picker", () => ({ MonthPicker: () => null }));

import { PayrollCommandCenterPage } from "./command-center-page";

const noRunYet = {
  header: {
    runId: null,
    month: "2026-10",
    status: null,
    grossTotal: "0",
    deductionTotal: "0",
    netTotal: "0",
    employerCostTotal: "0",
    employeeCount: 0,
    exceptionCounts: { BLOCKER: 0, WARNING: 0, INFO: 0 },
  },
  checklist: [],
  panels: {
    runStatus: null,
    topExceptions: [],
    varianceSummary: null,
    pendingApprovals: [],
    payoutReadiness: false,
    statutoryReadiness: { taxDeclarationsLocked: false, packComplianceChecklist: [] },
  },
  upcomingCalendarEvents: [],
};

describe("BUG-016 payroll command center start control", () => {
  beforeEach(() => {
    gate.mockReturnValue(allowed);
    commandCenter.mockReturnValue({ data: noRunYet, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  });

  it("offers Start Payroll Run for a month with no run once the policy is set up", () => {
    render(<PayrollCommandCenterPage />);
    expect(screen.getByRole("button", { name: /start payroll run/i })).toBeInTheDocument();
    expect(screen.queryByText(/checking payroll setup/i)).toBeNull();
    expect(screen.queryByText(/add salary profiles/i)).toBeNull();
  });

  it("a failed access read is an error with a retry, not 'Access Denied'", () => {
    gate.mockReturnValue({ ...allowed, allowed: false, unavailable: true });
    commandCenter.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<PayrollCommandCenterPage />);
    expect(screen.queryByText("Access Denied")).toBeNull();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetchAccess).toHaveBeenCalled();
  });

  it("does not show the pre-setup empty state while access is still resolving", () => {
    gate.mockReturnValue({ ...allowed, allowed: false, pending: true });
    commandCenter.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<PayrollCommandCenterPage />);
    expect(screen.queryByText("Access Denied")).toBeNull();
    expect(screen.queryByText(/set up payroll in minutes/i)).toBeNull();
  });
});
