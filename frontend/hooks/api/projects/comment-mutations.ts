"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UpdateCommentInput {
  commentId: number;
  ticketId: number;
  projectId: number;
  content: string;
}

interface DeleteCommentInput {
  commentId: number;
  ticketId: number;
  projectId: number;
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; content: string; updatedAt: string }, Error, UpdateCommentInput>({
    mutationKey: ["projects", "tickets", "comments", "update"],
    mutationFn: ({ commentId, ticketId, projectId, content }) =>
      apiClient.patch<{ id: number; content: string; updatedAt: string }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { content }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.list(variables.ticketId),
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteCommentInput>({
    mutationKey: ["projects", "tickets", "comments", "delete"],
    mutationFn: ({ commentId, ticketId, projectId }) =>
      apiClient.delete<void>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.list(variables.ticketId),
      });
    },
  });
}
