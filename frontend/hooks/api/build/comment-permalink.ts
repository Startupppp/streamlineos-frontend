"use client";

import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface CommentPermalinkData {
  id: string;
  content: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  parentCommentId: string | null;
  author: { id: string; name: string | null; image: string | null };
  ticket: {
    id: string;
    ticketNumber: number;
    title: string;
    projectKey: string | null;
    projectId: number;
  };
}

export interface TicketPermalinkData {
  id: number;
  title: string;
  status: string;
  priority: string;
  ticketNumber: number;
  projectId: number;
  projectKey?: string;
}

export function commentPermalinkQueryOptions(
  projectId: number,
  ticketId: number,
  commentId: string,
) {
  return queryOptions<CommentPermalinkData>({
    queryKey: buildWorkQueryKeys.projects.commentPermalinkWithComment(projectId, ticketId, commentId),
    queryFn: ({ signal }) =>
      apiClient.get<CommentPermalinkData>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`, undefined, signal,
      ),
    staleTime: 60_000,
    retry: false,
  });
}

export function ticketPermalinkQueryOptions(projectId: number, ticketId: number) {
  return queryOptions<TicketPermalinkData>({
    queryKey: buildWorkQueryKeys.projects.commentPermalinkTicket(projectId, ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketPermalinkData>(`/build/${projectId}/tickets/${ticketId}`, undefined, signal),
    staleTime: 60_000,
    retry: false,
  });
}
