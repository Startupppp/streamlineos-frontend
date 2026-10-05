"use client";

import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { RoadmapStatus, RoadmapItem } from "@/types/projects";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  RoadmapOwner,
  RoadmapPrioritization,
  RoadmapSignals,
  RoadmapTierWeighting,
} from "@/hooks/api/build/roadmap-schema";

const roadmapPageContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapPageContract),
);
const roadmapItemContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapItemContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const roadmapSignalsContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then(
    (m) => m.roadmapSignalsContract,
  ),
);

export const ROADMAP_SORTS = ["updated_at", "created_at", "title"] as const;

export type RoadmapSort = (typeof ROADMAP_SORTS)[number];

interface CursorPaginated<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface RoadmapItemFilters {
  status?: RoadmapStatus;
  search?: string;
  cursor?: string;
  limit?: number;
  managedProductId?: number;
  sort?: string;
  projectId?: number;
  horizon?: string;
  ownerId?: number;
}

interface CreateRoadmapItemInput {
  title: string;
  description?: string;
  outcome?: string;
  status?: RoadmapStatus;
  category?: string;
  isPublic?: boolean;
  projectId?: number;
  epicTicketId?: number;
  targetQuarter?: string;
  sortOrder?: number;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  ownerMembershipId?: number;
}

interface UpdateRoadmapItemInput {
  version: number;
  title?: string;
  description?: string | null;
  outcome?: string | null;
  status?: RoadmapStatus;
  category?: string | null;
  isPublic?: boolean;
  projectId?: number | null;
  epicTicketId?: number | null;
  targetQuarter?: string | null;
  sortOrder?: number;
  reach?: number | null;
  impact?: number | null;
  confidence?: number | null;
  effort?: number | null;
  ownerMembershipId?: number | null;
}

export interface ScoredRoadmapItem extends RoadmapItem {
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  outcome: string | null;
  ownerMembershipId: number | null;
  owner: RoadmapOwner | null;
  prioritization: RoadmapPrioritization;
  tierWeighting: RoadmapTierWeighting;
}

export function useRoadmapItems(filters: RoadmapItemFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginated<ScoredRoadmapItem>>(
        "/build/roadmap",
        params,
        signal,
        roadmapPageContract,
      ),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

const roadmapSignalsQueryKey = (roadmapItemId: number) =>
  knowledgeAndSurveysQueryKeys.roadmap.itemSignals(roadmapItemId);

export function useRoadmapItemSignals(
  roadmapItemId: number | null,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:roadmap:view");
  return useQuery({
    ...options,
    queryKey: roadmapSignalsQueryKey(roadmapItemId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<RoadmapSignals>(
        `/build/roadmap/${String(roadmapItemId)}/signals`,
        undefined,
        signal,
        roadmapSignalsContract,
      ),
    enabled: canView && roadmapItemId !== null && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useCreateRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "create"],
    mutationFn: (input: CreateRoadmapItemInput) =>
      apiClient.post<ScoredRoadmapItem>(
        "/build/roadmap",
        input,
        undefined,
        roadmapItemContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      }),
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "update"],
    mutationFn: ({
      roadmapItemId,
      ...input
    }: UpdateRoadmapItemInput & { roadmapItemId: number }) =>
      apiClient.patch<ScoredRoadmapItem>(
        `/build/roadmap/${roadmapItemId}`,
        input,
        undefined,
        roadmapItemContract,
      ),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.item(vars.roadmapItemId),
      });
    },
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "delete"],
    mutationFn: (roadmapItemId: number) =>
      apiClient.delete<void>(
        `/build/roadmap/${roadmapItemId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: (_result, roadmapItemId) => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.item(roadmapItemId),
      });
    },
  });
}
