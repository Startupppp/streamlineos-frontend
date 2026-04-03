"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Department,
  Employee,
  AttendanceStatusResult,
  AttendanceLog,
  LeavesResult,
  LeaveBalance,
  Payroll,
  SalaryStructure,
  Expense,
  Asset,
  Document,
  PerformanceReview,
  Goal,
  HelpdeskTicket,
  WorkLog,
  OrgChartNode,
  PaginatedEmployees,
  DocumentType,
  TicketStatus,
  CreateDepartmentInput,
  UpdateProfileInput,
  CheckInInput,
  RequestLeaveInput,
  ApproveLeaveInput,
  GeneratePayrollInput,
  CreateSalaryStructureInput,
  CreateExpenseInput,
  UpdateExpenseStatusInput,
  CreateAssetInput,
  UpdateAssetInput,
  CreateDocumentInput,
  CreatePerformanceReviewInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateHelpdeskTicketInput,
  UpsertWorkLogInput,
  UpdateWorkLogStatusInput,
  GetWorkLogsInput,
} from "@/types/hr";

// ─── Departments ──────────────────────────────────────────────────────────────

export function useHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: () => apiClient.get<Department[]>("/hr/departments"),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<{ success: boolean }>("/hr/departments", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.departments() }),
  });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function useHrEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.hr.employees(params),
    queryFn: () =>
      apiClient.get<Employee[] | PaginatedEmployees>("/hr/employees", params as Record<string, unknown>),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function useHrAttendanceStatus() {
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
  });
}

export function useHrAttendanceLogs(params?: {
  userId?: string;
  year?: number;
  month?: number;
}) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceLogs(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/logs", params as Record<string, unknown>),
  });
}

export function useHrCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-in", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() }),
  });
}

export function useHrCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-out"),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() }),
  });
}

export function useHrToggleBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/break"),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() }),
  });
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

export function useHrLeaves() {
  return useQuery({
    queryKey: queryKeys.hr.leaves(),
    queryFn: () => apiClient.get<LeavesResult>("/hr/leaves"),
  });
}

export function useHrLeaveBalance() {
  return useQuery({
    queryKey: queryKeys.hr.leaveBalance(),
    queryFn: () => apiClient.get<LeaveBalance[]>("/hr/leaves/balance"),
  });
}

export function useRequestLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestLeaveInput) =>
      apiClient.post<{ success: boolean }>("/hr/leaves", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() }),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...data }: ApproveLeaveInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${requestId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() }),
  });
}

// ─── Payrolls ─────────────────────────────────────────────────────────────────

export function useHrPayrolls() {
  return useQuery({
    queryKey: queryKeys.hr.payrolls(),
    queryFn: () => apiClient.get<Payroll[]>("/hr/payrolls"),
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GeneratePayrollInput) =>
      apiClient.post<{ generated: number }>("/hr/payrolls", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

// ─── Salary Structures ────────────────────────────────────────────────────────

export function useHrSalaryStructures(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.salaryStructures(userId),
    queryFn: () =>
      apiClient.get<SalaryStructure[]>("/hr/salary-structures", userId ? { userId } : undefined),
    enabled: true,
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalaryStructureInput) =>
      apiClient.post<SalaryStructure>("/hr/salary-structures", data),
    onSuccess: (_result, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.hr.salaryStructures(variables.userId),
      }),
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useHrExpenses(
  userId?: string,
  status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID"
) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (status) params.status = status;

  return useQuery({
    queryKey: queryKeys.hr.expenses(Object.keys(params).length ? params : undefined),
    queryFn: () =>
      apiClient.get<{ data: Expense[]; total: number; page: number; limit: number; totalPages: number }>(
        "/hr/expenses",
        Object.keys(params).length ? params : undefined
      ),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      apiClient.post<Expense>("/hr/expenses", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: UpdateExpenseStatusInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/expenses/${expenseId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export function useHrAssets() {
  return useQuery({
    queryKey: queryKeys.hr.assets(),
    queryFn: () => apiClient.get<Asset[]>("/hr/assets"),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetInput) =>
      apiClient.post<Asset>("/hr/assets", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, ...data }: UpdateAssetInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/assets/${assetId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useHrDocuments(
  userId?: string,
  type?: DocumentType
) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (type) params.type = type;

  return useQuery({
    queryKey: queryKeys.hr.documents(Object.keys(params).length ? params : undefined),
    queryFn: () =>
      apiClient.get<Document[]>(
        "/hr/documents",
        Object.keys(params).length ? params : undefined
      ),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentInput) =>
      apiClient.post<Document>("/hr/documents", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.documents() }),
  });
}

// ─── Performance Reviews ──────────────────────────────────────────────────────

export function useHrPerformanceReviews(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.performanceReviews(userId),
    queryFn: () =>
      apiClient.get<PerformanceReview[]>(
        "/hr/performance/reviews",
        userId ? { userId } : undefined
      ),
  });
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePerformanceReviewInput) =>
      apiClient.post<PerformanceReview>("/hr/performance/reviews", data),
    onSuccess: (_result, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.hr.performanceReviews(variables.userId),
      }),
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export function useHrGoals(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.goals(userId),
    queryFn: () =>
      apiClient.get<Goal[]>(
        "/hr/performance/goals",
        userId ? { userId } : undefined
      ),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) =>
      apiClient.post<Goal>("/hr/performance/goals", data),
    onSuccess: (_result, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.hr.goals(variables.userId),
      }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGoalInput) =>
      apiClient.patch<{ success: boolean }>("/hr/performance/goals", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}

// ─── Helpdesk Tickets ─────────────────────────────────────────────────────────

export function useHrHelpdeskTickets(
  userId?: string,
  status?: TicketStatus
) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (status) params.status = status;

  return useQuery({
    queryKey: queryKeys.hr.helpdeskTickets(Object.keys(params).length ? params : undefined),
    queryFn: () =>
      apiClient.get<HelpdeskTicket[]>(
        "/hr/helpdesk",
        Object.keys(params).length ? params : undefined
      ),
  });
}

export function useCreateHelpdeskTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHelpdeskTicketInput) =>
      apiClient.post<HelpdeskTicket>("/hr/helpdesk", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.helpdeskTickets() }),
  });
}

// ─── Work Logs ────────────────────────────────────────────────────────────────

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;

  return useQuery({
    queryKey: queryKeys.hr.workLogs(params),
    queryFn: () => apiClient.get<WorkLog[]>("/hr/work-logs", params),
  });
}

export function useUpsertWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useUpdateWorkLogStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWorkLogStatusInput) =>
      apiClient.patch<WorkLog>("/hr/work-logs/status", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

// ─── Org Chart ────────────────────────────────────────────────────────────────

export function useHrOrgChart() {
  return useQuery({
    queryKey: queryKeys.hr.orgChart(),
    queryFn: () => apiClient.get<OrgChartNode[]>("/hr/org-chart"),
  });
}
