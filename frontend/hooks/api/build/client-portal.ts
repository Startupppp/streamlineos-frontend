"use client";

import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  ClientPortalProject,
  ClientPortalOverview,
  ClientVisibilitySummary,
  ClientVisibilityTicket,
  ClientVisibilityMilestone,
  CreateChangeRequestInput,
  PortalChangeRequest,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import {
  PORTAL_CHILD_PAGE_SIZE,
  portalFilesPageSchema,
  portalRequestsPageSchema,
  portalUpdatesPageSchema,
  portalMilestonesPageSchema,
  portalTasksPageSchema,
  portalDeliverablesPageSchema,
  portalApprovalsPageSchema,
  portalInvoicesPageSchema,
} from "@/features/portal/lib/portal-child-pages";

const portalProjectListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.portalProjectListContract,
  ),
);
const portalProjectOverviewContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.portalProjectOverviewContract,
  ),
);
const portalChangeRequestListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.portalChangeRequestListContract,
  ),
);
const portalChangeRequestItemContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.portalChangeRequestItemContract,
  ),
);
const visibilitySummaryContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.visibilitySummaryContract,
  ),
);
const toggleVisibilityContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then(
    (m) => m.toggleVisibilityContract,
  ),
);

export function usePortalProjects() {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalProject[]>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.projects(),
    queryFn: ({ signal }) =>
      apiClient.get<ClientPortalProject[]>(
        "/build/portal/projects",
        undefined,
        signal,
        portalProjectListContract,
      ),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePortalProjectOverview(
  projectId: number,
  forPortalMembershipId?: string,
) {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalOverview>({
    queryKey: [
      ...buildWorkQueryKeys.projects.clientPortal.overview(projectId),
      forPortalMembershipId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<ClientPortalOverview>(
        `/build/portal/projects/${projectId}/overview`,
        forPortalMembershipId !== undefined
          ? { forPortalMembershipId }
          : undefined,
        signal,
        portalProjectOverviewContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

interface PortalChildPage<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

function buildPortalChildParams(
  pageParam: string | undefined,
  forPortalMembershipId: string | undefined,
): Record<string, string | number> {
  const params: Record<string, string | number> = { limit: PORTAL_CHILD_PAGE_SIZE };
  if (pageParam !== undefined) params.cursor = pageParam;
  if (forPortalMembershipId !== undefined) params.forPortalMembershipId = forPortalMembershipId;
  return params;
}

function usePortalPreviewChildPage<T>(
  projectId: number,
  segment:
    | "updates"
    | "files"
    | "requests"
    | "milestones"
    | "tasks"
    | "deliverables"
    | "approvals"
    | "invoices",
  fetcher: (params: Record<string, string | number>, signal: AbortSignal) => Promise<PortalChildPage<T>>,
  forPortalMembershipId?: string,
) {
  const canView = useCan("build:portal:view");
  const query = useInfiniteQuery({
    queryKey: [
      ...buildWorkQueryKeys.projects.clientPortal.overview(projectId),
      segment,
      forPortalMembershipId,
    ] as const,
    queryFn: ({ signal, pageParam }) =>
      fetcher(buildPortalChildParams(pageParam, forPortalMembershipId), signal),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage: PortalChildPage<T>) =>
      lastPage.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
  const items = useMemo<T[]>(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  const hasMore = query.data?.pages.at(-1)?.pagination.hasMore ?? false;
  return { ...query, items, hasMore };
}

export function usePortalPreviewUpdates(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "updates",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/updates`,
      params, signal, portalUpdatesPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewFiles(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "files",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/files`,
      params, signal, portalFilesPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewRequests(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "requests",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/requests`,
      params, signal, portalRequestsPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewMilestones(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "milestones",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/milestones`,
      params, signal, portalMilestonesPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewTasks(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "tasks",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/tasks`,
      params, signal, portalTasksPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewDeliverables(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "deliverables",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/deliverables`,
      params, signal, portalDeliverablesPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewApprovals(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "approvals",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/approvals`,
      params, signal, portalApprovalsPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalPreviewInvoices(
  projectId: number,
  forPortalMembershipId?: string,
) {
  return usePortalPreviewChildPage(
    projectId,
    "invoices",
    (params, signal) => apiClient.get(
      `/build/portal/projects/${projectId}/invoices`,
      params, signal, portalInvoicesPageSchema,
    ),
    forPortalMembershipId,
  );
}

export function usePortalChangeRequests(
  projectId: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:changerequests:view");
  return useQuery<PortalChangeRequest[]>({
    queryKey:
      buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<PortalChangeRequest[]>(
        `/build/portal/projects/${projectId}/change-requests`,
        undefined,
        signal,
        portalChangeRequestListContract,
      ),
    enabled: canView && !!projectId && (options?.enabled ?? true),
    throwOnError: false,
    staleTime: 60_000,
  });
}

export function useSubmitPortalChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:create", {
    mutationKey: ["projects", "portal", projectId, "change-requests", "submit"],
    mutationFn: (data: CreateChangeRequestInput) =>
      apiClient.post<PortalChangeRequest>(
        `/build/portal/projects/${projectId}/change-requests`,
        data,
        undefined,
        portalChangeRequestItemContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey:
          buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
      });
    },
  });
}

export function useClientVisibility(
  projectId: number,
  params?: { ticketCursor?: string | null; milestoneCursor?: string | null },
) {
  const canManage = useCan("build:clientvisibility:manage");
  const ticketCursor = params?.ticketCursor ?? undefined;
  const milestoneCursor = params?.milestoneCursor ?? undefined;
  const query: Record<string, string> = {};
  if (ticketCursor) query.ticketCursor = ticketCursor;
  if (milestoneCursor) query.milestoneCursor = milestoneCursor;
  return useQuery<ClientVisibilitySummary>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(
      projectId,
      ticketCursor,
      milestoneCursor,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ClientVisibilitySummary>(
        `/build/${projectId}/client-visibility`,
        Object.keys(query).length > 0 ? query : undefined,
        signal,
        visibilitySummaryContract,
      ),
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
}

export function useClientVisibilityTicketsInfinite(projectId: number) {
  const canManage = useCan("build:clientvisibility:manage");
  const query = useInfiniteQuery({
    queryKey: [
      ...buildWorkQueryKeys.projects.clientPortal.visibility(projectId),
      "tickets-infinite",
    ] as const,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ClientVisibilitySummary>(
        `/build/${projectId}/client-visibility`,
        pageParam !== undefined ? { ticketCursor: pageParam } : undefined,
        signal,
        visibilitySummaryContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) =>
      lastPage.tickets.pagination.nextCursor ?? undefined,
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
  const items = useMemo<ClientVisibilityTicket[]>(
    () => query.data?.pages.flatMap((p) => p.tickets.data) ?? [],
    [query.data],
  );
  const hasMore = query.data?.pages.at(-1)?.tickets.pagination.hasMore ?? false;
  return { ...query, items, hasMore };
}

export function useClientVisibilityMilestonesInfinite(projectId: number) {
  const canManage = useCan("build:clientvisibility:manage");
  const query = useInfiniteQuery({
    queryKey: [
      ...buildWorkQueryKeys.projects.clientPortal.visibility(projectId),
      "milestones-infinite",
    ] as const,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ClientVisibilitySummary>(
        `/build/${projectId}/client-visibility`,
        pageParam !== undefined ? { milestoneCursor: pageParam } : undefined,
        signal,
        visibilitySummaryContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) =>
      lastPage.milestones.pagination.nextCursor ?? undefined,
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
  const items = useMemo<ClientVisibilityMilestone[]>(
    () => query.data?.pages.flatMap((p) => p.milestones.data) ?? [],
    [query.data],
  );
  const hasMore =
    query.data?.pages.at(-1)?.milestones.pagination.hasMore ?? false;
  return { ...query, items, hasMore };
}

export function useUpdateTicketVisibility(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-visibility", "tickets"],
    mutationFn: ({
      ticketId,
      clientVisible,
      version,
    }: {
      ticketId: number;
      clientVisible: boolean;
      version?: number;
    }) =>
      apiClient.patch<{ id: number; clientVisible: boolean }>(
        `/build/${projectId}/client-visibility/tickets/${ticketId}`,
        { clientVisible, ...(version === undefined ? {} : { version }) },
        undefined,
        toggleVisibilityContract,
      ),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: (_data, _error, { ticketId }) => {
      return Promise.all([
        qc.invalidateQueries({
          queryKey:
            buildWorkQueryKeys.projects.clientPortal.visibility(projectId),
        }),
        qc.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.ticket(projectId, ticketId),
        }),
      ]);
    },
  });
}

export function useUpdateMilestoneVisibility(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-visibility", "milestones"],
    mutationFn: ({
      milestoneId,
      clientVisible,
    }: {
      milestoneId: number;
      clientVisible: boolean;
    }) =>
      apiClient.patch<{ id: number; clientVisible: boolean }>(
        `/build/${projectId}/client-visibility/milestones/${milestoneId}`,
        { clientVisible },
        undefined,
        toggleVisibilityContract,
      ),
    onSettled: () => {
      qc.invalidateQueries({
        queryKey:
          buildWorkQueryKeys.projects.clientPortal.visibility(projectId),
      });
    },
  });
}
