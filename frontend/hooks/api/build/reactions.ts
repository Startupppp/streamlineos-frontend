"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import type { Ticket, TicketComment, CommentReaction } from "@/types/projects";

const reactionLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.reactionContract),
);

const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface CommentReactionInput {
  commentId: number;
  emoji: string;
  userId: string;
}

interface ReactionSnapshot {
  previousComments: TicketComment[] | undefined;
}

function patchComments(
  ticket: Ticket | null | undefined,
  patch: (comments: TicketComment[]) => TicketComment[],
): Ticket | null | undefined {
  if (!ticket?.comments) return ticket;
  return { ...ticket, comments: patch(ticket.comments) };
}

function withReaction(comments: TicketComment[], commentId: number, reaction: CommentReaction) {
  return comments.map((comment) => {
    if (comment.id !== commentId) return comment;
    const reactions = comment.reactions ?? [];
    if (reactions.some((existing) => existing.emoji === reaction.emoji && existing.userId === reaction.userId))
      return comment;
    return { ...comment, reactions: [...reactions, reaction] };
  });
}

function withoutReaction(comments: TicketComment[], commentId: number, reaction: CommentReaction) {
  return comments.map((comment) => {
    if (comment.id !== commentId) return comment;
    return {
      ...comment,
      reactions: (comment.reactions ?? []).filter(
        (existing) => !(existing.emoji === reaction.emoji && existing.userId === reaction.userId),
      ),
    };
  });
}

export function useAddReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<CommentReaction, Error, CommentReactionInput, ReactionSnapshot>(
    "build:tickets:update",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "add"],
    mutationFn: ({ commentId, emoji }) =>
      apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions`,
        { emoji },
        undefined,
        reactionLazy,
      ),
    onMutate: async (variables) => {
      const ticketKey = buildWorkQueryKeys.projects.ticket(ticketId);
      await qc.cancelQueries({ queryKey: ticketKey });
      const previousComments = qc.getQueryData<Ticket | null>(ticketKey)?.comments;
      qc.setQueryData<Ticket | null>(ticketKey, (current) =>
        patchComments(current, (comments) =>
          withReaction(comments, variables.commentId, {
            emoji: variables.emoji,
            userId: variables.userId,
          }),
        ),
      );
      return { previousComments };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousComments) return;
      qc.setQueryData<Ticket | null>(buildWorkQueryKeys.projects.ticket(ticketId), (current) =>
        patchComments(current, () => context.previousComments ?? []),
      );
    },
  });
}

export function useRemoveReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, CommentReactionInput, ReactionSnapshot>(
    "build:tickets:update",
    {
    mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "remove"],
    mutationFn: ({ commentId, emoji }) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onMutate: async (variables) => {
      const ticketKey = buildWorkQueryKeys.projects.ticket(ticketId);
      await qc.cancelQueries({ queryKey: ticketKey });
      const previousComments = qc.getQueryData<Ticket | null>(ticketKey)?.comments;
      qc.setQueryData<Ticket | null>(ticketKey, (current) =>
        patchComments(current, (comments) =>
          withoutReaction(comments, variables.commentId, {
            emoji: variables.emoji,
            userId: variables.userId,
          }),
        ),
      );
      return { previousComments };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousComments) return;
      qc.setQueryData<Ticket | null>(buildWorkQueryKeys.projects.ticket(ticketId), (current) =>
        patchComments(current, () => context.previousComments ?? []),
      );
    },
  });
}
