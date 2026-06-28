"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EnpsScore {
  id: number;
  score: number;
  comment: string | null;
  isAnonymous: boolean;
  period: string;
  createdAt: string | null;
}

const enpsKeys = {
  all: [...queryKeys.hr.all, "enps"] as const,
  list: () => [...enpsKeys.all, "list"] as const,
};

export function useEnpsScores(enabled = true) {
  return useQuery({
    queryKey: enpsKeys.list(),
    queryFn: () => apiClient.get<EnpsScore[]>("/hr/enps"),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useSubmitEnpsScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { score: number; comment?: string; isAnonymous?: boolean }) =>
      apiClient.post<EnpsScore>("/hr/enps", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: enpsKeys.list() }),
  });
}
