"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  IncidentsCreateIncidentResponse,
  IncidentsAddUpdateResponse,
  IncidentsAddDecisionResponse,
  IncidentsAddFollowUpActionResponse,
  IncidentsCreateIncidentBody,
  IncidentsUpdateIncidentBody,
  IncidentsAddUpdateBody,
  IncidentsAddDecisionBody,
  IncidentsAddFollowUpActionBody,
  IncidentsUpdateFollowUpActionBody,
} from "@/contracts/build-contracts.generated";

const incidentRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsCreateIncidentResponseSchema,
  ),
);
const incidentUpdateRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsAddUpdateResponseSchema,
  ),
);
const incidentDecisionRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsAddDecisionResponseSchema,
  ),
);
const incidentFollowUpActionRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsAddFollowUpActionResponseSchema,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useCreateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "create"],
    mutationFn: ({
      projectId,
      ...data
    }: IncidentsCreateIncidentBody & { projectId: number }) =>
      apiClient.post<IncidentsCreateIncidentResponse>(
        `/build/${projectId}/incidents`,
        data,
        undefined,
        incidentRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId),
      });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "update"],
    mutationFn: ({
      projectId,
      incidentId,
      ...data
    }: IncidentsUpdateIncidentBody & { projectId: number; incidentId: number }) =>
      apiClient.patch<IncidentsCreateIncidentResponse>(
        `/build/${projectId}/incidents/${incidentId}`,
        data,
        undefined,
        incidentRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId),
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(
          vars.projectId,
          vars.incidentId,
        ),
      });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "delete"],
    mutationFn: ({
      projectId,
      incidentId,
    }: {
      projectId: number;
      incidentId: number;
    }) =>
      apiClient.delete<void>(
        `/build/${projectId}/incidents/${incidentId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId),
      });
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
    }: IncidentsAddUpdateBody & { projectId: number; incidentId: number }) =>
      apiClient.post<IncidentsAddUpdateResponse>(
        `/build/${projectId}/incidents/${incidentId}/updates`,
        data,
        undefined,
        incidentUpdateRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(
          vars.projectId,
          vars.incidentId,
        ),
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId),
      });
    },
  });
}

export function useAddIncidentDecision() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "addDecision"],
    mutationFn: ({
      projectId,
      incidentId,
      ...data
    }: IncidentsAddDecisionBody & { projectId: number; incidentId: number }) =>
      apiClient.post<IncidentsAddDecisionResponse>(
        `/build/${projectId}/incidents/${incidentId}/decisions`,
        data,
        undefined,
        incidentDecisionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(
          vars.projectId,
          vars.incidentId,
        ),
      });
    },
  });
}

export function useAddIncidentFollowUpAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "addFollowUpAction"],
    mutationFn: ({
      projectId,
      incidentId,
      ...data
    }: IncidentsAddFollowUpActionBody & {
      projectId: number;
      incidentId: number;
    }) =>
      apiClient.post<IncidentsAddFollowUpActionResponse>(
        `/build/${projectId}/incidents/${incidentId}/follow-ups`,
        data,
        undefined,
        incidentFollowUpActionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(
          vars.projectId,
          vars.incidentId,
        ),
      });
    },
  });
}

export function useUpdateIncidentFollowUpAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "updateFollowUpAction"],
    mutationFn: ({
      projectId,
      incidentId,
      followUpActionId,
      ...data
    }: IncidentsUpdateFollowUpActionBody & {
      projectId: number;
      incidentId: number;
      followUpActionId: number;
    }) =>
      apiClient.patch<IncidentsAddFollowUpActionResponse>(
        `/build/${projectId}/incidents/${incidentId}/follow-ups/${followUpActionId}`,
        data,
        undefined,
        incidentFollowUpActionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(
          vars.projectId,
          vars.incidentId,
        ),
      });
    },
  });
}
