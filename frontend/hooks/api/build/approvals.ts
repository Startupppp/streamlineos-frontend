"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
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
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const approvalInboxPageContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalInboxResponseContract),
);
const approvalPageContract = lazyContract(() =>
  import("@/hooks/api/build/approvals-schema").then((m) => m.approvalResponseContract),
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

interface InboxFilters {
  status?: string;
  type?: string;
  q?: string;
}

type ApprovalInboxPage = {
  data: ApprovalInboxItem[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

type ApprovalInboxCache = ApprovalInboxItem[] | InfiniteData<ApprovalInboxPage>;

function normalizeApprovalPage<T>(response: {
  data: T[];
  pagination: ApprovalInboxPage["pagination"];
} | T[]): { data: T[]; pagination: ApprovalInboxPage["pagination"] } {
  if (Array.isArray(response)) {
    return {
      data: response,
      pagination: { limit: response.length || 100, hasMore: false, nextCursor: null },
    };
  }
  return response;
}

function removeInboxApproval(
  cache: ApprovalInboxCache | undefined,
  approvalId: number,
): ApprovalInboxCache | undefined {
  if (!cache) return cache;
  if (Array.isArray(cache)) return cache.filter((item) => item.id !== approvalId);
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.filter((item) => item.id !== approvalId),
    })),
  };
}

export function useApprovalInbox(filters?: InboxFilters) {
  const canView = useCan("build:approvals:view");
  const activeFilters: InboxFilters | undefined =
    filters && (filters.status || filters.type || filters.q) ? filters : undefined;
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.approvals.inbox(activeFilters),
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (pageParam !== undefined) params["cursor"] = pageParam as string;
      if (activeFilters?.status) params["status"] = activeFilters.status;
      if (activeFilters?.type) params["type"] = activeFilters.type;
      if (activeFilters?.q) params["q"] = activeFilters.q;
      return normalizeApprovalPage(await apiClient.get(
        "/build/approvals/inbox",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        approvalInboxPageContract,
      ));
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
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

  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.approvals.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: async ({ pageParam, signal }) => normalizeApprovalPage(await apiClient.get(
      `/build/${projectId}/approvals`,
      pageParam !== undefined ? { ...params, cursor: pageParam } : params,
      signal,
      approvalPageContract,
    )),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
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
      qc.setQueryData<ApprovalInboxCache>(
        buildWorkQueryKeys.projects.approvals.inbox(),
        (old) => removeInboxApproval(old, vars.approvalId),
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
      qc.setQueryData<ApprovalInboxCache>(
        buildWorkQueryKeys.projects.approvals.inbox(),
        (old) => removeInboxApproval(old, approvalId),
      );
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.approvals.list(projectId) });
    },
  });
}
