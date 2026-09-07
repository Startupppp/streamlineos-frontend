"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  Approval,
  ApprovalInboxItem,
  CreateApprovalInput,
  DecideApprovalInput,
  UpdateApprovalInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const approvalInboxListContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalInboxListContract),
);
const approvalListContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalListContract),
);
const approvalRowContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalRowContract),
);
const approvalSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalSuccessContract),
);

interface ApprovalFilters {
  status?: string;
  entityType?: string;
}

export function useApprovalInbox() {
  const canView = useCan("build:approvals:view");
  return useQuery<ApprovalInboxItem[]>({
    queryKey: buildWorkQueryKeys.projects.approvals.inbox(),
    queryFn: ({ signal }) => apiClient.get<ApprovalInboxItem[]>("/build/approvals/inbox", undefined, signal, approvalInboxListContract),
    enabled: canView,
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });
}

export function useProjectApprovals(projectId: number, filters?: ApprovalFilters) {
  const canView = useCan("build:approvals:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.entityType) params["entityType"] = filters.entityType;

  return useQuery<Approval[]>({
    queryKey: buildWorkQueryKeys.projects.approvals.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<Approval[]>(`/build/${projectId}/approvals`, params, signal, approvalListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:request", {
    mutationKey: ["projects", projectId, "approvals", "create"],
    mutationFn: (data: CreateApprovalInput) =>
      apiClient.post<Approval>(`/build/${projectId}/approvals`, data, undefined, approvalRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
    },
  });
}

export function useDecideApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:decide", {
    mutationKey: ["projects", projectId, "approvals", "decide"],
    mutationFn: ({ id, ...data }: DecideApprovalInput & { id: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${id}/decide`, data, undefined, approvalRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.detail(projectId, vars.id) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
    },
  });
}

export function useUpdateApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:manage", {
    mutationKey: ["projects", projectId, "approvals", "update"],
    mutationFn: ({ id, ...data }: UpdateApprovalInput & { id: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${id}`, data, undefined, approvalRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.detail(projectId, vars.id) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
    },
  });
}

export function useDeleteApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:manage", {
    mutationKey: ["projects", projectId, "approvals", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/approvals/${id}`, approvalSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
    },
  });
}
