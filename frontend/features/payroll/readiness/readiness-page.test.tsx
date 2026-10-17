import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PayrollReadinessPage } from "./readiness-page";
import type { PayrollReadiness, RunBlocker } from "@/hooks/api/payroll/readiness-schema";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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

jest.mock("@/features/payroll/runs/run-actions-slot", () => ({
  RunActionsSlot: ({ run }: { run: { status: string } }) => <button>{run.status === "PREPARING" ? "Generate" : "Recalculate"}</button>,
}));

jest.mock("@/features/payroll/payout", () => ({
  SubmitApprovalAction: () => <button>Submit for Approval</button>,
  LockActions: () => <button>Lock Payroll</button>,
  ApprovalStagePanel: () => null,
  PublishPayslipsAction: () => <button>Release 3 payslips · 1 on hold</button>,
}));

const mockIsBelowLg = jest.fn();
jest.mock("@/hooks/common/use-mobile", () => ({ useIsBelowLg: () => mockIsBelowLg() }));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({ useCan: (...args: [string]) => mockUseCan(...args) }));

const mockUsePayrollReadiness = jest.fn();
const mockUsePayrollRunBlockers = jest.fn();
jest.mock("@/hooks/api/payroll/readiness", () => ({
  READINESS_PAGE_LIMIT: 100,
  usePayrollReadiness: (...args: [string]) => mockUsePayrollReadiness(...args),
  usePayrollRunBlockers: (...args: [string, number | null]) => mockUsePayrollRunBlockers(...args),
}));

const mockUseRunEmployees = jest.fn();
const mockUseRunVariance = jest.fn();
jest.mock("@/hooks/api/payroll/run-employees", () => ({
  useRunEmployees: (...args: unknown[]) => mockUseRunEmployees(...args),
  useRunVariance: (...args: unknown[]) => mockUseRunVariance(...args),
}));

const mockUsePayrollRun = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRun: (...args: unknown[]) => mockUsePayrollRun(...args),
  useCreateRun: () => ({ mutate: mockCreate, isPending: false }),
}));

const mockUsePolicy = jest.fn();
jest.mock("@/hooks/api/payroll/policies", () => ({ usePayrollPolicyCurrent: () => mockUsePolicy() }));

const mockUsePayoutBatches = jest.fn();
jest.mock("@/hooks/api/payroll/payout-batches", () => ({ usePayoutBatches: (...args: unknown[]) => mockUsePayoutBatches(...args) }));

function idle(data?: unknown) {
  return { data, isLoading: false, isError: false, error: undefined, dataUpdatedAt: 1_760_000_000_000, refetch: jest.fn() };
}

function pending() {
  return { data: undefined, isLoading: true, isError: false, error: undefined, dataUpdatedAt: 0, refetch: jest.fn() };
}

function runRef(status: string) {
  return { id: 12, status, createdAt: "2026-09-19T00:00:00.000Z" };
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
      { key: "timesheets_approved", label: "Timesheets approved", status: "pending", owner: { label: "Timesheet approvers", permission: "timesheets:approvals:manage" }, at: null, detail: "3 awaiting a decision.", action: { label: "Review 3 submitted", href: "/timesheets/approvals" } },
    ],
    exports: [],
    exceptions: [],
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

function rosterPage(count: number, held = 0) {
  return {
    data: Array.from({ length: count }, (_, index) => ({ id: index + 1, userId: `usr-${index}`, holdReason: index < held ? "On hold" : null })),
    pagination: { limit: 100, hasMore: false, nextCursor: null, total: count },
  };
}

function runDetail(status: string) {
  return { run: { id: 12, month: "2026-09", status, employeeCount: 4, grossTotal: "400000", deductionTotal: "40000", netTotal: "360000" } };
}

function renderAt(status: string | null, opts: { blockers?: RunBlocker[]; readiness?: Partial<PayrollReadiness> } = {}) {
  mockUsePayrollReadiness.mockReturnValue(idle(ledger({ run: status === null ? null : runRef(status), ...opts.readiness })));
  mockUsePayrollRunBlockers.mockReturnValue(idle(status === null ? undefined : blockerPage(opts.blockers ?? [])));
  mockUseRunEmployees.mockReturnValue(idle(status === null ? undefined : rosterPage(4, 1)));
  mockUsePayrollRun.mockReturnValue(idle(status === null ? undefined : runDetail(status)));
  mockUsePageState.mockReturnValue({ kind: "ready" });
  return render(<PayrollReadinessPage />);
}

function railItem(name: string) {
  return within(screen.getByRole("list", { name: "Month close checklist" })).getByText(name).closest("li")!;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsBelowLg.mockReturnValue(false);
  mockUseCan.mockReturnValue(true);
  mockUsePolicy.mockReturnValue(idle({ policy: { id: 1 } }));
  mockUsePayrollReadiness.mockReturnValue(pending());
  mockUsePayrollRunBlockers.mockReturnValue(pending());
  mockUseRunEmployees.mockReturnValue(pending());
  mockUsePayrollRun.mockReturnValue(idle(undefined));
  mockUseRunVariance.mockReturnValue(
    idle({
      currentRun: { id: 12, month: "2026-09", grossTotal: "400000", netTotal: "360000" },
      previousRun: { id: 11, month: "2026-08", grossTotal: "380000", netTotal: "342000" },
      topMovers: [{ userId: "u1", userName: "Asha", net: "120000", paidDays: "30", lopDays: "0", baselineSource: null, inputBaseline: null, netDeltaPercent: 4.5 }],
      lockedInputBaselinesUsed: false,
    }),
  );
  mockUsePayoutBatches.mockReturnValue(idle({ data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } }));
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("PayrollReadinessPage — page states", () => {
  it("keeps the title and month picker while loading", () => {
    render(<PayrollReadinessPage />);
    expect(screen.getByRole("heading", { name: "Close payroll" })).toBeInTheDocument();
    expect(screen.getByTestId("month-picker")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Month close checklist" })).not.toBeInTheDocument();
  });

  it("shows the denial the access snapshot resolved", () => {
    mockUsePayrollReadiness.mockReturnValue(idle(undefined));
    mockUsePageState.mockReturnValue({ kind: "denied" });
    render(<PayrollReadinessPage />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("offers a retry when readiness cannot be loaded at all", () => {
    const refetch = jest.fn();
    mockUsePayrollReadiness.mockReturnValue({ ...idle(undefined), isError: true, error: new Error("boom"), refetch });
    mockUsePageState.mockReturnValue({ kind: "error" });
    render(<PayrollReadinessPage />);
    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("sends an org without a payroll policy to setup instead of a checklist", () => {
    mockUsePolicy.mockReturnValue(idle({ policy: null }));
    renderAt(null);
    expect(screen.getByText("Payroll is not set up yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Month close checklist" })).not.toBeInTheDocument();
  });

  it("names the last good read when a refresh failed", () => {
    renderAt("DRAFT");
    mockUsePayrollReadiness.mockReturnValue({ ...idle(ledger({ run: runRef("DRAFT") })), isError: true });
    render(<PayrollReadinessPage />);
    expect(screen.getByRole("status", { name: "Readiness is out of date" })).toHaveTextContent(/This refresh failed/);
  });
});

describe("PayrollReadinessPage — one current step, one primary action", () => {
  it("opens the month with Create run when no run exists, and locks everything after it", () => {
    renderAt(null);
    expect(screen.getByRole("button", { name: "Create run" })).toBeInTheDocument();
    expect(railItem("3. Process")).toHaveTextContent("Create this month's run first");
    expect(railItem("6. Pay")).toHaveTextContent("Approve and lock the run first");
    fireEvent.click(screen.getByRole("button", { name: "Create run" }));
    expect(mockCreate).toHaveBeenCalledWith(mockUsePayrollReadiness.mock.calls[0][0], expect.anything());
  });

  it("hides Create run from a role that cannot create runs", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payroll:runs:create");
    renderAt(null);
    expect(screen.queryByRole("button", { name: "Create run" })).not.toBeInTheDocument();
    expect(screen.getByText(/Someone who can create payroll runs/)).toBeInTheDocument();
  });

  it("asks for a cut-off instead of inventing one", () => {
    renderAt(null, { readiness: { cutoff: null } });
    expect(screen.getByText(/This cycle has no cut-off date/)).toBeInTheDocument();
  });

  it("holds Process behind open blockers and names them, with the ledger inside the checklist", () => {
    renderAt("DRAFT", { blockers: [runBlocker()] });
    expect(railItem("3. Process")).toHaveTextContent("Clear 1 open blocker first");
    expect(screen.getByRole("link", { name: "Fix next blocker" })).toHaveAttribute("href", "/payroll/runs/12?tab=exceptions");
    expect(screen.getAllByText("Ravi").length).toBeGreaterThan(0);
    expect(screen.getByText("Timesheets approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Recalculate|Generate/ })).not.toBeInTheDocument();
  });

  it("offers Generate once nothing blocks a preparing run", () => {
    renderAt("PREPARING");
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fix next blocker" })).not.toBeInTheDocument();
  });

  it("offers Submit for approval on a preview and collapses Compare to its numbers", () => {
    renderAt("PREVIEW_READY");
    expect(screen.getByRole("button", { name: "Submit for Approval" })).toBeInTheDocument();
    expect(railItem("4. Compare")).toHaveTextContent(/vs/);
    expect(screen.queryByRole("button", { name: "Lock Payroll" })).not.toBeInTheDocument();
  });

  it("offers Lock once approved", () => {
    renderAt("APPROVED");
    expect(screen.getByRole("button", { name: "Lock Payroll" })).toBeInTheDocument();
  });

  it("sends a locked run to bank transfers to pay", () => {
    renderAt("LOCKED");
    expect(screen.getByRole("link", { name: "Create payout batch" })).toHaveAttribute("href", "/payroll/bank-transfers?runId=12");
  });

  it("releases payslips once paid and counts who is held", () => {
    renderAt("PAID");
    expect(screen.getByRole("button", { name: "Release 3 payslips · 1 on hold" })).toBeInTheDocument();
    expect(screen.getByText(/1 employee is on hold/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review holds" })).toHaveAttribute("href", "/payroll/runs/12?tab=employees");
  });

  it("shows no primary action once payslips are published", () => {
    renderAt("PAYSLIPS_PUBLISHED");
    expect(screen.getByText(/This month is closed for payroll/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Release \d|Submit|Lock|Generate|Create run)/ })).not.toBeInTheDocument();
  });

  it("opens a completed step for review without its action", () => {
    renderAt("LOCKED");
    fireEvent.click(within(railItem("4. Compare")).getByRole("button"));
    expect(screen.getByRole("region", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the full variance" })).toHaveAttribute("href", "/payroll/runs/12?tab=variance");
  });

  it("renders the current step inline under its row on a phone", () => {
    mockIsBelowLg.mockReturnValue(true);
    renderAt("PREPARING");
    const list = screen.getByRole("list", { name: "Month close checklist" });
    expect(within(list).getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });
});

describe("PayrollReadinessPage — People & salaries row", () => {
  function renderWith(people: PayrollReadiness["people"]) {
    renderAt("DRAFT", { readiness: { people } });
    return screen.getByRole("region", { name: "People and salaries" });
  }

  function sample(name: string) {
    return { organizationPersonId: `op-${name}`, displayName: name, payee: { kind: "user" as const, userId: `u-${name}` } };
  }

  it("names the people who can be paid but have no salary, and makes that the next fix", () => {
    const row = renderWith({
      payable: 9,
      withSalary: 2,
      payableWithoutSalary: 7,
      needsPayeeLink: 0,
      payableWithoutSalarySample: ["Asha", "Ravi", "Meera", "Kiran", "Dev", "Nina"].map(sample),
    });
    expect(row).toHaveTextContent("7 people can be paid but have no salary: Asha, Ravi, Meera, Kiran, Dev and 2 more");
    expect(screen.getByRole("link", { name: "Assign salaries" })).toHaveAttribute("href", "/payroll/employees");
    expect(screen.getByRole("link", { name: "Fix next blocker" })).toHaveAttribute("href", "/payroll/employees");
  });

  it("says no one can be paid yet and points at Directory once", () => {
    const row = renderWith({ payable: 0, withSalary: 0, payableWithoutSalary: 0, needsPayeeLink: 3, payableWithoutSalarySample: [] });
    expect(row).toHaveTextContent("No one can be paid yet");
    expect(within(row).getAllByRole("link", { name: "Open Directory" })).toHaveLength(1);
  });
});
