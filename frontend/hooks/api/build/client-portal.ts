"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
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


const portalProjectListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.portalProjectListContract),
);
const portalProjectOverviewContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.portalProjectOverviewContract),
);
const portalChangeRequestListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.portalChangeRequestListContract),
);
const portalChangeRequestItemContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.portalChangeRequestItemContract),
);
const visibilitySummaryContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.visibilitySummaryContract),
);
const toggleVisibilityContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.toggleVisibilityContract),
);

export function usePortalProjects() {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalProject[]>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.projects(),
    queryFn: ({ signal }) => apiClient.get<ClientPortalProject[]>("/build/portal/projects", undefined, signal, portalProjectListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePortalProjectOverview(projectId: number) {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalOverview>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.overview(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ClientPortalOverview>(`/build/portal/projects/${projectId}/overview`, undefined, signal, portalProjectOverviewContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function usePortalChangeRequests(projectId: number) {
  const canView = useCan("build:changerequests:view");
  return useQuery<PortalChangeRequest[]>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<PortalChangeRequest[]>(`/build/portal/projects/${projectId}/change-requests`, undefined, signal, portalChangeRequestListContract),
    enabled: canView && !!projectId,
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
        queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
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
    queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId, ticketCursor, milestoneCursor),
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
        pageParam ? { ticketCursor: pageParam } : undefined,
        signal,
        visibilitySummaryContract,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.tickets.pagination.nextCursor ?? undefined,
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
  const items = useMemo<ClientVisibilityTicket[]>(
    () => query.data?.pages.flatMap((p) => p.tickets.data) ?? [],
    [query.data],
  );
  const hasMore =
    query.data?.pages.at(-1)?.tickets.pagination.hasMore ?? false;
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
        pageParam ? { milestoneCursor: pageParam } : undefined,
        signal,
        visibilitySummaryContract,
      ),
    initialPageParam: undefined as string | undefined,
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
    mutationFn: ({ ticketId, clientVisible }: { ticketId: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/tickets/${ticketId}`,
        { clientVisible },
        undefined,
        toggleVisibilityContract,
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}

export function useUpdateMilestoneVisibility(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-visibility", "milestones"],
    mutationFn: ({ milestoneId, clientVisible }: { milestoneId: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/milestones/${milestoneId}`,
        { clientVisible },
        undefined,
        toggleVisibilityContract,
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}
