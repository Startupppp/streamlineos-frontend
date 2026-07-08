"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { FeedbucketStats } from "@/types/feedbucket";

export function useFeedbucketStats() {
  return useQuery({
    queryKey: queryKeys.feedbucket.stats(),
    queryFn: () => apiClient.get<FeedbucketStats>("/feedbucket/stats"),
    staleTime: 60_000,
  });
}
