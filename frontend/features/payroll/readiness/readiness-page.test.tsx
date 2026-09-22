import React from "react";
import { render, screen } from "@testing-library/react";
import { PayrollReadinessPage } from "./readiness-page";
import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, subtitle, actions }: { children: React.ReactNode; title: React.ReactNode; subtitle: React.ReactNode; actions: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, children, onRetry }: { resolution: { kind: string }; loading: React.ReactNode; children: React.ReactNode; onRetry: () => void }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied") return <div role="status">Access Restricted</div>;
    if (resolution.kind === "error")
      return (
        <div role="alert">
          Could not load <button onClick={onRetry}>Retry</button>
        </div>
      );
    return <>{children}</>;
  },
}));

jest.mock("@/features/payroll/shared/month-picker", () => ({
  MonthPicker: ({ value }: { value: string }) => <div data-testid="month-picker">{value}</div>,
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUsePayrollReadiness = jest.fn();
jest.mock("@/hooks/api/payroll/readiness", () => ({
  usePayrollReadiness: (...args: [string]) => mockUsePayrollReadiness(...args),
}));

function ledger(overrides: Partial<PayrollReadiness> = {}): PayrollReadiness {
  return {
    month: "2026-09",
    window: { start: "2026-09-01", end: "2026-09-30" },
    cutoff: { type: "ATTENDANCE_CUTOFF", date: "2026-09-25", title: "Attendance cut-off" },
    timesheets: { unsubmitted: 2, awaitingApproval: 3, approved: 7, locked: 0, rejected: 0, approvedHoursNotExported: "12.50", approvedEntriesNotExported: 3 },
    inputs: { status: "open", lockedAt: null },
    run: null,
    stages: [
      {
        key: "timesheets_approved",
        label: "Timesheets approved",
        status: "pending",
        owner: { label: "Timesheet approvers", permission: "timesheets:approvals:manage" },
        at: null,
        detail: "3 awaiting a decision, 2 not yet submitted, 0 rejected.",
        action: { label: "Review 3 submitted", href: "/timesheets/approvals" },
      },
      {
        key: "timesheets_exported",
        label: "Hours exported to payroll",
        status: "done",
        owner: { label: "Timesheet administrator", permission: "timesheets:payroll:export" },
        at: "2026-09-14T09:00:00.000Z",
        detail: "Export #41 sent 40.00h for 1 workers.",
        action: { label: "Export approved hours", href: "/timesheets/payroll" },
      },
      {
        key: "handoff_received",
        label: "Received by payroll",
        status: "blocked",
        owner: { label: "Payroll administrator", permission: "payroll:runs:manage" },
        at: null,
        detail: "Export #41 has not been recorded by payroll yet.",
        action: null,
      },
    ],
    exports: [
      { id: 41, exportedAt: "2026-09-14T09:00:00.000Z", dateRangeStart: "2026-09-01", dateRangeEnd: "2026-09-30", entryCount: 5, totalHours: "40.00", workerCount: 1, receivedAt: null, ackStatus: null, ackAt: null, ackNote: null },
    ],
    exceptions: [
      {
        code: "PERIOD_CHANGED_AFTER_EXPORT",
        severity: "blocker",
        message: "Asha's 2026-09-07 to 2026-09-13 period is DRAFT but 40.00h from it went to payroll in export #41.",
        owner: { label: "Payroll administrator", permission: "payroll:runs:manage" },
        action: { label: "Reconcile period", href: "/timesheets/approvals?period=99" },
        period: { periodId: 99, userId: "usr-asha", userName: "Asha", userEmail: null, periodStart: "2026-09-07", periodEnd: "2026-09-13", status: "DRAFT", exportId: 41, exportedEntryCount: 5, exportedHours: "40.00", changedAt: "2026-09-18T10:00:00.000Z" },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePayrollReadiness.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("PayrollReadinessPage — one chain across timesheets and payroll", () => {
  it("keeps the title and month picker while loading, and shows no denial until access is known", () => {
    render(<PayrollReadinessPage />);

    expect(screen.getByRole("heading", { name: "Payroll readiness" })).toBeInTheDocument();
    expect(screen.getByTestId("month-picker")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows the denial the access snapshot resolved, never an empty ledger", () => {
    mockUsePayrollReadiness.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "payroll:runs:view" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("offers a retry when the ledger cannot be loaded", () => {
    const refetch = jest.fn();
    mockUsePayrollReadiness.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch });
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });

    render(<PayrollReadinessPage />);

    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("renders each stage with its owner and next action, the cut-off, the blockers and the export chain", () => {
    mockUsePayrollReadiness.mockReturnValue({ data: ledger(), isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText(/Attendance cut-off Sep 25/)).toBeInTheDocument();
    expect(screen.getByText("Timesheets approved")).toBeInTheDocument();
    expect(screen.getByText("Timesheet approvers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review 3 submitted" })).toHaveAttribute("href", "/timesheets/approvals");
    expect(screen.queryByRole("link", { name: "Export approved hours" })).not.toBeInTheDocument();
    expect(screen.getByText("Export #41 has not been recorded by payroll yet.")).toBeInTheDocument();
    expect(screen.getByText(/Asha's 2026-09-07 to 2026-09-13 period is DRAFT/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reconcile period" })).toHaveAttribute("href", "/timesheets/approvals?period=99");
    expect(screen.getByText("Awaiting payroll")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("says plainly when nothing needs attention and nothing was exported", () => {
    mockUsePayrollReadiness.mockReturnValue({ data: ledger({ exceptions: [], exports: [] }), isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("Nothing is missing from this pay period's inputs.")).toBeInTheDocument();
    expect(screen.getByText("No approved hours have been exported for this month yet.")).toBeInTheDocument();
  });
});
