import { render, screen } from "@testing-library/react";
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
  mockRegularizationModule,
  mockRegularizationRow,
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
jest.mock("@/features/hr/workflows/instance-detail-sheet", () => ({
  InstanceDetailSheet: () => null,
}));
jest.mock("@/features/hr/workflows/delegation-settings", () => ({
  DelegationSettings: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetMockQueueState();
});

describe("HR Action Center — one mixed queue", () => {
  it("lists leave, WFH and attendance rows in a single queue", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);
    mockQueueState.wfhRows = [mockWfhRow];
    mockQueueState.regularizationRows = [mockRegularizationRow];

    render(<HrActionCenterPage />);

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
    expect(screen.getByText("Work from home")).toBeInTheDocument();
    expect(screen.getByText("Attendance regularization")).toBeInTheDocument();
  });

  it("offers no cutoff facet, chip or banner when no cycle is configured", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(
      screen.queryByRole("button", { name: /affects cutoff/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/affects cutoff/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/next cutoff/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/payroll cutoff/i)).not.toBeInTheDocument();
  });

  it("marks a row and banners the count when a cutoff exists", () => {
    mockQueueState.cutoff = {
      title: "Payroll inputs",
      date: "2026-10-25T00:00:00.000Z",
    };
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(
      screen.getByRole("button", { name: /Affects cutoff/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Affects cutoff")).toHaveLength(2);
    expect(screen.getByText(/item affects cutoff/i)).toBeInTheDocument();
  });

  it("shows no money on an expense row from the workflow inbox", () => {
    mockQueueState.inboxRows = [
      {
        id: 9,
        objectType: "expense_reimbursement",
        requestedBy: "usr-ben",
        currentStepOrder: 2,
        createdAt: "2026-09-30T09:00:00.000Z",
        context: { amountMinor: 450000, currency: "INR" },
        requester: { id: "usr-ben", name: "Ben Rao" },
      },
    ];

    render(<HrActionCenterPage />);

    expect(screen.getByText("Expense Reimbursement")).toBeInTheDocument();
    expect(screen.queryByText(/4,?500/)).not.toBeInTheDocument();
    expect(screen.queryByText(/INR/)).not.toBeInTheDocument();
  });
});

describe("HR Action Center — expense claims", () => {
  it("lists a pending expense claim with its amount and an Expense filter", () => {
    mockQueueState.expenseRows = [mockExpenseRow];

    render(<HrActionCenterPage />);

    expect(screen.getByText("Expense claim")).toBeInTheDocument();
    expect(screen.getByText(/Travel/)).toBeInTheDocument();
    expect(screen.getAllByText("Expense").length).toBeGreaterThan(0);
  });

  it("keeps the other kinds and flags only expenses when the expense read fails", () => {
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);
    mockQueueState.expenseError = true;

    render(<HrActionCenterPage />);

    expect(screen.getByText("Casual Leave")).toBeInTheDocument();
    expect(screen.getByText(/Expense claims could not be loaded/)).toBeInTheDocument();
  });

  it("names the expense permission when the role cannot approve claims", () => {
    mockQueueState.granted.delete("hr:expenses:approve");
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByText(/hr:expenses:approve/)).toBeInTheDocument();
  });
});

describe("HR Action Center — the clear claim", () => {
  it("does not claim clear while another source still holds work", () => {
    mockQueueState.wfhRows = [mockWfhRow];

    render(<HrActionCenterPage />);

    expect(screen.queryByText(/you're clear/i)).not.toBeInTheDocument();
    expect(screen.getByText("Ben Rao")).toBeInTheDocument();
  });

  it("claims clear only when every source is settled, allowed and empty", () => {
    render(<HrActionCenterPage />);

    expect(screen.getByText("You're clear.")).toBeInTheDocument();
    expect(
      screen.getByText("Nothing pending that blocks payroll inputs."),
    ).toBeInTheDocument();
  });

  it("drops the cutoff sentence rather than printing a placeholder", () => {
    render(<HrActionCenterPage />);

    expect(screen.queryByText(/next cutoff/i)).not.toBeInTheDocument();
  });

  it("names the cutoff in the clear copy when a cycle is configured", () => {
    mockQueueState.cutoff = {
      title: "Payroll inputs",
      date: "2026-10-25T00:00:00.000Z",
    };

    render(<HrActionCenterPage />);

    expect(
      screen.getByText(
        /Next cutoff: .*Nothing pending that blocks payroll inputs\./,
      ),
    ).toBeInTheDocument();
  });
});

describe("HR Action Center — per-source permission", () => {
  it("keeps the leave queue for a holder of only hr:leaves:approve", () => {
    mockQueueState.granted = new Set(["hr:leaves:view", "hr:leaves:approve"]);
    mockQueueState.inboxDenied = true;
    mockQueueState.leavePages = mockLeavePage([mockLeaveRow]);

    render(<HrActionCenterPage />);

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
    expect(screen.getByText(/Other requests is not shown/)).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("refuses to claim an empty queue when a source is denied", () => {
    mockQueueState.granted = new Set(["hr:leaves:view", "hr:leaves:approve"]);
    mockQueueState.inboxDenied = true;

    render(<HrActionCenterPage />);

    expect(screen.queryByText("You're clear.")).not.toBeInTheDocument();
    expect(
      screen.getByText("Nothing pending in the queues you can see"),
    ).toBeInTheDocument();
  });

  it("hides My delegations, whose endpoints need hr:workflows:view", () => {
    mockQueueState.granted = new Set(["hr:leaves:view", "hr:leaves:approve"]);

    render(<HrActionCenterPage />);

    expect(
      screen.queryByRole("button", { name: /my delegations/i }),
    ).not.toBeInTheDocument();
  });

  it("states the whole-page refusal only when every source is denied", () => {
    mockQueueState.granted = new Set();
    mockQueueState.inboxDenied = true;

    render(<HrActionCenterPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });
});
