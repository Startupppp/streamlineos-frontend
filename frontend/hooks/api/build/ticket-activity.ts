"use client";

import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
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
  | "label_changed"
  | "estimate_changed"
  | "cycle_changed"
  | "type_changed";

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
  const canView = useCan("build:tickets:view");
  return useQuery({
    queryKey: queryKeys.ticketActivity.list(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketActivityEntry[]>(
        `/build/${projectId}/tickets/${ticketId}/activity`, undefined, signal,
      ),
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}
