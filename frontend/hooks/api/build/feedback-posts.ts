"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { FeedbackStatus, FeedbackPost } from "@/types/projects";

const feedbackPageContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.feedbackPageContract),
);
const feedbackPostContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.feedbackPostContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface CursorPaginated<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
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

export function useFeedbackPosts(filters: FeedbackPostFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginated<FeedbackPost>>(
        "/build/feedback",
        params,
        signal,
        feedbackPageContract,
      ),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useUpdateFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "update"],
    mutationFn: ({
      postId,
      ...input
    }: UpdateFeedbackPostInput & { postId: number }) =>
      apiClient.patch<FeedbackPost>(
        `/build/feedback/${postId}`,
        input,
        undefined,
        feedbackPostContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot,
      });
    },
  });
}

export function useMergeFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "merge"],
    mutationFn: ({
      postId,
      targetPostId,
    }: {
      postId: number;
      targetPostId: number;
    }) =>
      apiClient.post<FeedbackPost>(
        `/build/feedback/${postId}/merge`,
        { targetPostId },
        undefined,
        feedbackPostContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot,
      });
    },
  });
}

export function useDeleteFeedbackPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "feedback", "delete"],
    mutationFn: (postId: number) =>
      apiClient.delete<void>(
        `/build/feedback/${postId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.feedback(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(),
      });
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.itemRoot,
      });
    },
  });
}
