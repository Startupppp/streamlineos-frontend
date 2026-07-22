"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CommentDraftTicket {
  id: number;
  ticketNumber: number;
  title: string;
  projectId: number | null;
  projectKey: string | null;
}

export interface CommentDraft {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  ticket: CommentDraftTicket;
}

export function useMyCommentDrafts() {
  return useQuery<CommentDraft[]>({
    queryKey: queryKeys.projects.commentDrafts.mine(),
    queryFn: () => apiClient.get<CommentDraft[]>("/projects/comment-drafts/mine"),
    staleTime: 60_000,
  });
}

export function useUpsertCommentDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "comment-drafts", "upsert"],
    mutationFn: ({ ticketId, body }: { ticketId: number; body: string }) =>
      apiClient.put<CommentDraft>(`/projects/comment-drafts/tickets/${ticketId}`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.commentDrafts.mine() });
    },
  });
}

export function useDeleteCommentDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ deleted: boolean }>(`/projects/comment-drafts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.commentDrafts.mine() });
    },
  });
}

export function useDeleteCommentDraftByTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "comment-drafts", "delete-by-ticket"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/projects/comment-drafts/tickets/${ticketId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.commentDrafts.mine() });
    },
  });
}

export function useDeleteAllCommentDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "comment-drafts", "delete-all"],
    mutationFn: () =>
      apiClient.delete<{ deleted: boolean }>("/projects/comment-drafts/mine"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.commentDrafts.mine() });
    },
  });
}
