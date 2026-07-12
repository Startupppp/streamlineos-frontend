"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AllWorkFilters, AllWorkTicket, PaginatedResponse } from "@/types/projects";

export function useAllWork(
  filters?: AllWorkFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<AllWorkTicket>>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<AllWorkTicket>>({
    queryKey: queryKeys.projects.allWork(filters ? { ...filters } : undefined),
    queryFn: () =>
      apiClient.get<PaginatedResponse<AllWorkTicket>>("/projects/all-work", filters ? { ...filters } : undefined),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
}
