import React from "react";
import { render, screen } from "@testing-library/react";
import { PayrollReadinessPage } from "./readiness-page";
import type { PayrollReadiness, RunBlocker } from "@/hooks/api/payroll/readiness-schema";

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

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: [string]) => mockUseCan(...args),
}));

const mockUsePayrollReadiness = jest.fn();
const mockUsePayrollRunBlockers = jest.fn();
jest.mock("@/hooks/api/payroll/readiness", () => ({
  READINESS_PAGE_LIMIT: 100,
  usePayrollReadiness: (...args: [string]) => mockUsePayrollReadiness(...args),
  usePayrollRunBlockers: (...args: [string, number | null]) => mockUsePayrollRunBlockers(...args),
}));

const mockUseRunEmployees = jest.fn();
jest.mock("@/hooks/api/payroll/run-employees", () => ({
  useRunEmployees: (...args: unknown[]) => mockUseRunEmployees(...args),
}));

function idle(data?: unknown) {
  return { data, isLoading: false, isError: false, error: undefined, dataUpdatedAt: 1_760_000_000_000, refetch: jest.fn() };
}

function pending() {
  return { data: undefined, isLoading: true, isError: false, error: undefined, dataUpdatedAt: 0, refetch: jest.fn() };
}

function ledger(overrides: Partial<PayrollReadiness> = {}): PayrollReadiness {
  return {
    month: "2026-09",
    window: { start: "2026-09-01", end: "2026-09-30" },
    cutoff: { type: "ATTENDANCE_CUTOFF", date: "2026-09-25", title: "Attendance cut-off" },
    timesheets: { unsubmitted: 2, awaitingApproval: 3, approved: 7, locked: 0, rejected: 0, approvedHoursNotExported: "12.50", approvedEntriesNotExported: 3 },
    inputs: { status: "open", lockedAt: null },
    run: null,
    stages: [
      { key: "timesheets_approved", label: "Timesheets approved", status: "pending", owner: { label: "Timesheet approvers", permission: "timesheets:approvals:manage" }, at: null, detail: "3 awaiting a decision, 2 not yet submitted, 0 rejected.", action: { label: "Review 3 submitted", href: "/timesheets/approvals" } },
      { key: "timesheets_exported", label: "Hours exported to payroll", status: "done", owner: { label: "Timesheet administrator", permission: "timesheets:payroll:export" }, at: "2026-09-14T09:00:00.000Z", detail: "Export #41 sent 40.00h for 1 workers.", action: { label: "Export approved hours", href: "/timesheets/payroll" } },
      { key: "handoff_received", label: "Received by payroll", status: "blocked", owner: { label: "Payroll administrator", permission: "payroll:runs:manage" }, at: null, detail: "Export #41 has not been recorded by payroll yet.", action: null },
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
    people: { payable: 4, withSalary: 4, payableWithoutSalary: 0, needsPayeeLink: 0, payableWithoutSalarySample: [] },
    ...overrides,
  };
}

function runBlocker(overrides: Partial<RunBlocker> = {}): RunBlocker {
  return {
    id: 7,
    code: "MISSING_BANK_ACCOUNT",
    severity: "BLOCKER",
    status: "OPEN",
    message: "Employee has no bank account on file. Cannot disburse salary.",
    metadata: null,
    userId: "usr-ravi",
    resolvedBy: null,
    resolvedAt: null,
    overrideReason: null,
    createdAt: "2026-09-20T06:00:00.000Z",
    userName: "Ravi",
    userEmail: "ravi@example.com",
    ...overrides,
  };
}

function blockerPage(blockers: RunBlocker[], hasMore = false) {
  return { data: blockers, pagination: { limit: 100, hasMore, nextCursor: null, total: blockers.length } };
}

function rosterPage(count: number, hasMore = false, total = count) {
  return {
    data: Array.from({ length: count }, (_, index) => ({ id: index + 1, userId: `usr-${index}`, userName: `Person ${index}` })),
    pagination: { limit: 100, hasMore, nextCursor: null, total },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUsePayrollReadiness.mockReturnValue(pending());
  mockUsePayrollRunBlockers.mockReturnValue(pending());
  mockUseRunEmployees.mockReturnValue(pending());
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("PayrollReadinessPage — honest readiness board", () => {
  it("keeps the title and month picker while loading, and shows no denial until access is known", () => {
    render(<PayrollReadinessPage />);

    expect(screen.getByRole("heading", { name: "Payroll readiness" })).toBeInTheDocument();
    expect(screen.getByTestId("month-picker")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("never flashes a Ready pill or a zero blocker count while loading", () => {
    render(<PayrollReadinessPage />);

    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Blocked")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the denial the access snapshot resolved, never an empty ledger", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "payroll:runs:view" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("offers a retry when the board cannot be loaded at all", () => {
    const refetch = jest.fn();
    mockUsePayrollReadiness.mockReturnValue({ ...idle(undefined), isError: true, error: new Error("boom"), refetch });
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });

    render(<PayrollReadinessPage />);

    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("renders the handoff chain, the blocker row and the export evidence from real data", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ run: { id: 12, status: "DRAFT", createdAt: "2026-09-19T00:00:00.000Z" } })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(blockerPage([runBlocker()])));
    mockUseRunEmployees.mockReturnValue(idle(rosterPage(3)));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("Timesheets approved")).toBeInTheDocument();
    expect(screen.getByText("Timesheet approvers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review 3 submitted" })).toHaveAttribute("href", "/timesheets/approvals");
    expect(screen.getAllByText(/Asha's 2026-09-07 to 2026-09-13 period is DRAFT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ravi").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no bank account on file/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Fix" })[0]).toHaveAttribute("href", "/payroll/runs/12?tab=exceptions");
    expect(screen.getByText("Awaiting payroll")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("labels every category it cannot source as Not measured and leaves it inert", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger()));
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    for (const label of ["Overtime", "Reimbursements", "F&F", "Leave / LOP", "Joiners", "Exits", "Bank / KYC", "Structure"]) {
      expect(screen.queryByRole("button", { name: new RegExp(label) })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Attendance/ })).toBeInTheDocument();
    expect(screen.getAllByText("Not measured").length).toBeGreaterThan(8);
  });

  it("never paints Ready when a refresh failed, and names the last good read", () => {
    mockUsePayrollReadiness.mockReturnValue({ ...idle(ledger({ exceptions: [] })), isError: true });
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByRole("status", { name: "Readiness is out of date" })).toHaveTextContent(/This refresh failed/);
    expect(screen.getByText("Out of date")).toBeInTheDocument();
    expect(screen.queryByText(/employees in cycle are ready/)).not.toBeInTheDocument();
  });

  it("invents no cut-off date when the cycle has none, and asks for one instead", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ cutoff: null })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("This cycle has no cut-off date")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Payroll cutoff/)).not.toBeInTheDocument();
  });

  it("hides the run affordance from a role without payroll:runs:create", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger()));
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.queryByRole("link", { name: "Start a run" })).not.toBeInTheDocument();

    mockUseCan.mockReturnValue(true);
    render(<PayrollReadinessPage />);

    expect(screen.getAllByRole("link", { name: "Start a run" }).length).toBe(1);
  });

  it("counts the whole cycle from the server total even when the roster pages", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ exceptions: [], run: { id: 12, status: "DRAFT", createdAt: "2026-09-19T00:00:00.000Z" } })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(blockerPage([])));
    mockUseRunEmployees.mockReturnValue(idle(rosterPage(100, true, 212)));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText("All 212 employees in cycle are ready.")).toBeInTheDocument();
    expect(screen.queryByText(/The number of employees in it is not/)).not.toBeInTheDocument();
  });

  it("still refuses a population the roster read has not delivered at all", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ exceptions: [], run: { id: 12, status: "DRAFT", createdAt: "2026-09-19T00:00:00.000Z" } })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(blockerPage([])));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getByText(/The number of employees in it is not/)).toBeInTheDocument();
  });

  it("claims no readiness while the blocker list is truncated, because the blocker count is then a floor", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ exceptions: [], run: { id: 12, status: "DRAFT", createdAt: "2026-09-19T00:00:00.000Z" } })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(blockerPage([], true)));
    mockUseRunEmployees.mockReturnValue(idle(rosterPage(4)));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.queryByText("All 4 employees in cycle are ready.")).not.toBeInTheDocument();
    expect(screen.getByText(/Whether every blocker has been seen is not/)).toBeInTheDocument();
  });

  it("shows the waiver the payload recorded, with its reason", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ exceptions: [], run: { id: 12, status: "DRAFT", createdAt: "2026-09-19T00:00:00.000Z" } })));
    mockUsePayrollRunBlockers.mockReturnValue(
      idle(blockerPage([runBlocker({ status: "OVERRIDDEN", overrideReason: "Paid by cheque this month" })])),
    );
    mockUseRunEmployees.mockReturnValue(idle(rosterPage(4)));
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<PayrollReadinessPage />);

    expect(screen.getAllByText("Waived").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Paid by cheque this month").length).toBeGreaterThan(0);
  });
});

describe("PayrollReadinessPage — People & salaries row", () => {
  function renderWith(people: PayrollReadiness["people"]) {
    mockUsePayrollReadiness.mockReturnValue(idle(ledger({ people })));
    mockUsePayrollRunBlockers.mockReturnValue(idle(undefined));
    mockUseRunEmployees.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<PayrollReadinessPage />);
    return screen.getByRole("region", { name: "People and salaries" });
  }

  function sample(name: string) {
    return { organizationPersonId: `op-${name}`, displayName: name, payee: { kind: "user" as const, userId: `u-${name}` } };
  }

  it("names the people who can be paid but have no salary and links to assign them", () => {
    const row = renderWith({
      payable: 9,
      withSalary: 2,
      payableWithoutSalary: 7,
      needsPayeeLink: 0,
      payableWithoutSalarySample: ["Asha", "Ravi", "Meera", "Kiran", "Dev", "Nina"].map(sample),
    });

    expect(row).toHaveTextContent("7 people can be paid but have no salary: Asha, Ravi, Meera, Kiran, Dev and 2 more");
    expect(row).not.toHaveTextContent("Nina");
    expect(screen.getByRole("link", { name: "Assign salaries" })).toHaveAttribute("href", "/payroll/employees");
  });

  it("says no one can be paid yet and points at Directory once", () => {
    const row = renderWith({ payable: 0, withSalary: 0, payableWithoutSalary: 0, needsPayeeLink: 3, payableWithoutSalarySample: [] });

    expect(row).toHaveTextContent("No one can be paid yet");
    expect(row).toHaveTextContent("3 people in Directory aren't payable yet.");
    expect(screen.getAllByRole("link", { name: "Open Directory" })).toHaveLength(1);
  });

  it("adds the not-payable count as secondary info beside a green verdict", () => {
    const row = renderWith({ payable: 4, withSalary: 4, payableWithoutSalary: 0, needsPayeeLink: 1, payableWithoutSalarySample: [] });

    expect(row).toHaveTextContent("4 people ready, all with salaries");
    expect(row).toHaveTextContent("1 person in Directory isn't payable yet.");
    expect(screen.getByRole("link", { name: "Open Directory" })).toHaveAttribute("href", "/directory");
    expect(screen.queryByRole("link", { name: "Assign salaries" })).not.toBeInTheDocument();
  });
});
