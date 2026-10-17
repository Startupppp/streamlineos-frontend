"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ApiError, lazyContract } from "@/lib/api-envelope";
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
interface DraftDeletionContext {
  ticketId: number | undefined;
  removed: { key: QueryKey; drafts: CommentDraftsListMineResponse["data"] }[];
}

export function useMyCommentDrafts(cursor?: string) {
  const canView = useCan("build:tickets:view");
  return useInfiniteQuery<CommentDraftsListMineResponse, Error, DraftPages, ReturnType<typeof buildWorkQueryKeys.projects.commentDrafts.mine>, string | null>({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.mine(cursor),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CommentDraftsListMineResponse>(
        "/build/comment-drafts/mine",
        pageParam !== null ? { cursor: pageParam } : undefined,
        signal,
        commentDraftListContract,
      ),
    initialPageParam: cursor ?? null,
    maxPages: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useDeleteCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ deleted: boolean }, Error, number, DraftDeletionContext>("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: async (draftId: number) => {
      const result = await apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${draftId}`, undefined, undefined, commentDraftDeletedContract);
      if (!result.deleted) throw new ApiError("The draft deletion was not confirmed.", undefined, "INVALID_RESPONSE");
      return result;
    },
    onMutate: async (draftId) => {
      const key = buildWorkQueryKeys.projects.commentDrafts.mine();
      await qc.cancelQueries({ queryKey: key });
      const removed = qc.getQueriesData<DraftPages>({ queryKey: key }).map(([queryKey, previous]) => ({
        key: queryKey, drafts: previous?.pages.flatMap((page) => page.data.filter((draft) => draft.id === draftId)) ?? [],
      }));
      qc.setQueriesData<DraftPages>({ queryKey: key }, (previous) => previous ? {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            data: page.data.filter((d) => d.id !== draftId),
          })),
        } : previous);
      return { ticketId: removed.find((entry) => entry.drafts.length)?.drafts[0]?.ticketId, removed };
    },
    onSuccess: (_result, _draftId, context) => {
      if (context?.ticketId) qc.removeQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.byTicket(context.ticketId), exact: true });
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll(), refetchType: "none" });
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.removed.length) return;
      for (const entry of ctx.removed) {
        if (!entry.drafts.length) continue;
        qc.setQueryData<DraftPages>(entry.key, (current) => current ? {
          ...current, pages: current.pages.map((page) => ({ ...page, data: [
            ...entry.drafts.filter((draft) => !page.data.some((item) => item.id === draft.id)), ...page.data,
          ] })),
        } : current);
      }
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
