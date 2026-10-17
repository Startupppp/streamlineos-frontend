import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  mockAccessModule,
  mockCutoffModule,
  mockHrModule,
  mockHrSettingsModule,
  mockLeavePage,
  mockLeaveRow,
  mockPageWrapperModule,
  mockQueryClientModule,
  mockQueueState,
  mockApproversModule,
  mockSessionModule,
  mockRegularizationModule,
  mockSonnerModule,
  mockWfhRow,
  mockEmployeeListModule,
  mockExpenseRow,
  mockExpensesModule,
  mockWorkflowsModule,
  resetMockQueueState,
} from "./queue-test-fixtures";
import { HrActionCenterPage } from "./action-center-page";

jest.mock("@/hooks/api/access", () => mockAccessModule());
jest.mock("@tanstack/react-query", () => mockQueryClientModule());
jest.mock("@/hooks/api/hr", () => mockHrModule());
jest.mock("@/hooks/api/hr/hr-settings", () => mockHrSettingsModule());
jest.mock("@/hooks/api/hr/attendance-regularization-queue", () =>
  mockRegularizationModule(),
);
jest.mock("@/hooks/api/hr/hr-workflows", () => mockWorkflowsModule());
jest.mock("@/hooks/api/hr/employee-list", () => mockEmployeeListModule());
jest.mock("@/hooks/api/hr/expenses", () => mockExpensesModule());
jest.mock("@/hooks/api/payroll/payroll-cutoff", () => mockCutoffModule());
jest.mock("@/components/ui/page-wrapper", () => mockPageWrapperModule());
jest.mock("sonner", () => mockSonnerModule());
jest.mock("next-auth/react", () => mockSessionModule());
jest.mock("@/hooks/api/hr/approvers", () => mockApproversModule());
jest.mock("@/features/hr/workflows/instance-detail-sheet", () => ({
  InstanceDetailSheet: () => null,
}));
jest.mock("@/features/hr/workflows/delegation-settings", () => ({
  DelegationSettings: () => null,
}));

const secondLeaveRow = {
  ...mockLeaveRow,
  id: 42,
  startDate: "2026-10-08",
  endDate: "2026-10-08",
};

beforeEach(() => {
  jest.clearAllMocks();
  resetMockQueueState();
});

describe("HR Action Center — inline decide", () => {
  it("offers no Approve or Reject on the viewer's own leave (QA 2026-10-13 P0)", () => {
    mockQueueState.sessionUserId = "usr-member";
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByText("Needs another approver")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("lets a sole owner decide their own leave when their leave route sends it back to them", async () => {
    mockQueueState.sessionUserId = "usr-member";
    mockQueueState.myLeaveRoute = { ownerSelfApproval: true, approver: { userId: "usr-member" } };
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);
    expect(screen.queryByText("Needs another approver")).not.toBeInTheDocument();
    expect(screen.getByText("Self-approval (no other approver)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(mockQueueState.approveLeave).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, approve my own request" }));

    await waitFor(() =>
      expect(mockQueueState.approveLeave).toHaveBeenCalledWith({ leaveId: 41, confirmSelfApproval: true }),
    );
  });

  it("explains why an own request is blocked when someone else can approve it", () => {
    mockQueueState.sessionUserId = "usr-member";
    mockQueueState.myLeaveRoute = { ownerSelfApproval: false, approver: { userId: "usr-manager" } };
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByText("Needs another approver")).toBeInTheDocument();
    expect(screen.getByText(/You can't decide your own request/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("approves on the row itself, with no drawer round trip", async () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mockQueueState.approveLeave).toHaveBeenCalledWith({ leaveId: 41 }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("will not submit a rejection without a reason", async () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Reject" });
    expect(
      within(dialog).getByText("Enter a reason to enable Reject."),
    ).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Reason"), {
      target: { value: "Coverage gap" },
    });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(mockQueueState.rejectLeave).toHaveBeenCalledWith({
        leaveId: 41,
        reason: "Coverage gap",
      }),
    );
  });

  it("approves an expense claim through the expense status endpoint", async () => {
    mockQueueState.expenseRows = [mockExpenseRow];

    render(<HrActionCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mockQueueState.updateExpenseStatus).toHaveBeenCalledWith({
        expenseId: 12,
        status: "APPROVED",
      }),
    );
  });

  it("rejects an expense claim with the reason", async () => {
    mockQueueState.expenseRows = [mockExpenseRow];

    render(<HrActionCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), {
      target: { value: "No receipt" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(mockQueueState.updateExpenseStatus).toHaveBeenCalledWith({
        expenseId: 12,
        status: "REJECTED",
        rejectionReason: "No receipt",
      }),
    );
  });

  it("drops the decided row and its count without waiting on a refetch", async () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow, secondLeaveRow]);

    render(<HrActionCenterPage />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);

    await waitFor(() =>
      expect(screen.getAllByRole("checkbox")).toHaveLength(1),
    );
  });

  it("offers no decide controls on a source the actor cannot decide", () => {
    mockQueueState.granted = new Set(["hr:leaves:view", "hr:attendance:view"]);
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
  });
});

describe("HRMS-025: own leave request in the queue", () => {
  it("hides Approve and Reject on a leave row submitted by the current user", () => {
    mockQueueState.sessionUserId = "usr-admin";
    const ownLeaveRow = { ...mockLeaveRow, id: 99, user: { id: "usr-admin", name: "Admin User", firstName: "Admin", lastName: "User", image: null } };
    mockQueueState.leavePages = mockLeavePage([ownLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("shows Approve and Reject for a different employee's leave", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });
});

describe("HR Action Center — bulk decide", () => {
  it("disables bulk while the selection mixes types, and says why", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);
    mockQueueState.wfhRows = [mockWfhRow];

    render(<HrActionCenterPage />);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Select Casual Leave from QA RoleMember/,
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Select Work from home from Ben Rao/,
      }),
    );

    expect(
      screen.getByText(/Bulk decide needs one request type/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve selected" }),
    ).toBeDisabled();
  });

  it("enables bulk for one source and type", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow, secondLeaveRow]);

    render(<HrActionCenterPage />);
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);

    expect(
      screen.getByRole("button", { name: "Approve selected" }),
    ).toBeEnabled();
  });

  it("reports a partial failure honestly instead of claiming success", async () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow, secondLeaveRow]);
    mockQueueState.approveLeave.mockImplementation(({ leaveId }) =>
      leaveId === 42
        ? Promise.reject(new Error("Already decided elsewhere"))
        : Promise.resolve({ success: true, leaveId }),
    );

    render(<HrActionCenterPage />);
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));

    await waitFor(() => expect(mockQueueState.toastError).toHaveBeenCalled());
    expect(mockQueueState.toastError.mock.calls[0][0]).toContain(
      "1 of 2 approved.",
    );
    expect(mockQueueState.toastSuccess).not.toHaveBeenCalled();
  });
});
