"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { GeneratedCommentDraft } from "./comment-drafts-schema";
export { useUpsertCommentDraft, useDeleteCommentDraftByTicket } from "./comment-draft-commands";
export { useTicketCommentDraft } from "./comment-drafts-read";

export type { CommentDraftAssignee, CommentDraftTicket, CommentDraft, CommentDraftListItem } from "./comment-draft-command-cache";
import type { CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";

const commentDraftListContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftListContract),
);
const commentDraftDeletedContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftDeletedContract),
);
const generatedCommentDraftContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.generatedCommentDraftSchema),
);

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useInfiniteQuery<CommentDraftsListMineResponse, Error, InfiniteData<CommentDraftsListMineResponse>, ReturnType<typeof buildWorkQueryKeys.projects.commentDrafts.mine>, string | null>({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.mine(),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CommentDraftsListMineResponse>(
        "/build/comment-drafts/mine",
        pageParam !== null ? { cursor: pageParam } : undefined,
        signal,
        commentDraftListContract,
      ),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useDeleteCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: (draftId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${draftId}`, undefined, undefined, commentDraftDeletedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}

export function useDeleteAllCommentDrafts() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete-all"],
    mutationFn: () =>
      apiClient.delete<{ deleted: boolean }>("/build/comment-drafts/mine", undefined, undefined, commentDraftDeletedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}

export function useGenerateCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", "comment-drafts", "generate"],
    mutationFn: ({ ticketId, signal }: { ticketId: number; signal?: AbortSignal }) =>
      apiClient.post<GeneratedCommentDraft>(
        `/build/comment-drafts/tickets/${ticketId}/generate-draft`,
        undefined,
        signal ? { signal } : undefined,
        generatedCommentDraftContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.all() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}
