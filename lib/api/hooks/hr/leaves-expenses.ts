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
