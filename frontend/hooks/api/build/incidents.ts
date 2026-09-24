"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  Incident,
  IncidentDetail,
  IncidentUpdate,
  IncidentDecision,
  IncidentFollowUpAction,
  CreateIncidentInput,
  UpdateIncidentInput,
  AddIncidentUpdateInput,
  AddIncidentDecisionInput,
  CreateIncidentFollowUpActionInput,
  UpdateIncidentFollowUpActionInput,
} from "@/hooks/api/build/incidents-schema";
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
const incidentDecisionRowContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentDecisionRowContract),
);
const incidentFollowUpActionRowContract = lazyContract(() =>
  import("@/hooks/api/build/incidents-schema").then((m) => m.incidentFollowUpActionRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type IncidentFilters = {
  status?: string;
  severity?: string;
};

type IncidentPageParam = {
  updatesCursor?: number;
  decisionsCursor?: number;
  followUpActionsCursor?: number;
};

const INITIAL_INCIDENT_PAGE_PARAM: IncidentPageParam = {};

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
    refetchOnWindowFocus: "always",
  });
}

export function useIncident(projectId?: number, incidentId?: number) {
  const canView = useCan("build:incidents:view");
  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.incidents.detail(projectId ?? 0, incidentId ?? 0),
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, string> = { limit: "100" };
      if (pageParam.updatesCursor !== undefined)
        params.updatesCursor = String(pageParam.updatesCursor);
      if (pageParam.decisionsCursor !== undefined)
        params.decisionsCursor = String(pageParam.decisionsCursor);
      if (pageParam.followUpActionsCursor !== undefined)
        params.followUpActionsCursor = String(pageParam.followUpActionsCursor);
      return apiClient.get<IncidentDetail>(
        `/build/${projectId}/incidents/${incidentId}`,
        params,
        signal,
        incidentDetailContract,
      );
    },
    initialPageParam: INITIAL_INCIDENT_PAGE_PARAM,
    getNextPageParam: (last) => {
      const pagination = last.childrenPagination;
      if (
        !pagination.updates.hasMore &&
        !pagination.decisions.hasMore &&
        !pagination.followUpActions.hasMore
      )
        return undefined;
      return {
        updatesCursor: pagination.updates.hasMore
          ? pagination.updates.nextCursor ?? undefined
          : last.updates.at(-1)?.id ?? 1,
        decisionsCursor: pagination.decisions.hasMore
          ? pagination.decisions.nextCursor ?? undefined
          : last.decisions.at(-1)?.id ?? 1,
        followUpActionsCursor: pagination.followUpActions.hasMore
          ? pagination.followUpActions.nextCursor ?? undefined
          : last.followUpActions.at(-1)?.id ?? 1,
      };
    },
    enabled: canView && !!projectId && !!incidentId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
  });
  const data = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) return undefined;
    const first = pages[0];
    const last = pages.at(-1) ?? first;
    const unique = <T extends { id: number }>(rows: T[]) =>
      Array.from(new Map(rows.map((row) => [row.id, row])).values());
    return {
      ...first,
      updates: unique(pages.flatMap((page) => page.updates)),
      decisions: unique(pages.flatMap((page) => page.decisions)),
      followUpActions: unique(pages.flatMap((page) => page.followUpActions)),
      childrenPagination: last.childrenPagination,
    } satisfies IncidentDetail;
  }, [query.data]);
  return { ...query, data };
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
      incidentId,
      ...data
    }: UpdateIncidentInput & { projectId: number; incidentId: number }) =>
      apiClient.patch<Incident>(`/build/${projectId}/incidents/${incidentId}`, data, undefined, incidentRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.incidents.list(vars.projectId) });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
      });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "delete"],
    mutationFn: ({ projectId, incidentId }: { projectId: number; incidentId: number }) =>
      apiClient.delete<void>(`/build/${projectId}/incidents/${incidentId}`, undefined, undefined, noContentContract),
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

export function useAddIncidentDecision() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:incidents:manage", {
    mutationKey: ["projects", "incidents", "addDecision"],
    mutationFn: ({
      projectId,
      incidentId,
      ...data
    }: AddIncidentDecisionInput & { projectId: number; incidentId: number }) =>
      apiClient.post<IncidentDecision>(
        `/build/${projectId}/incidents/${incidentId}/decisions`,
        data,
        undefined,
        incidentDecisionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
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
    }: CreateIncidentFollowUpActionInput & { projectId: number; incidentId: number }) =>
      apiClient.post<IncidentFollowUpAction>(
        `/build/${projectId}/incidents/${incidentId}/follow-ups`,
        data,
        undefined,
        incidentFollowUpActionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
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
    }: UpdateIncidentFollowUpActionInput & {
      projectId: number;
      incidentId: number;
      followUpActionId: number;
    }) =>
      apiClient.patch<IncidentFollowUpAction>(
        `/build/${projectId}/incidents/${incidentId}/follow-ups/${followUpActionId}`,
        data,
        undefined,
        incidentFollowUpActionRowContract,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.incidents.detail(vars.projectId, vars.incidentId),
      });
    },
  });
}
