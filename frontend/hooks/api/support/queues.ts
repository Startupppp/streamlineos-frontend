"use client";

import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface SupportQueue {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  filter: Record<string, unknown>;
  sortOrder: number;
  isDefault: boolean;
  openTicketCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useSupportQueues() {
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportQueues.list(),
    queryFn: ({ signal }) => apiClient.get<SupportQueue[]>("/support/queues", undefined, signal),
    staleTime: 60_000,
  });
}

