"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useQuery<CommentDraft[]>({
    queryKey: queryKeys.projects.commentDrafts.mine(),
    queryFn: () => apiClient.get<CommentDraft[]>("/build/comment-drafts/mine"),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useUpsertCommentDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "comment-drafts", "upsert"],
    mutationFn: ({ ticketId, body }: { ticketId: number; body: string }) =>
      apiClient.put<CommentDraft>(`/build/comment-drafts/tickets/${ticketId}`, { body }),
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
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${id}`),
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
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/tickets/${ticketId}`),
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
      apiClient.delete<{ deleted: boolean }>("/build/comment-drafts/mine"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.commentDrafts.mine() });
    },
  });
}
