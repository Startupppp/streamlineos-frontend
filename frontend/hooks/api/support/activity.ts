"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type SupportActivityAction =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "replied"
  | "internal_note"
  | "resolved"
  | "reopened"
  | "merged"
  | "linked";

export interface SupportActivityEntry {
  id: number;
  action: SupportActivityAction;
  label: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string | null;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
}

export function useSupportActivity(ticketId: number) {
  return useQuery({
    queryKey: queryKeys.supportActivity.list(ticketId),
    queryFn: () =>
      apiClient.get<SupportActivityEntry[]>(`/support/${ticketId}/activity`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}
