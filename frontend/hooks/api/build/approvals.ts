"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Approval,
  ApprovalInboxItem,
  CreateApprovalInput,
  DecideApprovalInput,
  UpdateApprovalInput,
} from "@/types/projects";

interface ApprovalFilters {
  status?: string;
  entityType?: string;
}

export function useApprovalInbox() {
  return useQuery<ApprovalInboxItem[]>({
    queryKey: queryKeys.projects.approvals.inbox(),
    queryFn: () => apiClient.get<ApprovalInboxItem[]>("/build/approvals/inbox"),
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });
}

export function useProjectApprovals(projectId: number, filters?: ApprovalFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.entityType) params["entityType"] = filters.entityType;

  return useQuery<Approval[]>({
    queryKey: queryKeys.projects.approvals.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: () => apiClient.get<Approval[]>(`/build/${projectId}/approvals`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateApproval(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "approvals", "create"],
    mutationFn: (data: CreateApprovalInput) =>
      apiClient.post<Approval>(`/build/${projectId}/approvals`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.inbox() });
    },
  });
}

export function useDecideApproval(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "approvals", "decide"],
    mutationFn: ({ id, ...data }: DecideApprovalInput & { id: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${id}/decide`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.detail(projectId, vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.inbox() });
    },
  });
}

export function useUpdateApproval(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "approvals", "update"],
    mutationFn: ({ id, ...data }: UpdateApprovalInput & { id: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.detail(projectId, vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.inbox() });
    },
  });
}

export function useDeleteApproval(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "approvals", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/approvals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.approvals.inbox() });
    },
  });
}
