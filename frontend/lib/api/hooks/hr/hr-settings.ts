"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Asset,
  Document,
  PerformanceReview,
  Goal,
  HelpdeskTicket,
  WfhRequest,
  Device,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
  DocumentType,
  TicketStatus,
  CreateAssetInput,
  UpdateAssetInput,
  AssignAssetInput,
  CreateDocumentInput,
  CreateGoalInput,
  CreateHelpdeskTicketInput,
  CreateWfhRequestInput,
  ProcessWfhRequestInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeleteDeviceInput,
  GetIncentivesInput,
  ApproveIncentiveInput,
  RejectIncentiveInput,
  SetIncentiveConfigInput,
} from "@/types/hr";

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  categories: Record<string, boolean>;
}

interface DocumentStats {
  total: number;
  byType: Record<string, number>;
  expiringIn30Days: number;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useHrAssets() {
  return useQuery({
    queryKey: queryKeys.hr.assets(),
    queryFn: () => apiClient.get<Asset[]>("/hr/assets"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetInput) =>
      apiClient.post<Asset>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, ...data }: UpdateAssetInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/assets/${assetId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignAssetInput) =>
      apiClient.patch<{ success: boolean }>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useHrDocuments(userId?: string, type?: DocumentType) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (type) params.type = type;

  return useQuery({
    queryKey: queryKeys.hr.documents(
      Object.keys(params).length ? params : undefined,
    ),
    queryFn: () =>
      apiClient.get<Document[]>(
        "/hr/documents",
        Object.keys(params).length ? params : undefined,
      ),
    staleTime: 2 * 60_000,
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

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string | null; type?: string; category?: string | null; userId?: string | null; isPublic?: boolean; tags?: string[]; expiryDate?: string | null }) =>
      apiClient.patch<Document>(`/hr/documents/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documents() });
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "documentStats"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/${documentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documents() });
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "documentStats"],
      });
    },
  });
}

export function useHrDocumentStats() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "documentStats"] as const,
    queryFn: () => apiClient.get<DocumentStats>("/hr/documents/stats"),
    staleTime: 60_000,
  });
}

export function useHrPerformanceReviews(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.performanceReviews(userId),
    queryFn: () =>
      apiClient.get<PerformanceReview[]>(
        "/hr/performance/reviews",
        userId ? { userId } : undefined,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useHrGoals(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.goals(userId),
    queryFn: () =>
      apiClient.get<Goal[]>(
        "/hr/performance/goals",
        userId ? { userId } : undefined,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) =>
      apiClient.post<Goal>("/hr/performance/goals", data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "goals"],
        exact: false,
      }),
  });
}

export function useHrHelpdeskTickets(userId?: string, status?: TicketStatus) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (status) params.status = status;

  return useQuery({
    queryKey: queryKeys.hr.helpdeskTickets(
      Object.keys(params).length ? params : undefined,
    ),
    queryFn: () =>
      apiClient.get<HelpdeskTicket[]>(
        "/hr/helpdesk",
        Object.keys(params).length ? params : undefined,
      ),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useHrPendingWfhRequests() {
  return useQuery({
    queryKey: queryKeys.hr.pendingWfhRequests(),
    queryFn: () => apiClient.get<WfhRequest[]>("/hr/wfh/pending"),
    staleTime: 2 * 60_000,
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

export function useHrDevices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.hr.devices(params),
    queryFn: () => apiClient.get<Device[]>("/hr/devices", params),
    staleTime: 2 * 60_000,
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceInput) =>
      apiClient.post<Device>("/hr/devices", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, ...data }: UpdateDeviceInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/devices/${deviceId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId }: DeleteDeviceInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/devices/${deviceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.devices() }),
  });
}

export function useHrIncentives(params?: GetIncentivesInput) {
  return useQuery({
    queryKey: queryKeys.hr.incentives(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () =>
      apiClient.get<IncentivesResult>(
        "/hr/incentives",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useHrIncentiveStats() {
  return useQuery({
    queryKey: queryKeys.hr.incentiveStats(),
    queryFn: () => apiClient.get<IncentiveStats>("/hr/incentives/stats"),
    staleTime: 2 * 60_000,
  });
}

export function useHrIncentiveConfigs() {
  return useQuery({
    queryKey: queryKeys.hr.incentiveConfigs(),
    queryFn: () => apiClient.get<IncentiveConfig[]>("/hr/incentives/config"),
    staleTime: 2 * 60_000,
  });
}

export function useApproveIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ApproveIncentiveInput) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/incentives/${id}/approve`,
        data,
      ),
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

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "notificationPreferences"] as const,
    queryFn: () =>
      apiClient.get<NotificationPreferences>("/hr/notification-preferences"),
    staleTime: 2 * 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      apiClient.patch<{ success: boolean }>(
        "/hr/notification-preferences",
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "notificationPreferences"] as const,
      }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiClient.patch<{ success: boolean }>("/me/change-password", data),
  });
}

export function useHrDirectory() {
  return useQuery({
    queryKey: queryKeys.hr.directory(),
    queryFn: () => apiClient.get<unknown[]>("/hr/directory"),
    staleTime: 2 * 60_000,
  });
}
