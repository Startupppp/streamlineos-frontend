"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.supportQueues.list(),
    queryFn: ({ signal }) => apiClient.get<SupportQueue[]>("/support/queues", undefined, signal),
    staleTime: 60_000,
  });
}

