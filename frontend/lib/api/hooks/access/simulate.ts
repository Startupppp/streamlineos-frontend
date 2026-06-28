"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { DataScope } from "@/types/access";

export interface SimulateAccessResult {
  userId: string;
  permissions: string[];
  scopes: Record<string, DataScope>;
  isOrgOwner: boolean;
}

export function useSimulateAccess(targetUserId: string | undefined) {
  return useQuery<SimulateAccessResult, Error>({
    queryKey: queryKeys.access.simulate(targetUserId ?? ""),
    queryFn: () =>
      apiClient.get<SimulateAccessResult>(`/roles/simulate/${targetUserId}`),
    enabled: !!targetUserId,
    staleTime: 30 * 1000,
  });
}
