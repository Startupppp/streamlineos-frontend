"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  Incident,
  IncidentDetail,
  IncidentUpdate,
  CreateIncidentInput,
  UpdateIncidentInput,
  AddIncidentUpdateInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

type IncidentFilters = {
  status?: string;
  severity?: string;
};

export function useIncidents(projectId?: number, filters?: IncidentFilters) {
  const canView = useCan("build:incidents:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.severity) params["severity"] = filters.severity;

  return useQuery<Incident[]>({
    queryKey: queryKeys.projects.incidents.list(projectId, filters),
    queryFn: ({ signal }) => apiClient.get<Incident[]>(`/build/${projectId}/incidents`, params, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useIncident(projectId?: number, incidentId?: number) {
  const canView = useCan("build:incidents:view");
  return useQuery<IncidentDetail>({
    queryKey: queryKeys.projects.incidents.detail(projectId, incidentId),
    queryFn: ({ signal }) =>
      apiClient.get<IncidentDetail>(`/build/${projectId}/incidents/${incidentId}`, undefined, signal),
    enabled: canView && !!projectId && !!incidentId,
    staleTime: 60_000,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "create"],
    mutationFn: ({ projectId, ...data }: CreateIncidentInput & { projectId: number }) =>
      apiClient.post<Incident>(`/build/${projectId}/incidents`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:timesheets:manage", {
    mutationKey: ["projects", "incidents", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateIncidentInput & { projectId: number; id: number }) =>
      apiClient.patch<Incident>(`/build/${projectId}/incidents/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.incidents.detail(vars.projectId, vars.id),
      });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/build/${projectId}/incidents/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}

export function useAddIncidentUpdate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "addUpdate"],
    mutationFn: ({
      projectId,
      incidentId,
      ...data
    }: AddIncidentUpdateInput & { projectId: number; incidentId: number }) =>
      apiClient.post<IncidentUpdate>(
        `/build/${projectId}/incidents/${incidentId}/updates`,
        data,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}
