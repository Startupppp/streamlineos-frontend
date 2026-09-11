export interface HrLeaveAnalytics {
  year: number;
  byDepartment: {
    department: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }[];
  monthlyTrend: { month: string; count: number }[];
  byLeaveType: { typeName: string; count: number }[];
  avgDaysByDepartment: { department: string; avgDays: number }[];
}

export interface LeaveContextResult {
  balances: Array<{
    id: number;
    leaveTypeId: number | null;
    balance: string;
    typeName: string | null;
    daysPerYear: number | null;
  }>;
  types: Array<{
    id: number;
    name: string;
    daysPerYear: number;
    orgId: string;
  }>;
  joiningDate: string | null;
  approvers: Array<{
    id: string;
    name: string | null;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  }>;
}

export interface LeaveApprovalsResult {
  pending: unknown[];
  all: unknown[];
}

export interface LeaveRequestsPage {
  data: unknown[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: number | null;
  };
}

export interface HrLeaveType {
  id: number;
  name: string;
  daysPerYear: number;
  carryForward: boolean;
}

export interface LeavePolicyType {
  name: string;
  daysPerYear: number;
  carryForward: boolean;
  expiresMonthly: boolean;
}

export interface LeavePolicyResponse {
  wfhMonthlyQuota: number | null;
  leaveTypes: LeavePolicyType[];
}
