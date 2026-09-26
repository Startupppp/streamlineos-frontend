"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type {
  RoadmapStatus,
  FeedbackStatus,
  ChangelogType,
  RoadmapItem,
  FeedbackPost,
  ChangelogEntry,
  PublicRoadmapItem,
  PublicFeedbackPost,
  PublicChangelogEntry,
} from "@/types/projects";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CrmAccountTier,
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
const feedbackPageContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.feedbackPageContract),
);
const feedbackPostContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.feedbackPostContract),
);
const changelogPageContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.changelogPageContract),
);
const changelogEntryContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.changelogEntryContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const publicRoadmapBoardContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicRoadmapBoardContract),
);
const publicVoteResultContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicVoteResultContract),
);
const publicFeedbackResultContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.publicFeedbackResultContract),
);
const roadmapSignalsContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapSignalsContract),
);
const roadmapPublicationLazy = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapPublicationContract),
);

export interface RoadmapPublication {
  token: string | null;
  path: string | null;
}

export type { CrmAccountTier, RoadmapPrioritization, RoadmapSignals, RoadmapTierWeighting };

export type {
  ChangelogType,
  RoadmapItem,
  FeedbackPost,
  ChangelogEntry,
  PublicRoadmapItem,
  PublicFeedbackPost,
  PublicChangelogEntry,
} from "@/types/projects";

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
  projectId?: number;
  horizon?: string;
  ownerId?: string;
  sort?: string;
}

interface CreateRoadmapItemInput {
  title: string;
  description?: string;
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
}

interface UpdateRoadmapItemInput {
  title?: string;
  description?: string | null;
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
}

export interface ScoredRoadmapItem extends RoadmapItem {
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  prioritization: RoadmapPrioritization;
  tierWeighting: RoadmapTierWeighting;
}

interface FeedbackPostFilters {
  status?: FeedbackStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}


interface UpdateFeedbackPostInput {
  title?: string;
  description?: string | null;
  status?: FeedbackStatus;
  category?: string | null;
  crmOrganizationId?: number | null;
  linkedRoadmapItemId?: number | null;
}

interface ChangelogFilters {
  type?: ChangelogType;
  cursor?: string;
  limit?: number;
}

interface CreateChangelogEntryInput {
  title: string;
  content?: string;
  version?: string;
  type?: ChangelogType;
  isPublished?: boolean;
  linkedRoadmapItemId?: number;
}

interface UpdateChangelogEntryInput {
  title?: string;
  content?: string;
  version?: string | null;
  type?: ChangelogType;
  isPublished?: boolean;
  linkedRoadmapItemId?: number | null;
}

interface PublicRoadmapBoard {
  orgName: string | null;
  roadmap: {
    planned: PublicRoadmapItem[];
    in_progress: PublicRoadmapItem[];
    completed: PublicRoadmapItem[];
  };
  feedback: PublicFeedbackPost[];
  changelog: PublicChangelogEntry[];
}

interface PublicVoteInput {
  type: "roadmap" | "feedback";
  id: number;
  voterKey: string;
}

interface PublicVoteResult {
  id: number;
  type: string;
  votes: number;
  voted: boolean;
}

interface SubmitPublicFeedbackInput {
  title: string;
  description?: string;
  name?: string;
  email?: string;
}

export function useRoadmapItems(filters: RoadmapItemFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<ScoredRoadmapItem>>("/build/roadmap", params, signal, roadmapPageContract),
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
      apiClient.post<ScoredRoadmapItem>("/build/roadmap", input, undefined, roadmapItemContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() }),
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "update"],
    mutationFn: ({ roadmapItemId, ...input }: UpdateRoadmapItemInput & { roadmapItemId: number }) =>
      apiClient.patch<ScoredRoadmapItem>(`/build/roadmap/${roadmapItemId}`, input, undefined, roadmapItemContract),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.item(vars.roadmapItemId) });
    },
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "delete"],
    mutationFn: (roadmapItemId: number) =>
      apiClient.delete<void>(`/build/roadmap/${roadmapItemId}`, undefined, undefined, noContentLazy),
    onSuccess: (_result, roadmapItemId) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.item(roadmapItemId) });
    },
  });
}

export function useFeedbackPosts(filters: FeedbackPostFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<FeedbackPost>>("/build/feedback", params, signal, feedbackPageContract),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "update"],
    mutationFn: ({ postId, ...input }: UpdateFeedbackPostInput & { postId: number }) =>
      apiClient.patch<FeedbackPost>(`/build/feedback/${postId}`, input, undefined, feedbackPostContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot });
    },
  });
}

export function useMergeFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "merge"],
    mutationFn: ({ postId, targetPostId }: { postId: number; targetPostId: number }) =>
      apiClient.post<FeedbackPost>(`/build/feedback/${postId}/merge`, { targetPostId }, undefined, feedbackPostContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot });
    },
  });
}

export function useDeleteFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "delete"],
    mutationFn: (postId: number) =>
      apiClient.delete<void>(`/build/feedback/${postId}`, undefined, undefined, noContentLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot });
    },
  });
}

export function useChangelog(filters: ChangelogFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<ChangelogEntry>>("/build/changelog", params, signal, changelogPageContract),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "create"],
    mutationFn: (input: CreateChangelogEntryInput) =>
      apiClient.post<ChangelogEntry>("/build/changelog", input, undefined, changelogEntryContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog() }),
  });
}

export function useUpdateChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "update"],
    mutationFn: ({ entryId, ...input }: UpdateChangelogEntryInput & { entryId: number }) =>
      apiClient.patch<ChangelogEntry>(`/build/changelog/${entryId}`, input, undefined, changelogEntryContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog() }),
  });
}

export function useDeleteChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "delete"],
    mutationFn: (entryId: number) =>
      apiClient.delete<void>(`/build/changelog/${entryId}`, undefined, undefined, noContentLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog() }),
  });
}

export function usePublicRoadmap(orgId: string) {
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId),
    queryFn: ({ signal }) => apiClient.get<PublicRoadmapBoard>("/public/roadmap", { org: orgId }, signal, publicRoadmapBoardContract),
    enabled: Boolean(orgId),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicVote(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "roadmap", "vote"],
    mutationFn: (input: PublicVoteInput) =>
      apiClient.post<PublicVoteResult>(`/public/roadmap/vote?org=${encodeURIComponent(orgId)}`, input, undefined, publicVoteResultContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId) }),
  });
}

export function useSubmitPublicFeedback(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "feedback", "submit"],
    mutationFn: (input: SubmitPublicFeedbackInput) =>
      apiClient.post<{ id: number; message: string }>(
        `/public/roadmap/feedback?org=${encodeURIComponent(orgId)}`,
        input,
        undefined,
        publicFeedbackResultContract,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.publicBoard(orgId) }),
  });
}

export function useRoadmapPublication() {
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.publication,
    queryFn: ({ signal }) =>
      apiClient.get<RoadmapPublication>("/build/roadmap-publication", undefined, signal, roadmapPublicationLazy),
    enabled: canView,
    staleTime: 5 * 60_000,
  });
}

export function usePublishRoadmap() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "publication", "publish"],
    mutationFn: () =>
      apiClient.post<RoadmapPublication>("/build/roadmap-publication", {}, undefined, roadmapPublicationLazy),
    onSuccess: (publication) =>
      qc.setQueryData(knowledgeAndSurveysQueryKeys.roadmap.publication, publication),
  });
}

export function useRotateRoadmapPublicationToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "publication", "rotate"],
    mutationFn: () =>
      apiClient.post<RoadmapPublication>("/build/roadmap-publication/rotate", {}, undefined, roadmapPublicationLazy),
    onSuccess: (publication) =>
      qc.setQueryData(knowledgeAndSurveysQueryKeys.roadmap.publication, publication),
  });
}

export function useUnpublishRoadmap() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "publication", "unpublish"],
    mutationFn: () =>
      apiClient.delete<void>("/build/roadmap-publication", undefined, undefined, noContentLazy),
    onSuccess: () =>
      qc.setQueryData(knowledgeAndSurveysQueryKeys.roadmap.publication, { token: null, path: null }),
  });
}
