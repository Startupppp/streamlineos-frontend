"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AuthAnalytics {
  loginsToday: number;
  failedLoginsLast7Days: number;
  activeSessions: number;
  passwordResetsLast7Days: number;
}

export function useAuthAnalytics() {
  return useQuery({
    queryKey: queryKeys.auth.auditAnalytics(),
    queryFn: () => apiClient.get<AuthAnalytics>("/auth/audit/analytics"),
    staleTime: 60_000,
  });
}
