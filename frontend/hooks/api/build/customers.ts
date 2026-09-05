"use client";

import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { BuildCustomersPage } from "@/types/crm";

interface ProjectCustomersFilters {
  search?: string;
  industry?: string;
  cursor?: string;
  limit?: number;
}

export function useProjectCustomers(filters?: ProjectCustomersFilters) {
  const canView = useCan("build:customers:view");
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.search) params["search"] = filters.search;
  if (filters?.industry) params["industry"] = filters.industry;
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.customers.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<BuildCustomersPage>("/build/customers", params, signal),
    enabled: canView,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
