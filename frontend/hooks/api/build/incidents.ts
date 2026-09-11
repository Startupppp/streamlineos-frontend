"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
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


const incidentListContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentListContract),
);
const incidentRowContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentRowContract),
);
const incidentDetailContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentDetailContract),
);
const incidentUpdateRowContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentUpdateRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

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
    queryKey: buildWorkQueryKeys.projects.incidents.list(projectId ?? 0, filters),
    queryFn: ({ signal }) => apiClient.get<Incident[]>(`/build/${projectId}/incidents`, params, signal, incidentListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useIncident(projectId?: number, incidentId?: number) {
  const canView = useCan("build:incidents:view");
  return useQuery<IncidentDetail>({
    queryKey: buildWorkQueryKeys.projects.incidents.detail(projectId ?? 0, incidentId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<IncidentDetail>(`/build/${projectId}/incidents/${incidentId}`, undefined, signal, incidentDetailContract),
    enabled: canView && !!projectId && !!incidentId,
    staleTime: 60_000,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "create"],
    mutationFn: ({ projectId, ...data }: CreateIncidentInput & { projectId: number }) =>
      apiClient.post<Incident>(`/build/${projectId}/incidents`, data, undefined, incidentRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateIncidentInput & { projectId: number; id: number }) =>
      apiClient.patch<Incident>(`/build/${projectId}/incidents/${id}`, data, undefined, incidentRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId) });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.id),
      });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<void>(`/build/${projectId}/incidents/${id}`, undefined, undefined, noContentContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId) });
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
        undefined,
        incidentUpdateRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
      });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId) });
    },
  });
}
