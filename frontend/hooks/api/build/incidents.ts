"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Incident,
  IncidentDetail,
  IncidentUpdate,
  CreateIncidentInput,
  UpdateIncidentInput,
  AddIncidentUpdateInput,
} from "@/types/projects";

type IncidentFilters = {
  status?: string;
  severity?: string;
};

export function useIncidents(projectId?: number, filters?: IncidentFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.severity) params["severity"] = filters.severity;

  return useQuery<Incident[]>({
    queryKey: queryKeys.projects.incidents.list(projectId, filters),
    queryFn: () => apiClient.get<Incident[]>(`/build/${projectId}/incidents`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useIncident(projectId?: number, incidentId?: number) {
  return useQuery<IncidentDetail>({
    queryKey: queryKeys.projects.incidents.detail(projectId, incidentId),
    queryFn: () =>
      apiClient.get<IncidentDetail>(`/build/${projectId}/incidents/${incidentId}`),
    enabled: !!projectId && !!incidentId,
    staleTime: 60_000,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "incidents", "create"],
    mutationFn: ({ projectId, ...data }: CreateIncidentInput & { projectId: number }) =>
      apiClient.post<Incident>(`/build/${projectId}/incidents`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "incidents", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateIncidentInput & { projectId: number; id: number }) =>
      apiClient.patch<Incident>(`/build/${projectId}/incidents/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.incidents.detail(vars.projectId, vars.id),
      });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "incidents", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/build/${projectId}/incidents/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}

export function useAddIncidentUpdate() {
  const qc = useQueryClient();
  return useMutation({
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}
