"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { Ticket, TicketComment } from "@/types/projects";

const commentEditResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.commentEditResultContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

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

interface CommentSnapshot {
  previousComments: TicketComment[] | undefined;
}

function patchComments(
  ticket: Ticket | null | undefined,
  patch: (comments: TicketComment[]) => TicketComment[],
): Ticket | null | undefined {
  if (!ticket?.comments) return ticket;
  return { ...ticket, comments: patch(ticket.comments) };
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ updated: true }, Error, UpdateCommentInput, CommentSnapshot>(
    "build:tickets:update",
    {
      mutationKey: ["projects", "tickets", "comments", "update"],
      mutationFn: ({ commentId, ticketId, projectId, content }) =>
        apiClient.patch<{ updated: true }>(
          `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`,
          { content },
          undefined,
          commentEditResultLazy,
        ),
      onMutate: async (variables) => {
        const ticketKey = buildWorkQueryKeys.projects.ticket(variables.projectId, variables.ticketId);
        await queryClient.cancelQueries({ queryKey: ticketKey });
        const previousComments = queryClient.getQueryData<Ticket | null>(ticketKey)?.comments;
        const editedAt = new Date().toISOString();
        queryClient.setQueryData<Ticket | null>(ticketKey, (current) =>
          patchComments(current, (comments) =>
            comments.map((c) =>
              c.id === variables.commentId
                ? { ...c, content: variables.content, updatedAt: editedAt }
                : c,
            ),
          ),
        );
        return { previousComments };
      },
      onError: (_error, variables, context) => {
        if (!context?.previousComments) return;
        queryClient.setQueryData<Ticket | null>(
          buildWorkQueryKeys.projects.ticket(variables.projectId, variables.ticketId),
          (current) => patchComments(current, () => context.previousComments ?? []),
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId),
        });
      },
    },
  );
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, DeleteCommentInput, CommentSnapshot>(
    "build:tickets:update",
    {
      mutationKey: ["projects", "tickets", "comments", "delete"],
      mutationFn: ({ commentId, ticketId, projectId }) =>
        apiClient.delete<void>(
          `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`,
          undefined,
          undefined,
          noContentContract,
        ),
      onMutate: async (variables) => {
        const ticketKey = buildWorkQueryKeys.projects.ticket(variables.projectId, variables.ticketId);
        await queryClient.cancelQueries({ queryKey: ticketKey });
        const previousComments = queryClient.getQueryData<Ticket | null>(ticketKey)?.comments;
        queryClient.setQueryData<Ticket | null>(ticketKey, (current) =>
          patchComments(current, (comments) =>
            comments.filter(
              (c) => c.id !== variables.commentId && c.parentCommentId !== variables.commentId,
            ),
          ),
        );
        return { previousComments };
      },
      onError: (_error, variables, context) => {
        if (!context?.previousComments) return;
        queryClient.setQueryData<Ticket | null>(
          buildWorkQueryKeys.projects.ticket(variables.projectId, variables.ticketId),
          (current) => patchComments(current, () => context.previousComments ?? []),
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: accountingAndSupportQueryKeys.ticketActivity.list(variables.ticketId),
        });
      },
    },
  );
}
