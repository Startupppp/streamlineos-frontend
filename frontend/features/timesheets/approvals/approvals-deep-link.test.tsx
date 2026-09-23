import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePermissionGate } from "@/hooks/api/access";
import { useApprovals } from "@/hooks/api/timesheets-core/approvals";
import { usePeriod } from "@/hooks/api/timesheets-core/periods";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import { ApprovalsView, linkedPeriodIdOf } from "./approvals-view";

const replace = jest.fn();
let periodParam: string | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/timesheets/approvals",
  useSearchParams: () => ({ get: (key: string) => (key === "period" ? periodParam : null) }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "usr_me" }, orgId: "org_1" } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {}, membershipId: 200 } }),
  useCan: () => true,
  useScope: () => "all",
  useModuleEnabled: () => true,
  usePermissionGate: jest.fn(),
}));

jest.mock("@/hooks/api/timesheets-core/approvals", () => ({
  APPROVALS_PAGE_SIZE: 25,
  useApprovals: jest.fn(),
  useBulkApprove: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkReject: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/timesheets-core/periods", () => ({
  usePeriod: jest.fn(),
}));

jest.mock("./approval-detail-sheet", () => ({
  ApprovalDetailSheet: ({ period, open, onOpenChange }: { period: TimesheetPeriod | null; open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div role="dialog" aria-label={`Period ${period?.id ?? "none"}`}>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

const gate = usePermissionGate as unknown as jest.Mock;
const approvals = useApprovals as unknown as jest.Mock;
const period = usePeriod as unknown as jest.Mock;

const LINKED: TimesheetPeriod = {
  id: 99,
  orgId: "org_1",
  userMembershipId: 201,
  periodStart: "2026-09-07",
  periodEnd: "2026-09-13",
  status: "SUBMITTED",
  totalHours: "40",
  billableHours: "32",
  nonBillableHours: "8",
  submittedAt: "2026-09-14T09:00:00.000Z",
  approvedAt: null,
  rejectedAt: null,
  lockedAt: null,
  currentApproverMembershipId: 200,
  approvalRoute: null,
  approvalDueAt: null,
  approvalEscalatedAt: null,
  rejectionReason: null,
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-14T09:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  periodParam = null;
  gate.mockReturnValue({ permission: "timesheets:approvals:view", allowed: true, denied: false, pending: false });
  approvals.mockReturnValue({
    data: { pages: [{ data: [], pagination: { limit: 25, nextCursor: null, hasMore: false } }], pageParams: [undefined] },
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  period.mockImplementation((periodId: number | null) => ({ data: periodId === 99 ? { period: LINKED, entries: [] } : undefined }));
});

describe("linkedPeriodIdOf parses only a positive integer id", () => {
  it.each([
    [null, null],
    ["99", 99],
    ["0", null],
    ["-4", null],
    ["abc", null],
    ["12abc", null],
  ])("%s → %s", (raw, expected) => {
    expect(linkedPeriodIdOf(raw)).toBe(expected);
  });
});

describe("the approvals queue honours ?period= from a notification or the payroll readiness ledger", () => {
  it("opens the linked period's detail sheet without a row click, and closing it drops the parameter", async () => {
    periodParam = "99";

    render(
      <TooltipProvider>
        <ApprovalsView />
      </TooltipProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Period 99" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/timesheets/approvals");
    expect(period).toHaveBeenLastCalledWith(null);
  });

  it("does not fetch or open anything when the parameter is absent or malformed", () => {
    periodParam = "not-a-period";

    render(
      <TooltipProvider>
        <ApprovalsView />
      </TooltipProvider>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(period).toHaveBeenCalledWith(null);
  });
});
