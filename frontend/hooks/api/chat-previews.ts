"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import {
  commentPermalinkQueryOptions,
  ticketPermalinkQueryOptions,
  type CommentPermalinkData,
  type TicketPermalinkData,
} from "@/hooks/api/build/comment-permalink";

export type { CommentPermalinkData, TicketPermalinkData };

export function useCommentPermalink(
  projectId: number,
  ticketId: number,
  commentId: string,
) {
  return useQuery(commentPermalinkQueryOptions(projectId, ticketId, commentId));
}

export function useTicketPermalink(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<TicketPermalinkData, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<TicketPermalinkData, Error>({
    ...ticketPermalinkQueryOptions(projectId, ticketId),
    ...options,
    enabled: !!projectId && !!ticketId && (options?.enabled ?? true),
  });
}
