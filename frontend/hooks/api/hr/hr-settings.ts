"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  Asset,
  Document,
  PerformanceReviewPage,
  ReviewStatus,
  Goal,
  WfhRequest,
  CreateAssetInput,
  UpdateAssetInput,
  AssignAssetInput,
  CreateDocumentInput,
  CreateGoalInput,
  CreateWfhRequestInput,
  ProcessWfhRequestInput,
} from "@/types/hr";

export function useCreateAsset() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:assets:manage", {
    mutationKey: ["hr", "assets", "create"],
    mutationFn: (data: CreateAssetInput) =>
      apiClient.post<Asset>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assets() }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:assets:manage", {
    mutationKey: ["hr", "assets", "update"],
    mutationFn: ({ assetId, ...data }: UpdateAssetInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/assets/${assetId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assets() }),
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:assets:manage", {
    mutationKey: ["hr", "assets", "assign"],
    mutationFn: (data: AssignAssetInput) =>
      apiClient.patch<{ success: boolean }>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assets() }),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documents", "create"],
    mutationFn: (data: CreateDocumentInput) =>
      apiClient.post<Document>("/hr/documents", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsStats() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsExpiryAll });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documents", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string | null; type?: string; category?: string | null; userId?: string | null; isPublic?: boolean; tags?: string[]; expiryDate?: string | null }) =>
      apiClient.patch<Document>(`/hr/documents/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsStats() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsExpiryAll });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documents", "delete"],
    mutationFn: (documentId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/${documentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsStats() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsExpiryAll });
    },
  });
}

export interface HrPerformanceReviewParams {
  userId?: string;
  cycleId?: number;
  status?: ReviewStatus;
  cursor?: string;
  limit?: number;
}

export function useHrPerformanceReviews(params?: HrPerformanceReviewParams) {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 24,
    ...(params?.userId ? { userId: params.userId } : {}),
    ...(params?.cycleId ? { cycleId: params.cycleId } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.cursor ? { cursor: params.cursor } : {}),
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.performanceReviews(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<PerformanceReviewPage>("/hr/performance/reviews", queryParams, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canView,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "goals", "create"],
    mutationFn: (data: CreateGoalInput) =>
      apiClient.post<Goal>("/hr/performance/goals", data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...humanResourcesQueryKeys.hr.all, "goals"],
        exact: false,
      }),
  });
}

export function useHrWfhRequests() {
  const canSelf = useCan("self:attendance");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.wfhRequests(),
    queryFn: ({ signal }) => apiClient.get<WfhRequest[]>("/me/time-off/wfh", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canSelf,
  });
}

export function useHrPendingWfhRequests(options?: { enabled?: boolean }) {
  const canAttendance = useCan("hr:attendance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.pendingWfhRequests(),
    queryFn: ({ signal }) => apiClient.get<WfhRequest[]>("/hr/wfh/pending", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canAttendance && (options?.enabled ?? true),
  });
}

export function useCreateWfhRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:attendance", {
    mutationKey: ["hr", "wfh", "create"],
    mutationFn: (data: CreateWfhRequestInput) =>
      apiClient.post<{ success: boolean }>("/me/time-off/wfh", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.pendingWfhRequests() });
    },
  });
}

export function useProcessWfhRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "wfh", "process"],
    mutationFn: ({ requestId, ...data }: ProcessWfhRequestInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/wfh/${requestId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.pendingWfhRequests() });
    },
  });
}


