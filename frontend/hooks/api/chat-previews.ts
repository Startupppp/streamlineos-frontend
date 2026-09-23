"use client";

import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { commentPermalinkLazy } from "@/hooks/api/build/comment-permalink";
import type {
  CommentPermalinkData,
  TicketPermalinkData,
} from "@/hooks/api/build/comment-permalink";
import { lazyContract } from "@/lib/api-envelope";

const ticketDetailLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then((m) => m.ticketDetailContract),
);

export type { CommentPermalinkData, TicketPermalinkData };

export function useCommentPermalink(
  projectId: number,
  ticketId: number,
  commentId: string,
) {
  return useGatedQuery("build:tickets:view", {
    queryKey: buildWorkQueryKeys.projects.commentPermalinkWithComment(
      projectId,
      ticketId,
      commentId,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<CommentPermalinkData>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        undefined,
        signal,
        commentPermalinkLazy,
      ),
    staleTime: 60_000,
    retry: false,
  });
}

export function useTicketPermalink(
  projectId: number,
  ticketId: number,
  options?: Omit<
    UseQueryOptions<TicketPermalinkData, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useGatedQuery("build:tickets:view", {
    queryKey: buildWorkQueryKeys.projects.commentPermalinkTicket(
      projectId,
      ticketId,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<TicketPermalinkData>(
        `/build/${projectId}/tickets/${ticketId}`,
        undefined,
        signal,
        ticketDetailLazy,
      ),
    staleTime: 60_000,
    retry: false,
    ...options,
    enabled: !!projectId && !!ticketId && (options?.enabled ?? true),
  });
}
