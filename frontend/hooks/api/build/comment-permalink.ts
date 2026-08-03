"use client";

import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface CommentPermalinkData {
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

interface TicketPermalinkData {
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
    queryKey: queryKeys.projects.commentPermalinkWithComment(projectId, ticketId, commentId),
    queryFn: () =>
      apiClient.get<CommentPermalinkData>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}`,
      ),
    staleTime: 60_000,
    retry: false,
  });
}

export function ticketPermalinkQueryOptions(projectId: number, ticketId: number) {
  return queryOptions<TicketPermalinkData>({
    queryKey: queryKeys.projects.commentPermalinkTicket(projectId, ticketId),
    queryFn: () =>
      apiClient.get<TicketPermalinkData>(`/build/${projectId}/tickets/${ticketId}`),
    staleTime: 60_000,
    retry: false,
  });
}
