"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  return useAuthorizedMutation<{ id: number; content: string; updatedAt: string }, Error, UpdateCommentInput>("build:tickets:update", {
    mutationKey: ["projects", "tickets", "comments", "update"],
    mutationFn: ({ commentId, ticketId, projectId, content }) =>
      apiClient.patch<{ id: number; content: string; updatedAt: string }>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { content }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId),
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, DeleteCommentInput>("build:tickets:update", {
    mutationKey: ["projects", "tickets", "comments", "delete"],
    mutationFn: ({ commentId, ticketId, projectId }) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId),
      });
    },
  });
}
