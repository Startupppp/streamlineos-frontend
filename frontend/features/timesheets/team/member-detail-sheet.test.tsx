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
 * request behind it. The guard here is the general one: no success toast may
 * fire from this sheet at all, because it performs no mutation.
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
    <MemberDetailSheet period={DRAFT} open onOpenChange={jest.fn()} memberName="Dana Reed" />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  canViewDetail.mockReturnValue(true);
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
  it("does not claim a reminder was sent", async () => {
    renderSheet();
    const remind = screen.getByRole("button", { name: /remind/i });

    expect(remind).toBeDisabled();
    await userEvent.click(remind);

    expect(toast.success).not.toHaveBeenCalled();
  });
});
