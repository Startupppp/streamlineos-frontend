"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { Branch } from "@/types/organization";

export const useBranches = (
  options?: Omit<UseQueryOptions<Branch[], Error>, "queryKey" | "queryFn">
) => {
  const canView = useCan("branch:view");
  return useQuery<Branch[], Error>({
    queryKey: queryKeys.branches.list(),
    queryFn: () => apiClient.get<Branch[]>("/branches"),
    staleTime: 30 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

