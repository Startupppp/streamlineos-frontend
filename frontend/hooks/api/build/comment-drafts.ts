"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { GeneratedCommentDraft } from "./comment-drafts-schema";

export interface CommentDraftAssignee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface CommentDraftTicket {
  id: number;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  projectId: number | null;
  projectKey: string | null;
  projectName: string | null;
  assignee: CommentDraftAssignee | null;
}

export interface CommentDraft {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  ticket?: CommentDraftTicket;
}

export interface CommentDraftListItem extends CommentDraft {
  ticket: CommentDraftTicket;
}


const commentDraftListContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftListContract),
);
const commentDraftContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftContract),
);
const commentDraftDeletedContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftDeletedContract),
);
const generatedCommentDraftContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.generatedCommentDraftSchema),
);

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useQuery<CommentDraftListItem[]>({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.mine(),
    queryFn: ({ signal }) => apiClient.get<CommentDraftListItem[]>("/build/comment-drafts/mine", undefined, signal, commentDraftListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useUpsertCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "upsert"],
    mutationFn: ({ ticketId, body }: { ticketId: number; body: string }) =>
      apiClient.put<CommentDraft>(`/build/comment-drafts/tickets/${ticketId}`, { body }, undefined, commentDraftContract),
    onSuccess: (draft) => {
      const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
      const current = qc.getQueryData<CommentDraftListItem[]>(listKey);
      const index = current?.findIndex((d) => d.ticketId === draft.ticketId) ?? -1;
      const cached = index === -1 ? undefined : current?.[index];
      const ticket = draft.ticket ?? cached?.ticket;

      if (!current || !ticket) {
        void qc.invalidateQueries({ queryKey: listKey });
        return;
      }

      const merged: CommentDraftListItem = { ...cached, ...draft, ticket };
      const next = [...current];
      if (index === -1) next.unshift(merged);
      else next[index] = merged;
      qc.setQueryData(listKey, next);
    },
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
    },
  });
}

export function useDeleteCommentDraftByTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete-by-ticket"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/tickets/${ticketId}`, undefined, undefined, commentDraftDeletedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
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
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
    },
  });
}
