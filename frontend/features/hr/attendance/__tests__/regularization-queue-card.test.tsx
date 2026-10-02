import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const applyMutate = jest.fn();
const rejectMutate = jest.fn();
const invalidateAttendanceDay = jest.fn();
const queueParams: Array<Record<string, unknown>> = [];

let queueRows: unknown[] = [];
let cutoff: { title: string; date: string } | null = null;

jest.mock("@/hooks/api/hr/attendance-regularization-queue", () => ({
  useHrRegularizationQueue: (params: Record<string, unknown>) => {
    queueParams.push(params);
    return {
      data: {
        data: queueRows,
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
  },
  useApplyRegularization: () => ({ mutate: applyMutate, isPending: false }),
  useRejectRegularization: () => ({ mutate: rejectMutate, isPending: false }),
}));

jest.mock("@/hooks/api/hr/attendance-day-invalidation", () => ({
  useInvalidateAttendanceDay: () => invalidateAttendanceDay,
}));

jest.mock("@/hooks/api/payroll/payroll-cutoff", () => ({
  usePayrollCutoff: () => ({ cutoff, month: "2026-10", isLoading: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "usr-admin" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

jest.mock("@/components/ui/select", () => {
  const Ctx = React.createContext<(v: string) => void>(() => {});
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (v: string) => void;
      value?: string;
    }) => <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div role="listbox">{children}</div>
    ),
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = React.useContext(Ctx);
      return (
        <button type="button" role="option" aria-selected={false} onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

import { RegularizationQueueCard } from "@/features/hr/attendance/regularization-queue-card";

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RegularizationQueueCard />
    </QueryClientProvider>,
  );
}

const PENDING_ROW = {
  id: 55,
  orgId: "org_1",
  userId: "usr-member",
  attendanceDate: "2026-10-09",
  requestedCheckIn: "2026-10-09T03:30:00.000Z",
  requestedCheckOut: "2026-10-09T12:30:00.000Z",
  reason: "Badge reader was down at the gate",
  status: "PENDING",
  workflowInstanceId: null,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  createdAt: "2026-10-09T13:00:00.000Z",
  updatedAt: "2026-10-09T13:00:00.000Z",
};

beforeEach(() => {
  queueRows = [PENDING_ROW];
  cutoff = null;
  queueParams.length = 0;
  applyMutate.mockReset();
  rejectMutate.mockReset();
  invalidateAttendanceDay.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("RegularizationQueueCard", () => {
  it("always reads a date range, defaulting to the current IST month", () => {
    renderCard();

    const params = queueParams[0];
    expect(params.startDate).toMatch(/^\d{4}-\d{2}-01$/);
    expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.status).toBe("PENDING");
    expect(params.limit).toBe(50);
  });

  it("omits the Pay cycle preset when no cycle is configured", () => {
    renderCard();

    expect(screen.getByRole("option", { name: "This month" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pay cycle" })).not.toBeInTheDocument();
  });

  it("offers the Pay cycle preset once a cycle exists", () => {
    cutoff = { title: "Payroll cutoff", date: "2026-10-25" };
    renderCard();

    expect(screen.getByRole("option", { name: "Pay cycle" })).toBeInTheDocument();
  });

  it("renders a pending correction as pending, never as approved", () => {
    renderCard();

    const list = screen.getByRole("list", { name: "Attendance corrections" });
    expect(within(list).getByText("Pending")).toBeInTheDocument();
    expect(within(list).queryByText("Approved")).not.toBeInTheDocument();
  });

  it("approves a correction and invalidates the attendance day", () => {
    applyMutate.mockImplementation(
      (_id: number, opts: { onSuccess: () => void }) => opts.onSuccess(),
    );
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(applyMutate.mock.calls[0][0]).toBe(55);
    expect(invalidateAttendanceDay).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("Correction approved and applied");
  });

  it("refuses a rejection with no reason", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /^Reject$/ }));
    const confirm = screen.getByRole("button", { name: /^Reject$/, hidden: false });

    fireEvent.click(confirm);
    expect(rejectMutate).not.toHaveBeenCalled();
  });

  it("sends the rejection reason once one is typed", () => {
    rejectMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess(),
    );
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /^Reject$/ }));
    fireEvent.change(screen.getByLabelText(/Rejection Reason/), {
      target: { value: "Times do not match the roster." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ }).at(-1)!);

    expect(rejectMutate.mock.calls[0][0]).toEqual({
      regularizationId: 55,
      rejectionReason: "Times do not match the roster.",
    });
    expect(invalidateAttendanceDay).toHaveBeenCalledTimes(1);
  });

  it("an approved row offers no second decision", () => {
    queueRows = [{ ...PENDING_ROW, status: "APPROVED" }];
    renderCard();

    const list = screen.getByRole("list", { name: "Attendance corrections" });
    expect(within(list).getByText("Approved")).toBeInTheDocument();
    expect(within(list).queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
  });
});
