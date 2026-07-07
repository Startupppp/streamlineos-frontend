"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type TicketActivityAction =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "title_changed"
  | "sprint_changed"
  | "due_date_changed"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "label_changed";

export interface TicketActivityEntry {
  id: number;
  action: TicketActivityAction;
  label: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string | null;
  user: { id: string; name: string | null; image: string | null } | null;
}

export function useTicketActivity(projectId: number, ticketId: number) {
  return useQuery({
    queryKey: queryKeys.ticketActivity.list(ticketId),
    queryFn: () =>
      apiClient.get<TicketActivityEntry[]>(
        `/projects/${projectId}/tickets/${ticketId}/activity`,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}
