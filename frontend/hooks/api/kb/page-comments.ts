"use client";

import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages, type Page } from "@/lib/api/select-flat-pages";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

export type KbPageComment = {
  id: number;
  orgId: string;
  pageId: number;
  authorId: string | null;
  authorName: string | null;
  parentId: number | null;
  content: string;
  anchorBlockIndex: number | null;
  anchorQuote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKbPageCommentInput = {
  content: string;
  parentId?: number | null;
  anchorBlockIndex?: number | null;
  anchorQuote?: string | null;
};

export type KbPageCommentsPage = Page<KbPageComment>;

const kbPageCommentListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-comments-schema").then((m) => m.kbPageCommentListContract),
);

const kbPageCommentContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-comments-schema").then((m) => m.kbPageCommentContract),
);

export function useKbPageComments(pageId: number) {
  const canViewPages = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(pageId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbPageCommentsPage>(
        `/kb/pages/${pageId}/comments`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        kbPageCommentListContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    staleTime: 30_000,
    enabled: canViewPages && pageId > 0,
  });
}

type KbPageCommentsCache = InfiniteData<KbPageCommentsPage>;

function patchLoadedComments(
  qc: QueryClient,
  pageId: number,
  patch: (comments: KbPageComment[]) => KbPageComment[],
) {
  qc.setQueryData<KbPageCommentsCache>(
    knowledgeAndSurveysQueryKeys.kb.pageComments(pageId),
    (cached) => cached && {
      ...cached,
      pages: cached.pages.map((page) => ({ ...page, data: patch(page.data) })),
    },
  );
}

function replaceComment(updated: KbPageComment) {
  return (comments: KbPageComment[]) =>
    comments.map((comment) => (comment.id === updated.id ? updated : comment));
}

function appendCreatedComment(qc: QueryClient, created: KbPageComment) {
  const key = knowledgeAndSurveysQueryKeys.kb.pageComments(created.pageId);
  const cached = qc.getQueryData<KbPageCommentsCache>(key);
  const last = cached?.pages.at(-1);
  if (!cached || !last) return;
  if (last.pagination.nextCursor !== null) {
    qc.invalidateQueries({ queryKey: key });
    return;
  }
  qc.setQueryData<KbPageCommentsCache>(key, {
    ...cached,
    pages: [...cached.pages.slice(0, -1), { ...last, data: [...last.data, created] }],
  });
}

export function useCreateKbPageComment() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "create"],
    mutationFn: ({ pageId, ...data }: CreateKbPageCommentInput & { pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/pages/${pageId}/comments`, data, operation.configFor({ pageId, ...data }), kbPageCommentContract),
    onSuccess: (created) => {
      operation.settle();
      appendCreatedComment(qc, created);
    },
  });
}

export function useUpdateKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "update"],
    mutationFn: ({ commentId, content }: { commentId: number; pageId: number; content: string }) =>
      apiClient.patch<KbPageComment>(`/kb/page-comments/${commentId}`, { content }, undefined, kbPageCommentContract),
    onSuccess: (updated, variables) => {
      patchLoadedComments(qc, variables.pageId, replaceComment(updated));
    },
  });
}

export function useDeleteKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "delete"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.delete<void>(`/kb/page-comments/${commentId}`, undefined, undefined, noContentC),
    onSuccess: (_, variables) => {
      patchLoadedComments(qc, variables.pageId, (comments) =>
        comments.filter((comment) => comment.id !== variables.commentId && comment.parentId !== variables.commentId),
      );
    },
  });
}

export function useResolveKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "resolve"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/page-comments/${commentId}/resolve`, undefined, undefined, kbPageCommentContract),
    onSuccess: (updated, variables) => {
      patchLoadedComments(qc, variables.pageId, replaceComment(updated));
    },
  });
}
