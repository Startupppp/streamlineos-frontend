import { render, screen, within } from "@testing-library/react";

import { useCancelLeave, useLeavePolicy } from "@/hooks/api/hr";
import { useMyApprover } from "@/hooks/api/hr/approvers";
import { useSession } from "next-auth/react";
import { LeavesTabContent } from "../leaves-tab-content";
import type { LeaveRequest } from "../leaves-shared";

jest.mock("@/hooks/api/hr", () => ({
  useCancelLeave: jest.fn(),
  useLeavePolicy: jest.fn(),
}));

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/lib/i18n/i18n", () => ({
  useT: () => (key: string) => key,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span className={className}>{text}</span>
  ),
}));

jest.mock("../leave-calendar-widget", () => ({
  LeaveCalendarWidget: () => null,
}));

const mockedCancelLeave = useCancelLeave as jest.Mock;
const mockedPolicy = useLeavePolicy as jest.Mock;
const mockedApprover = useMyApprover as jest.Mock;
const mockedSession = useSession as jest.Mock;

function pendingRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 1,
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    status: "PENDING",
    priority: null,
    reason: null,
    leaveType: { name: "Casual Leave" },
    ...overrides,
  };
}

beforeEach(() => {
  mockedCancelLeave.mockReturnValue({ mutate: jest.fn(), isPending: false, variables: null });
  mockedPolicy.mockReturnValue({ data: null });
  mockedApprover.mockReturnValue({ data: null });
  mockedSession.mockReturnValue({ data: { user: { id: "usr-1" } } });
});

describe("UX-09: mobile card layout at narrow viewport (FE-123 structural test)", () => {
  it("mounts the mobile card list and hides it above md breakpoint", () => {
    render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[pendingRequest()]}
        compact
      />,
    );

    const mobileList = screen.getByRole("list", { name: "My leave requests" });
    expect(mobileList).toBeInTheDocument();
    expect(mobileList.className).toContain("md:hidden");
  });

  it("shows the status badge in the narrow card", () => {
    render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[pendingRequest({ status: "PENDING" })]}
        compact
      />,
    );

    const mobileList = screen.getByRole("list", { name: "My leave requests" });
    expect(within(mobileList).getByText("Pending")).toBeInTheDocument();
  });

  it("shows the approved-by label in the narrow card when approver is hydrated", () => {
    render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[
          pendingRequest({
            status: "APPROVED",
            approver: { name: "Grace Hopper" },
          }),
        ]}
        compact
      />,
    );

    const mobileList = screen.getByRole("list", { name: "My leave requests" });
    expect(within(mobileList).getByText("Approved by Grace Hopper")).toBeInTheDocument();
  });

  it("makes the cancel button reachable in the narrow card for a pending request", () => {
    mockedApprover.mockReturnValue({
      data: { ownerSelfApproval: false, approver: null, queue: null },
    });

    render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[pendingRequest()]}
        compact
      />,
    );

    const mobileList = screen.getByRole("list", { name: "My leave requests" });
    expect(
      within(mobileList).getByRole("button", { name: /cancel request/i }),
    ).toBeInTheDocument();
  });

  it("names the leave type exactly as the request form does (HR-U-005)", () => {
    render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[pendingRequest()]}
        compact
      />,
    );

    const mobileList = screen.getByRole("list", { name: "My leave requests" });
    expect(within(mobileList).getByText("Casual Leave")).toBeInTheDocument();
    expect(screen.queryByText("Casual")).not.toBeInTheDocument();
  });

  it("the DataTable wrapper carries the hidden-below-md class", () => {
    const { container } = render(
      <LeavesTabContent
        balances={[]}
        myLeaveRequests={[pendingRequest()]}
        compact
      />,
    );

    const tableWrapper = container.querySelector(".hidden.md\\:flex");
    expect(tableWrapper).toBeInTheDocument();
  });
});
