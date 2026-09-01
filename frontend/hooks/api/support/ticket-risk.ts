"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type TicketRiskLevel =
  | "ok"
  | "first_response_due_soon"
  | "first_response_breached"
  | "resolution_due_soon"
  | "resolution_breached"
  | "paused";

export interface TicketRisk {
  risk: TicketRiskLevel;
}

export function useTicketRisk(ticketId: number) {
  return useQuery({
    queryKey: queryKeys.supportTicketRisk.detail(ticketId),
    queryFn: ({ signal }) => apiClient.get<TicketRisk>(`/support/${ticketId}/risk`, undefined, signal),
    staleTime: 30_000,
    enabled: Number.isFinite(ticketId) && ticketId > 0,
  });
}
