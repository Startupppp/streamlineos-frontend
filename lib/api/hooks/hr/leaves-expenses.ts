"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  LeavesResult,
  LeaveBalance,
  Expense,
  Asset,
  Document,
  PerformanceReview,
  Goal,
  HelpdeskTicket,
  WfhRequest,
  Holiday,
  Device,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
  DocumentType,
  TicketStatus,
  RequestLeaveInput,
  ApproveLeaveInput,
  CreateExpenseInput,
  UpdateExpenseStatusInput,
  CreateAssetInput,
  UpdateAssetInput,
  CreateDocumentInput,
  CreatePerformanceReviewInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateHelpdeskTicketInput,
  CreateWfhRequestInput,
  ProcessWfhRequestInput,
  AddHolidayInput,
  DeleteHolidayInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeleteDeviceInput,
  GetIncentivesInput,
  ApproveIncentiveInput,
  RejectIncentiveInput,
  SetIncentiveConfigInput,
} from "@/types/hr";

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

export function useHrMyLeaves() {
  return useQuery({
    queryKey: ["vaivamm", "hr", "leaves", "my"] as const,
    queryFn: () => apiClient.get<{ requests: unknown[]; balances: unknown[] }>("/hr/leaves/my"),
  });
}

export function useHrTeamLeaves() {
  return useQuery({
    queryKey: ["vaivamm", "hr", "leaves", "team"] as const,
    queryFn: () => apiClient.get<unknown[]>("/hr/leaves/team"),
  });
}

export function useApproveLeaveDedicated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, comment }: { leaveId: number; comment?: string }) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/approve`, { comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leaveApprovals"] });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leavesMyRequests"] });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leavesThisWeek"] });
    },
  });
}

export function useRejectLeaveDedicated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, reason, comment }: { leaveId: number; reason: string; comment?: string }) =>
      apiClient.put<{ success: boolean }>(`/hr/leaves/${leaveId}/reject`, { reason, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leaveApprovals"] });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leavesMyRequests"] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${leaveId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leavesMyRequests"] });
    },
  });
}

export function useRevertLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/leaves/${leaveId}`, { status: "PENDING" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.leaves() });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leaveApprovals"] });
      qc.invalidateQueries({ queryKey: [...["vaivamm"], "hr", "leavesMyRequests"] });
    },
  });
}

interface LeaveContextResult {
  balances: Array<{ id: number; leaveTypeId: number | null; balance: string; typeName: string | null; daysPerYear: number | null }>;
  types: Array<{ id: number; name: string; daysPerYear: number; orgId: string }>;
  joiningDate: string | null;
  approvers: Array<{ id: string; name: string | null; email: string; firstName?: string | null; lastName?: string | null; image?: string | null }>;
}

export function useHrLeaveContext() {
  return useQuery({
    queryKey: [...["vaivamm"], "hr", "leaveContext"] as const,
    queryFn: () => apiClient.get<LeaveContextResult>("/hr/leaves/context"),
  });
}

interface LeaveApprovalsResult {
  pending: unknown[];
  all: unknown[];
}

export function useHrLeaveApprovals() {
  return useQuery({
    queryKey: [...["vaivamm"], "hr", "leaveApprovals"] as const,
    queryFn: () => apiClient.get<LeaveApprovalsResult>("/hr/leaves/approvals"),
  });
}

export function useHrLeavesThisWeek() {
  return useQuery({
    queryKey: [...["vaivamm"], "hr", "leavesThisWeek"] as const,
    queryFn: () => apiClient.get<unknown[]>("/hr/leaves/this-week"),
  });
}

export function useHrMyLeaveRequests() {
  return useQuery({
    queryKey: [...["vaivamm"], "hr", "leavesMyRequests"] as const,
    queryFn: () => apiClient.get<{ requests: unknown[]; balances: unknown[] }>("/hr/leaves/my"),
  });
}

export function useHrDirectory() {
  return useQuery({
    queryKey: ["hr", "directory"],
    queryFn: () => apiClient.get<unknown[]>("/hr/directory"),
  });
}

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

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  categories: Record<string, boolean>;
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

// ─── Leave Blackout Dates ─────────────────────────────────────────────────────

export interface LeaveBlackoutDate {
  id: number;
  orgId: string;
  startDate: string;
  endDate: string;
  reason: string;
  appliesTo: string;
  createdBy: string | null;
  createdAt: string;
}

export function useLeaveBlackoutDates(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return useQuery({
    queryKey: [...queryKeys.hr.all, "leaveBlackout", from, to] as const,
    queryFn: () =>
      apiClient.get<LeaveBlackoutDate[]>("/hr/leaves/blackout", params),
    staleTime: 60_000,
  });
}

export function useCreateLeaveBlackout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { startDate: string; endDate: string; reason: string; appliesTo?: string }) =>
      apiClient.post<LeaveBlackoutDate>("/hr/leaves/blackout", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "leaveBlackout"] }),
  });
}

export function useDeleteLeaveBlackout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/leaves/blackout/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "leaveBlackout"] }),
  });
}

// ─── Leave Analytics ──────────────────────────────────────────────────────────
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
}

export function useHrLeaveAnalytics(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: [...queryKeys.hr.all, "leaveAnalytics", y] as const,
    queryFn: () =>
      apiClient.get<HrLeaveAnalytics>("/hr/leaves/analytics", { year: String(y) }),
    staleTime: 120_000,
  });
}

// ─── Comp-Off ─────────────────────────────────────────────────────────────────
export function useCreditCompOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; days: number; reason?: string }) =>
      apiClient.post<{ success: boolean; credited: number; leaveTypeId: number }>(
        "/hr/leaves/comp-off",
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}
