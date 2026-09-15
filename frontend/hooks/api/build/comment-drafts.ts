"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useQuery<CommentDraft[]>({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.mine(),
    queryFn: ({ signal }) => apiClient.get<CommentDraft[]>("/build/comment-drafts/mine", undefined, signal, commentDraftListContract),
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
      qc.setQueryData<CommentDraft[]>(
        buildWorkQueryKeys.projects.commentDrafts.mine(),
        (current) => {
          if (!current) return current;
          const index = current.findIndex((d) => d.ticketId === draft.ticketId);
          if (index === -1) return [draft, ...current];
          const next = [...current];
          next[index] = draft;
          return next;
        },
      );
    },
  });
}

export function useDeleteCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${id}`, undefined, undefined, commentDraftDeletedContract),
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
