"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  Asset,
  Document,
  PerformanceReview,
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
  return useMutation({
    mutationKey: ["hr", "assets", "create"],
    mutationFn: (data: CreateAssetInput) =>
      apiClient.post<Asset>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "assets", "update"],
    mutationFn: ({ assetId, ...data }: UpdateAssetInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/assets/${assetId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "assets", "assign"],
    mutationFn: (data: AssignAssetInput) =>
      apiClient.patch<{ success: boolean }>("/hr/assets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.assets() }),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "documents", "create"],
    mutationFn: (data: CreateDocumentInput) =>
      apiClient.post<Document>("/hr/documents", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.documents() }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "documents", "update"],
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
    mutationKey: ["hr", "documents", "delete"],
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

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "goals", "create"],
    mutationFn: (data: CreateGoalInput) =>
      apiClient.post<Goal>("/hr/performance/goals", data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "goals"],
        exact: false,
      }),
  });
}

export function useHrWfhRequests() {
  const canSelf = useCan("self:attendance");
  return useQuery({
    queryKey: queryKeys.hr.wfhRequests(),
    queryFn: () => apiClient.get<WfhRequest[]>("/me/time-off/wfh"),
    staleTime: 2 * 60_000,
    enabled: canSelf,
  });
}

export function useHrPendingWfhRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.pendingWfhRequests(),
    queryFn: () => apiClient.get<WfhRequest[]>("/hr/wfh/pending"),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateWfhRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "wfh", "create"],
    mutationFn: (data: CreateWfhRequestInput) =>
      apiClient.post<{ success: boolean }>("/me/time-off/wfh", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.pendingWfhRequests() });
    },
  });
}

export function useProcessWfhRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "wfh", "process"],
    mutationFn: ({ requestId, ...data }: ProcessWfhRequestInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/wfh/${requestId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.wfhRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.pendingWfhRequests() });
    },
  });
}


