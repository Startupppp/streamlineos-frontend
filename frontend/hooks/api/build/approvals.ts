"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UnreadCount } from "@/types/notifications";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import type {
  Approval,
  ApprovalInboxItem,
  CreateApprovalInput,
  DecideApprovalInput,
  UpdateApprovalInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";

const approvalInboxListContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalInboxListContract),
);
const approvalListContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalListContract),
);
const approvalRowContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const notificationCountContract = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((m) => m.notificationCountContract),
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

export function useBuildNotificationUnreadCount() {
  const canView = useCan("build:tickets:view");

  const query = useQuery<UnreadCount>({
    queryKey: platformCoreQueryKeys.notifications.unreadCount("build"),
    queryFn: ({ signal }) =>
      apiClient.get<UnreadCount>(
        "/notifications/unread-count",
        { sourceModule: "build" },
        signal,
        notificationCountContract,
      ),
    enabled: canView,
    staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchOnWindowFocus: false,
    ...INLINE_READ_ERROR,
  });
  return canView ? query : { ...query, data: undefined };
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
    mutationFn: ({ approvalId, ...data }: DecideApprovalInput & { approvalId: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${approvalId}/decide`, data, undefined, approvalRowContract),
    onSuccess: (_, vars) => {
      qc.setQueryData<{ count: number }>(
        buildWorkQueryKeys.projects.approvals.inboxCount(),
        (old) => (old !== undefined ? { count: Math.max(0, old.count - 1) } : old),
      );
      qc.setQueryData<ApprovalInboxItem[]>(
        buildWorkQueryKeys.projects.approvals.inbox(),
        (old) => old?.filter((item) => item.id !== vars.approvalId),
      );
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.detail(projectId, vars.approvalId) });
    },
  });
}

export function useUpdateApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:manage", {
    mutationKey: ["projects", projectId, "approvals", "update"],
    mutationFn: ({ approvalId, ...data }: UpdateApprovalInput & { approvalId: number }) =>
      apiClient.patch<Approval>(`/build/${projectId}/approvals/${approvalId}`, data, undefined, approvalRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.detail(projectId, vars.approvalId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.inbox() });
    },
  });
}

export function useDeleteApproval(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:approvals:manage", {
    mutationKey: ["projects", projectId, "approvals", "delete"],
    mutationFn: (approvalId: number) =>
      apiClient.delete<void>(`/build/${projectId}/approvals/${approvalId}`, undefined, undefined, noContentContract),
    onSuccess: (_, approvalId) => {
      qc.setQueryData<{ count: number }>(
        buildWorkQueryKeys.projects.approvals.inboxCount(),
        (old) => (old !== undefined ? { count: Math.max(0, old.count - 1) } : old),
      );
      qc.setQueryData<ApprovalInboxItem[]>(
        buildWorkQueryKeys.projects.approvals.inbox(),
        (old) => old?.filter((item) => item.id !== approvalId),
      );
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
    },
  });
}
