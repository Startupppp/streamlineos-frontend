import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import { PeriodLifecycleActions } from "./period-lifecycle-actions";

const canManage = jest.fn();
jest.mock("@/hooks/api/access", () => ({ useCan: () => canManage() }));

const mutate: Record<string, jest.Mock> = { lock: jest.fn(), unlock: jest.fn(), reopen: jest.fn() };
jest.mock("@/hooks/api/timesheets-core/periods", () => ({
  usePeriodLifecycle: (action: string) => ({ mutate: mutate[action], isPending: false }),
}));

jest.mock("@/components/ui/sheet", () => ({
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function period(status: TimesheetPeriod["status"]): TimesheetPeriod {
  return {
    id: 42,
    orgId: "org_1",
    userMembershipId: 201,
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    status,
    totalHours: "40",
    billableHours: "30",
    nonBillableHours: "10",
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    lockedAt: null,
    currentApproverMembershipId: null,
    approvalRoute: null,
    rejectionReason: null,
    approvalDueAt: null,
    approvalEscalatedAt: null,
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-07T00:00:00.000Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  canManage.mockReturnValue(true);
});

describe("PeriodLifecycleActions", () => {
  it("offers Lock and Reopen on an approved period, and locks only after confirming", async () => {
    render(<PeriodLifecycleActions period={period("APPROVED")} onDone={jest.fn()} />);

    expect(screen.queryByRole("button", { name: "Unlock" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(mutate.lock).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Lock" }));
    expect(mutate.lock).toHaveBeenCalledWith(42, expect.anything());
  });

  it("offers Unlock, not Lock, on a locked period", () => {
    render(<PeriodLifecycleActions period={period("LOCKED")} onDone={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock" })).not.toBeInTheDocument();
  });

  it("renders nothing for a submitted period or without approvals:manage", () => {
    const { rerender, container } = render(
      <PeriodLifecycleActions period={period("SUBMITTED")} onDone={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();

    canManage.mockReturnValue(false);
    rerender(<PeriodLifecycleActions period={period("APPROVED")} onDone={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
