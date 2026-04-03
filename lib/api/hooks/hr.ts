"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
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
  PayrollWithUser,
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
  WfhRequest,
  Holiday,
  Device,
  EmployeePayslip,
  EmployeeStats,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
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
  CreateWfhRequestInput,
  ProcessWfhRequestInput,
  AddHolidayInput,
  DeleteHolidayInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeleteDeviceInput,
  GetEmployeePayslipsInput,
  GetAllPayrollsInput,
  GenerateEmployeePayslipInput,
  ApprovePayrollInput,
  MarkPayrollPaidInput,
  GetMonthlyAttendanceInput,
  OnboardEmployeeInput,
  GetIncentivesInput,
  ApproveIncentiveInput,
  RejectIncentiveInput,
  SetIncentiveConfigInput,
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

export function useHrAttendanceStatus(
  options?: Omit<UseQueryOptions<AttendanceStatusResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
    ...options,
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

export function useHrCheckIn(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, CheckInInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-in", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useHrCheckOut(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-out"),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useHrToggleBreak(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/break"),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
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

export function useUpsertWorkLog(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

export function useUpdateWorkLogStatus(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpdateWorkLogStatusInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWorkLogStatusInput) =>
      apiClient.patch<WorkLog>("/hr/work-logs/status", data),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
    ...options,
  });
}

// ─── Org Chart ────────────────────────────────────────────────────────────────

export function useHrOrgChart() {
  return useQuery({
    queryKey: queryKeys.hr.orgChart(),
    queryFn: () => apiClient.get<OrgChartNode[]>("/hr/org-chart"),
  });
}

// ─── WFH Requests ─────────────────────────────────────────────────────────────

export function useHrWfhRequests() {
  return useQuery({
    queryKey: queryKeys.hr.wfhRequests(),
    queryFn: () => apiClient.get<WfhRequest[]>("/hr/wfh"),
  });
}

export function useHrPendingWfhRequests() {
  return useQuery({
    queryKey: queryKeys.hr.pendingWfhRequests(),
    queryFn: () => apiClient.get<WfhRequest[]>("/hr/wfh/pending"),
  });
}

export function useCreateWfhRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWfhRequestInput) =>
      apiClient.post<{ success: boolean }>("/hr/wfh", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.pendingWfhRequests() });
    },
  });
}

export function useProcessWfhRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...data }: ProcessWfhRequestInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/wfh/${requestId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.pendingWfhRequests() });
    },
  });
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

export function useHrHolidaysForYear(year: number) {
  return useQuery({
    queryKey: queryKeys.hr.holidaysYear(year),
    queryFn: () =>
      apiClient.get<Holiday[]>("/hr/holidays", { year } as Record<string, unknown>),
  });
}

export function useHrHolidaysForCalendar(params: { year: number; month: number }) {
  return useQuery({
    queryKey: queryKeys.hr.holidaysCalendar(params),
    queryFn: () =>
      apiClient.get<Holiday[]>("/hr/holidays/calendar", params as Record<string, unknown>),
  });
}

export function useAddHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddHolidayInput) =>
      apiClient.post<{ success: boolean }>("/hr/holidays", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId }: DeleteHolidayInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/holidays/${holidayId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export function useHrDevices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.hr.devices(params),
    queryFn: () => apiClient.get<Device[]>("/hr/devices", params),
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceInput) =>
      apiClient.post<Device>("/hr/devices", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, ...data }: UpdateDeviceInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/devices/${deviceId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId }: DeleteDeviceInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/devices/${deviceId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

// ─── Monthly Attendance ───────────────────────────────────────────────────────

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

// ─── Employee Stats ───────────────────────────────────────────────────────────

export function useHrEmployeeStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.employeeStats(userId),
    queryFn: () =>
      apiClient.get<EmployeeStats>("/hr/employees/stats", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeProjects(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeProjects", userId] as const,
    queryFn: () =>
      apiClient.get<Record<string, unknown>[]>("/hr/employees/projects", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeTickets(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeTickets", userId] as const,
    queryFn: () =>
      apiClient.get<{ data: Record<string, unknown>[] }>("/hr/employees/tickets", { userId }),
    enabled: !!userId,
  });
}

// ─── Payslips (Employee View) ─────────────────────────────────────────────────

export function useHrEmployeePayslips(params?: GetEmployeePayslipsInput) {
  return useQuery({
    queryKey: queryKeys.hr.employeePayslips(params?.userId),
    queryFn: () =>
      apiClient.get<EmployeePayslip[]>(
        "/hr/payslips",
        params as Record<string, unknown> | undefined
      ),
  });
}

// ─── Payroll Admin ────────────────────────────────────────────────────────────

export function useHrAllPayrolls(params: GetAllPayrollsInput) {
  return useQuery({
    queryKey: queryKeys.hr.payrolls({ month: params.month }),
    queryFn: () =>
      apiClient.get<PayrollWithUser[]>("/hr/payrolls/all", params as unknown as Record<string, unknown>),
  });
}

export function useGenerateEmployeePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateEmployeePayslipInput) =>
      apiClient.post<{ success: boolean }>("/hr/payrolls/generate", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useApprovePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: ApprovePayrollInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/payrolls/${payrollId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: MarkPayrollPaidInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/payrolls/${payrollId}/paid`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean }>("/hr/employees/onboard", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

// ─── Incentives ───────────────────────────────────────────────────────────────

export function useHrIncentives(params?: GetIncentivesInput) {
  return useQuery({
    queryKey: queryKeys.hr.incentives(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<IncentivesResult>("/hr/incentives", params as Record<string, unknown> | undefined),
  });
}

export function useHrIncentiveStats() {
  return useQuery({
    queryKey: queryKeys.hr.incentiveStats(),
    queryFn: () => apiClient.get<IncentiveStats>("/hr/incentives/stats"),
  });
}

export function useHrIncentiveConfigs() {
  return useQuery({
    queryKey: queryKeys.hr.incentiveConfigs(),
    queryFn: () => apiClient.get<IncentiveConfig[]>("/hr/incentives/config"),
  });
}

export function useApproveIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ApproveIncentiveInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/approve`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.incentives() }),
  });
}

export function useRejectIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: RejectIncentiveInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/reject`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.incentives() }),
  });
}

export function useSetIncentiveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SetIncentiveConfigInput) =>
      apiClient.post<IncentiveConfig>("/hr/incentives/config", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.incentiveConfigs() }),
  });
}

// ─── Profile / Password / Notification Preferences ────────────────────────────

interface NotificationPreferences {
  emailNotifications: boolean;
  leaveReminders: boolean;
  projectUpdates: boolean;
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "notificationPreferences"] as const,
    queryFn: () =>
      apiClient.get<NotificationPreferences>("/hr/notification-preferences"),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      apiClient.patch<{ success: boolean }>(
        "/hr/notification-preferences",
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "notificationPreferences"] as const,
      }),
  });
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiClient.patch<{ success: boolean }>("/hr/change-password", data),
  });
}
