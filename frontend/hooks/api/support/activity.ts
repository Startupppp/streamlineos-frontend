"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";

const supportTicketActivityListContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketActivityListContract),
);

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
  | "linked"
  | "split"
  | "snoozed"
  | "unsnoozed";

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
  return useGatedQuery("support:tickets:view", {
    queryKey: accountingAndSupportQueryKeys.supportActivity.list(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<SupportActivityEntry[]>(`/support/${ticketId}/activity`, undefined, signal, supportTicketActivityListContract),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}
