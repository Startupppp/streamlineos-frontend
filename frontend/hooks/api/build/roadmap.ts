"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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
  orgName: string;
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
  type: "roadmap" | "feedback";
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
    queryKey: queryKeys.roadmap.items(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<RoadmapItem>>("/build/roadmap", params, signal),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "create"],
    mutationFn: (input: CreateRoadmapItemInput) =>
      apiClient.post<RoadmapItem>("/build/roadmap", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "update"],
    mutationFn: ({ id, ...input }: UpdateRoadmapItemInput & { id: number }) =>
      apiClient.patch<RoadmapItem>(`/build/roadmap/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "roadmap", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/roadmap/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useFeedbackPosts(filters: FeedbackPostFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: queryKeys.roadmap.feedback(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<FeedbackPost>>("/build/feedback", params, signal),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "update"],
    mutationFn: ({ id, ...input }: UpdateFeedbackPostInput & { id: number }) =>
      apiClient.patch<FeedbackPost>(`/build/feedback/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useMergeFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "merge"],
    mutationFn: ({ id, targetPostId }: { id: number; targetPostId: number }) =>
      apiClient.post<FeedbackPost>(`/build/feedback/${id}/merge`, { targetPostId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useDeleteFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/feedback/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useChangelog(filters: ChangelogFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: queryKeys.roadmap.changelog(params),
    queryFn: ({ signal }) => apiClient.get<CursorPaginated<ChangelogEntry>>("/build/changelog", params, signal),
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
      apiClient.post<ChangelogEntry>("/build/changelog", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useUpdateChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "update"],
    mutationFn: ({ id, ...input }: UpdateChangelogEntryInput & { id: number }) =>
      apiClient.patch<ChangelogEntry>(`/build/changelog/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function useDeleteChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/changelog/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.all }),
  });
}

export function usePublicRoadmap(orgId: string) {
  return useQuery({
    queryKey: queryKeys.roadmap.publicBoard(orgId),
    queryFn: ({ signal }) => apiClient.get<PublicRoadmapBoard>("/public/roadmap", { org: orgId }, signal),
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
      apiClient.post<PublicVoteResult>(`/public/roadmap/vote?org=${encodeURIComponent(orgId)}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.publicBoard(orgId) }),
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
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roadmap.publicBoard(orgId) }),
  });
}
