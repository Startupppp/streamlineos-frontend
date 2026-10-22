import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

type IncidentPageParam = {
  updatesCursor?: number;
  decisionsCursor?: number;
  followUpActionsCursor?: number;
};

const INITIAL_INCIDENT_PAGE_PARAM: IncidentPageParam = {};

export function incidentsListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.incidents.list(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 60_000,
  };
}

export function incidentDetailQueryOptions(projectId: number, incidentId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.incidents.detail(projectId, incidentId),
    initialPageParam: INITIAL_INCIDENT_PAGE_PARAM,
    getNextPageParam: () => undefined as IncidentPageParam | undefined,
    staleTime: 15_000,
  };
}
