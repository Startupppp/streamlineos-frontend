"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  ClientPortalProject,
  ClientPortalOverview,
  ClientVisibilitySummary,
  ChangeRequest,
  CreateChangeRequestInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function usePortalProjects() {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalProject[]>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.projects(),
    queryFn: ({ signal }) => apiClient.get<ClientPortalProject[]>("/build/portal/projects", undefined, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePortalProjectOverview(projectId: number) {
  const canView = useCan("build:portal:view");
  return useQuery<ClientPortalOverview>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.overview(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ClientPortalOverview>(`/build/portal/projects/${projectId}/overview`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function usePortalChangeRequests(projectId: number) {
  const canView = useCan("build:changerequests:view");
  return useQuery<ChangeRequest[]>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ChangeRequest[]>(`/build/portal/projects/${projectId}/change-requests`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useSubmitPortalChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:create", {
    mutationKey: ["projects", "portal", projectId, "change-requests", "submit"],
    mutationFn: (data: CreateChangeRequestInput) =>
      apiClient.post<ChangeRequest>(
        `/build/portal/projects/${projectId}/change-requests`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(projectId),
      });
    },
  });
}

export function useClientVisibility(projectId: number) {
  const canManage = useCan("build:clientvisibility:manage");
  return useQuery<ClientVisibilitySummary>({
    queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ClientVisibilitySummary>(`/build/${projectId}/client-visibility`, undefined, signal),
    enabled: canManage && !!projectId,
    staleTime: 30_000,
  });
}

export function useUpdateTicketVisibility(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-visibility", "tickets"],
    mutationFn: ({ id, clientVisible }: { id: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/tickets/${id}`,
        { clientVisible },
      ),
    onMutate: async ({ id, clientVisible }) => {
      const key = buildWorkQueryKeys.projects.clientPortal.visibility(projectId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ClientVisibilitySummary>(key);
      if (prev) {
        qc.setQueryData<ClientVisibilitySummary>(key, {
          ...prev,
          tickets: prev.tickets.map((t) => (t.id === id ? { ...t, clientVisible } : t)),
        });
      }
      return { prev };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(buildWorkQueryKeys.projects.clientPortal.visibility(projectId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}

export function useUpdateMilestoneVisibility(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-visibility", "milestones"],
    mutationFn: ({ id, clientVisible }: { id: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/milestones/${id}`,
        { clientVisible },
      ),
    onMutate: async ({ id, clientVisible }) => {
      const key = buildWorkQueryKeys.projects.clientPortal.visibility(projectId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ClientVisibilitySummary>(key);
      if (prev) {
        qc.setQueryData<ClientVisibilitySummary>(key, {
          ...prev,
          milestones: prev.milestones.map((m) => (m.id === id ? { ...m, clientVisible } : m)),
        });
      }
      return { prev };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(buildWorkQueryKeys.projects.clientPortal.visibility(projectId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}
