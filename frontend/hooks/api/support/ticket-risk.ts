"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";

const ticketRiskContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.ticketRiskContract),
);

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
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportTicketRisk.detail(ticketId),
    queryFn: ({ signal }) => apiClient.get<TicketRisk>(`/support/${ticketId}/risk`, undefined, signal, ticketRiskContract),
    staleTime: 30_000,
    enabled: Number.isFinite(ticketId) && ticketId > 0,
  });
}
