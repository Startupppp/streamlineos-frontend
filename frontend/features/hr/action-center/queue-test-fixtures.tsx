import React from "react";

interface MockQueueState {
  leavePages: unknown[];
  wfhRows: unknown[];
  regularizationRows: unknown[];
  inboxRows: unknown[];
  expenseRows: unknown[];
  expenseError: boolean;
  updateExpenseStatus: jest.Mock;
  directory: unknown[];
  cutoff: { title: string; date: string } | null;
  granted: Set<string>;
  inboxDenied: boolean;
  approveLeave: jest.Mock<Promise<{ success: boolean; leaveId: number }>, [{ leaveId: number }]>;
  rejectLeave: jest.Mock;
  processWfh: jest.Mock;
  toastSuccess: jest.Mock;
  toastError: jest.Mock;
}

export const mockQueueState: MockQueueState = {
  leavePages: [],
  wfhRows: [],
  regularizationRows: [],
  inboxRows: [],
  expenseRows: [],
  expenseError: false,
  updateExpenseStatus: jest.fn(() => Promise.resolve({ success: true })),
  directory: [],
  cutoff: null,
  granted: new Set<string>(),
  inboxDenied: false,
  approveLeave: jest.fn((input: { leaveId: number }) =>
    Promise.resolve({ success: true, leaveId: input.leaveId }),
  ),
  rejectLeave: jest.fn(() => Promise.resolve({ success: true })),
  processWfh: jest.fn(() => Promise.resolve({ success: true })),
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
};

export const ALL_QUEUE_PERMISSIONS = [
  "hr:leaves:view",
  "hr:leaves:approve",
  "hr:attendance:view",
  "hr:attendance:manage",
  "hr:workflows:approve",
  "hr:workflows:view",
  "hr:expenses:approve",
];

export function resetMockQueueState(): void {
  mockQueueState.leavePages = [];
  mockQueueState.directory = [];
  mockQueueState.wfhRows = [];
  mockQueueState.regularizationRows = [];
  mockQueueState.inboxRows = [];
  mockQueueState.expenseRows = [];
  mockQueueState.expenseError = false;
  mockQueueState.cutoff = null;
  mockQueueState.inboxDenied = false;
  mockQueueState.granted = new Set(ALL_QUEUE_PERMISSIONS);
  mockQueueState.approveLeave.mockImplementation((input) =>
    Promise.resolve({ success: true, leaveId: input.leaveId }),
  );
}

export function mockGate(permission: string) {
  const allowed = mockQueueState.granted.has(permission);
  return {
    permission,
    allowed,
    denied: !allowed,
    pending: false,
    unavailable: false,
  };
}

export const mockLeaveRow = {
  id: 41,
  orgId: "org-1",
  userId: "usr-member",
  startDate: "2026-10-05",
  endDate: "2026-10-06",
  isHalfDay: false,
  lopDays: "0.0",
  status: "PENDING",
  createdAt: "2026-10-01T09:00:00.000Z",
  leaveType: { id: 1, name: "Casual Leave" },
  user: {
    id: "usr-member",
    name: "QA RoleMember",
    firstName: "QA",
    lastName: "RoleMember",
    image: null,
  },
};

export const mockWfhRow = {
  id: 7,
  orgId: "org-1",
  userId: "usr-ben",
  date: "2026-10-07",
  reason: "Clinic appointment",
  status: "PENDING",
  approverId: null,
  rejectionReason: null,
  createdAt: "2026-10-01T09:00:00.000Z",
  user: {
    id: "usr-ben",
    firstName: "Ben",
    lastName: "Rao",
    email: "ben@example.test",
    image: null,
  },
};

export const mockRegularizationRow = {
  id: 3,
  orgId: "org-1",
  userId: "usr-asha",
  attendanceDate: "2026-10-02",
  reason: "Forgot to check out",
  status: "PENDING",
  createdAt: "2026-10-02T13:00:00.000Z",
};

export const mockExpenseRow = {
  id: 12,
  userId: "usr-ben",
  category: "Travel",
  amount: "1250.00",
  currency: "INR",
  description: "Client visit cab",
  expenseDate: "2026-09-28",
  status: "PENDING",
  createdAt: "2026-09-29T09:00:00.000Z",
  user: { id: "usr-ben", name: "Ben Rao", firstName: "Ben", lastName: "Rao", email: "ben@example.test", image: null },
};

export function mockExpensesModule() {
  return {
    useExpensePageData: () => ({
      data: mockQueueState.expenseError
        ? undefined
        : { pendingExpenses: mockQueueState.expenseRows },
      isLoading: false,
      isError: mockQueueState.expenseError,
      refetch: jest.fn(),
    }),
    useUpdateExpenseStatus: () => ({ mutateAsync: mockQueueState.updateExpenseStatus }),
  };
}

export function mockLeavePage(rows: unknown[]) {
  return [{ data: rows, pageInfo: { limit: 50, hasMore: false, nextCursor: null } }];
}

export function mockAccessModule() {
  return {
    useCan: (permission: string) => mockQueueState.granted.has(permission),
    usePermissionGate: (permission: string) => mockGate(permission),
    useModuleEnabled: () => true,
  };
}

export function mockEmployeeListModule() {
  return {
    useHrEmployeeOptions: () => ({
      employees: mockQueueState.directory,
      isLoading: false,
      isError: false,
    }),
  };
}

export function mockQueryClientModule() {
  return { useQueryClient: () => ({ invalidateQueries: jest.fn() }) };
}

export function mockHrModule() {
  return {
    useHrLeaveApprovals: () => ({
      data: { pages: mockQueueState.leavePages },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useApproveLeaveDedicated: () => ({ mutateAsync: mockQueueState.approveLeave }),
    useRejectLeaveDedicated: () => ({ mutateAsync: mockQueueState.rejectLeave }),
  };
}

export function mockHrSettingsModule() {
  return {
    useHrPendingWfhRequests: () => ({
      data: mockQueueState.wfhRows,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useProcessWfhRequest: () => ({ mutateAsync: mockQueueState.processWfh }),
  };
}

export function mockRegularizationModule() {
  return {
    useHrRegularizationQueue: () => ({
      data: {
        data: mockQueueState.regularizationRows,
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      access: mockGate("hr:attendance:view"),
    }),
    useApplyRegularization: () => ({ mutateAsync: jest.fn() }),
    useRejectRegularization: () => ({ mutateAsync: jest.fn() }),
  };
}

export function mockWorkflowsModule() {
  return {
    useWorkflowInbox: () => ({
      data: { data: mockQueueState.inboxRows, page: 1, limit: 50 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      access: mockQueueState.inboxDenied
        ? {
            permission: "hr:workflows:approve",
            allowed: false,
            denied: true,
            pending: false,
            unavailable: false,
          }
        : {
            permission: "hr:workflows:approve",
            allowed: true,
            denied: false,
            pending: false,
            unavailable: false,
          },
    }),
    useWorkflowActed: () => ({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
      access: mockGate("hr:workflows:approve"),
    }),
    useApproveInstance: () => ({ mutateAsync: jest.fn() }),
    useRejectInstance: () => ({ mutateAsync: jest.fn() }),
  };
}

export function mockCutoffModule() {
  return {
    usePayrollCutoff: () => ({
      cutoff: mockQueueState.cutoff,
      month: "2026-10",
      isLoading: false,
    }),
  };
}

export function mockPageWrapperModule() {
  return {
    PageWrapper: ({
      children,
      title,
      actions,
    }: {
      children: React.ReactNode;
      title: React.ReactNode;
      actions?: React.ReactNode;
    }) => (
      <div>
        <h1>{title}</h1>
        {actions}
        {children}
      </div>
    ),
  };
}

export function mockSonnerModule() {
  return {
    toast: {
      success: (...args: unknown[]) => mockQueueState.toastSuccess(...args),
      error: (...args: unknown[]) => mockQueueState.toastError(...args),
    },
  };
}
