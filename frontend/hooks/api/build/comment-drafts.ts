"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CommentDraftsGenerateDraftResponse, CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";
import { applyCommentDraftReceipt } from "./comment-draft-command-cache";

const commentDraftListContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.commentDraftsListMineResponseSchema),
);
const commentDraftDeletedContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.commentDraftsDeleteOneResponseSchema),
);
const generatedCommentDraftContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.commentDraftsGenerateDraftResponseSchema),
);

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;
type DraftPagesSnap = DraftPages | undefined;

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useInfiniteQuery<CommentDraftsListMineResponse, Error, DraftPages, ReturnType<typeof buildWorkQueryKeys.projects.commentDrafts.mine>, string | null>({
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
  return useAuthorizedMutation<{ deleted: boolean }, Error, number, DraftPagesSnap>("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: (draftId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${draftId}`, undefined, undefined, commentDraftDeletedContract),
    onMutate: async (draftId) => {
      const key = buildWorkQueryKeys.projects.commentDrafts.mine();
      await qc.cancelQueries({ queryKey: key, exact: true });
      const previous = qc.getQueryData<DraftPages>(key);
      if (previous) {
        qc.setQueryData<DraftPages>(key, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            data: page.data.filter((d) => d.id !== draftId),
          })),
        });
      }
      return previous;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll(), refetchType: "none" });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), ctx);
    },
  });
}

export function useDeleteAllCommentDrafts() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ deleted: boolean }, Error, void, DraftPagesSnap>("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete-all"],
    mutationFn: () =>
      apiClient.delete<{ deleted: boolean }>("/build/comment-drafts/mine", undefined, undefined, commentDraftDeletedContract),
    onMutate: async () => {
      const key = buildWorkQueryKeys.projects.commentDrafts.mine();
      await qc.cancelQueries({ queryKey: key, exact: true });
      const previous = qc.getQueryData<DraftPages>(key);
      if (previous) {
        qc.setQueryData<DraftPages>(key, {
          ...previous,
          pages: previous.pages.map((page) => ({ ...page, data: [] })),
        });
      }
      return previous;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll(), refetchType: "none" });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), ctx);
    },
  });
}

export function useGenerateCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", "comment-drafts", "generate"],
    mutationFn: ({ ticketId, signal }: { ticketId: number; signal?: AbortSignal }) =>
      apiClient.post<CommentDraftsGenerateDraftResponse>(
        `/build/comment-drafts/tickets/${ticketId}/generate-draft`,
        undefined,
        signal ? { signal } : undefined,
        generatedCommentDraftContract,
      ),
    onSuccess: (data) => {
      applyCommentDraftReceipt(qc, data.ticketId, data);
    },
  });
}
