"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  IncidentsCreateIncidentResponse,
  IncidentsGetIncidentResponse,
} from "@/contracts/build-contracts.generated";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const incidentListContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsListIncidentsResponseSchema,
  ),
);
const incidentDetailContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.incidentsGetIncidentResponseSchema,
  ),
);

type IncidentFilters = {
  status?: string;
  severity?: string;
  q?: string;
  cursor?: string;
  limit?: number;
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
  if (filters?.q) params["q"] = filters.q;
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);

  return useQuery({
    queryKey: buildWorkQueryKeys.projects.incidents.list(
      projectId ?? 0,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<{
        data: IncidentsCreateIncidentResponse[];
        pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
      }>(
        `/build/${projectId}/incidents`,
        params,
        signal,
        incidentListContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
  });
}

export function useIncident(projectId?: number, incidentId?: number) {
  const canView = useCan("build:incidents:view");
  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.incidents.detail(
      projectId ?? 0,
      incidentId ?? 0,
    ),
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, string> = { limit: "100" };
      if (pageParam.updatesCursor !== undefined)
        params.updatesCursor = String(pageParam.updatesCursor);
      if (pageParam.decisionsCursor !== undefined)
        params.decisionsCursor = String(pageParam.decisionsCursor);
      if (pageParam.followUpActionsCursor !== undefined)
        params.followUpActionsCursor = String(pageParam.followUpActionsCursor);
      return apiClient.get<IncidentsGetIncidentResponse>(
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
          ? (pagination.updates.nextCursor ?? undefined)
          : (last.updates.at(-1)?.id ?? 1),
        decisionsCursor: pagination.decisions.hasMore
          ? (pagination.decisions.nextCursor ?? undefined)
          : (last.decisions.at(-1)?.id ?? 1),
        followUpActionsCursor: pagination.followUpActions.hasMore
          ? (pagination.followUpActions.nextCursor ?? undefined)
          : (last.followUpActions.at(-1)?.id ?? 1),
      };
    },
    enabled: canView && !!projectId && !!incidentId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    ...INLINE_READ_ERROR,
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
    } satisfies IncidentsGetIncidentResponse;
  }, [query.data]);
  return { ...query, data };
}
