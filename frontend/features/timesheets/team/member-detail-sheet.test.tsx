/**
 * FE-TS-003 and FE-TS-004, the two defects the manager-facing detail sheet
 * carried together.
 *
 * FE-TS-003: the period read was gated on `timesheets:entries:view` alone, so a
 * manager holding only `team:view` got a disabled query — which reports
 * `isLoading: false` with no data, i.e. "no entries logged" for a timesheet
 * nobody ever asked the server for. The sheet now has to say which it is.
 *
 * FE-TS-004: "Remind" fired `toast.success("Reminder sent to …")` with no
 * request behind it. It now calls `POST /timesheets/team/remind`; the toast
 * belongs to the mutation hook, so the sheet itself must never toast.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { usePeriod, useCanViewPeriodDetail } from "@/hooks/api/timesheets-core/periods";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import { MemberDetailSheet } from "./member-detail-sheet";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/hooks/api/timesheets-core/periods", () => ({
  usePeriod: jest.fn(),
  useCanViewPeriodDetail: jest.fn(),
}));

const mutate = jest.fn();
jest.mock("@/hooks/api/timesheets-core/team", () => ({
  useRemindTeamMember: () => ({ mutate, isPending: false }),
}));

const canRemind = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canRemind(),
}));

const period = usePeriod as unknown as jest.Mock;
const canViewDetail = useCanViewPeriodDetail as unknown as jest.Mock;

const DRAFT: TimesheetPeriod = {
  id: 42,
  orgId: "org_1",
  userMembershipId: 201,
  periodStart: "2026-09-07",
  periodEnd: "2026-09-13",
  status: "DRAFT",
  totalHours: "0",
  billableHours: "0",
  nonBillableHours: "0",
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

function renderSheet() {
  return render(
    <MemberDetailSheet
      period={DRAFT}
      open
      onOpenChange={jest.fn()}
      memberName="Dana Reed"
      memberUserId="user-dana"
      weekStart="2026-09-07"
      weekEnd="2026-09-13"
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  canViewDetail.mockReturnValue(true);
  canRemind.mockReturnValue(true);
  period.mockReturnValue({ data: undefined, isLoading: false, isError: false });
});

describe("FE-TS-003 — period detail gate", () => {
  it("states the refusal instead of claiming the period is empty", () => {
    canViewDetail.mockReturnValue(false);
    renderSheet();

    expect(screen.getByText("Access restricted")).toBeInTheDocument();
    expect(screen.queryByText(/No entries logged this period/i)).not.toBeInTheDocument();
  });

  it("surfaces a failed read as a failure, not as an empty week", () => {
    period.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderSheet();

    expect(screen.getByText("Couldn't load this timesheet")).toBeInTheDocument();
    expect(screen.queryByText(/No entries logged this period/i)).not.toBeInTheDocument();
  });

  it("still shows the empty state when the read succeeded with no entries", () => {
    period.mockReturnValue({
      data: { period: DRAFT, entries: [] },
      isLoading: false,
      isError: false,
    });
    renderSheet();

    expect(screen.getByText(/No entries logged this period/i)).toBeInTheDocument();
    expect(screen.queryByText("Access restricted")).not.toBeInTheDocument();
  });
});

describe("FE-TS-004 — Remind", () => {
  it("sends a reminder for exactly the member and week the sheet shows", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /remind/i }));

    expect(mutate).toHaveBeenCalledWith({
      userId: "user-dana",
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      memberName: "Dana Reed",
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("offers no Remind control without timesheets:team:view", () => {
    canRemind.mockReturnValue(false);
    renderSheet();

    expect(screen.queryByRole("button", { name: /remind/i })).not.toBeInTheDocument();
  });
});
