"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ClientPortalProject,
  ClientPortalOverview,
  ClientVisibilitySummary,
  ChangeRequest,
  CreateChangeRequestInput,
} from "@/types/projects";

export function usePortalProjects() {
  return useQuery<ClientPortalProject[]>({
    queryKey: queryKeys.projects.clientPortal.projects(),
    queryFn: () => apiClient.get<ClientPortalProject[]>("/build/portal/projects"),
    staleTime: 60_000,
  });
}

export function usePortalProjectOverview(projectId: number) {
  return useQuery<ClientPortalOverview>({
    queryKey: queryKeys.projects.clientPortal.overview(projectId),
    queryFn: () =>
      apiClient.get<ClientPortalOverview>(`/build/portal/projects/${projectId}/overview`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function usePortalChangeRequests(projectId: number) {
  return useQuery<ChangeRequest[]>({
    queryKey: queryKeys.projects.clientPortal.changeRequests(projectId),
    queryFn: () =>
      apiClient.get<ChangeRequest[]>(`/build/portal/projects/${projectId}/change-requests`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useSubmitPortalChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portal", projectId, "change-requests", "submit"],
    mutationFn: (data: CreateChangeRequestInput) =>
      apiClient.post<ChangeRequest>(
        `/build/portal/projects/${projectId}/change-requests`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.clientPortal.changeRequests(projectId),
      });
    },
  });
}

export function useClientVisibility(projectId: number) {
  return useQuery<ClientVisibilitySummary>({
    queryKey: queryKeys.projects.clientPortal.visibility(projectId),
    queryFn: () =>
      apiClient.get<ClientVisibilitySummary>(`/build/${projectId}/client-visibility`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useUpdateTicketVisibility(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "client-visibility", "tickets"],
    mutationFn: ({ id, clientVisible }: { id: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/tickets/${id}`,
        { clientVisible },
      ),
    onMutate: async ({ id, clientVisible }) => {
      const key = queryKeys.projects.clientPortal.visibility(projectId);
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
        qc.setQueryData(queryKeys.projects.clientPortal.visibility(projectId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}

export function useUpdateMilestoneVisibility(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "client-visibility", "milestones"],
    mutationFn: ({ id, clientVisible }: { id: number; clientVisible: boolean }) =>
      apiClient.patch<{ success: boolean }>(
        `/build/${projectId}/client-visibility/milestones/${id}`,
        { clientVisible },
      ),
    onMutate: async ({ id, clientVisible }) => {
      const key = queryKeys.projects.clientPortal.visibility(projectId);
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
        qc.setQueryData(queryKeys.projects.clientPortal.visibility(projectId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.clientPortal.visibility(projectId) });
    },
  });
}
