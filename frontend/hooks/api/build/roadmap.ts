"use client";

import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { RoadmapStatus, RoadmapHorizon } from "@/types/projects";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  RoadmapOwner,
  RoadmapPrioritization,
  RoadmapSignals,
  RoadmapTierWeighting,
  RoadmapGoal,
  RoadmapRelease,
  RoadmapTeam,
  RoadmapOpportunity,
  RoadmapDelivery,
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

export const ROADMAP_SORTS = [
  "updated_at",
  "created_at",
  "title",
  "horizon",
] as const;

export type RoadmapSort = (typeof ROADMAP_SORTS)[number];

interface CursorPaginated<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface RoadmapItemFilters {
  status?: RoadmapStatus;
  search?: string;
  cursor?: string;
  limit?: number;
  managedProductId?: number;
  sort?: string;
  projectId?: number;
  horizon?: RoadmapHorizon;
  ownerId?: number;
  goalId?: number;
  releaseId?: number;
  teamId?: number;
  opportunityId?: number;
  hasOpportunity?: boolean;
  confidenceMin?: number;
  confidenceMax?: number;
  targetFrom?: string;
  targetTo?: string;
  segment?: string;
}

export interface CreateRoadmapItemInput {
  title: string;
  description?: string;
  outcome?: string;
  status?: RoadmapStatus;
  category?: string;
  isPublic?: boolean;
  projectId?: number;
  managedProductId?: number;
  epicTicketId?: number;
  targetQuarter?: string;
  sortOrder?: number;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  ownerMembershipId?: number;
  horizon?: RoadmapHorizon;
  goalId?: number | null;
  releaseId?: number | null;
  teamId?: number | null;
  targetStart?: string | null;
  targetEnd?: string | null;
}

export interface UpdateRoadmapItemInput {
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
  horizon?: RoadmapHorizon;
  goalId?: number | null;
  releaseId?: number | null;
  teamId?: number | null;
  targetStart?: string | null;
  targetEnd?: string | null;
}

export interface ScoredRoadmapItem {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  outcome: string | null;
  status: RoadmapStatus;
  category: string | null;
  isPublic: boolean;
  projectId: number | null;
  managedProductId: number | null;
  epicTicketId: number | null;
  targetQuarter: string | null;
  sortOrder: number;
  votes: number;
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  ownerMembershipId: number | null;
  owner: RoadmapOwner | null;
  horizon: RoadmapHorizon;
  goalId: number | null;
  releaseId: number | null;
  teamId: number | null;
  opportunityId: number | null;
  targetStart: string | null;
  targetEnd: string | null;
  decisionSnapshot: Record<string, unknown> | null;
  goal: RoadmapGoal | null;
  release: RoadmapRelease | null;
  team: RoadmapTeam | null;
  opportunity: RoadmapOpportunity | null;
  prioritization: RoadmapPrioritization;
  tierWeighting: RoadmapTierWeighting;
  delivery: RoadmapDelivery;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

function patchRoadmapItemInCache(
  qc: ReturnType<typeof useQueryClient>,
  updated: ScoredRoadmapItem,
) {
  qc.setQueriesData<CursorPaginated<ScoredRoadmapItem>>(
    { queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(), exact: false },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      };
    },
  );
  qc.setQueryData(
    knowledgeAndSurveysQueryKeys.roadmap.item(updated.id),
    updated,
  );
}

function addRoadmapItemToCache(
  qc: ReturnType<typeof useQueryClient>,
  created: ScoredRoadmapItem,
) {
  qc.setQueriesData<CursorPaginated<ScoredRoadmapItem>>(
    { queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(), exact: false },
    (old) => {
      if (!old) return old;
      return { ...old, data: [created, ...old.data] };
    },
  );
}

function removeRoadmapItemFromCache(
  qc: ReturnType<typeof useQueryClient>,
  roadmapItemId: number,
) {
  qc.setQueriesData<CursorPaginated<ScoredRoadmapItem>>(
    { queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(), exact: false },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.filter((item) => item.id !== roadmapItemId),
      };
    },
  );
  qc.removeQueries({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.item(roadmapItemId),
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
    onSuccess: (result) => addRoadmapItemToCache(qc, result),
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
    onSuccess: (result) => patchRoadmapItemInCache(qc, result),
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
    onSuccess: (_result, roadmapItemId) =>
      removeRoadmapItemFromCache(qc, roadmapItemId),
  });
}

interface PositionRoadmapItemInput {
  roadmapItemId: number;
  version: number;
  horizon?: RoadmapHorizon;
  beforeItemId?: number;
  afterItemId?: number;
  sortOrder?: number;
}

export function usePositionRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "position"],
    mutationFn: ({ roadmapItemId, ...input }: PositionRoadmapItemInput) =>
      apiClient.patch<ScoredRoadmapItem>(
        `/build/roadmap-items/${roadmapItemId}/position`,
        input,
        undefined,
        roadmapItemContract,
      ),
    onSuccess: (result) => patchRoadmapItemInCache(qc, result),
  });
}

interface PublishRoadmapItemInput {
  roadmapItemId: number;
  version: number;
  isPublic: boolean;
}

export function usePublishRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "item", "publication"],
    mutationFn: ({ roadmapItemId, ...input }: PublishRoadmapItemInput) =>
      apiClient.patch<ScoredRoadmapItem>(
        `/build/roadmap-items/${roadmapItemId}/publication`,
        input,
        undefined,
        roadmapItemContract,
      ),
    onSuccess: (result) => patchRoadmapItemInCache(qc, result),
  });
}
