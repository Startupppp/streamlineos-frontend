"use client";

import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { BuildCustomersPage } from "@/types/crm";

interface ProjectCustomersFilters {
  search?: string;
  industry?: string;
  cursor?: string;
  limit?: number;
}

const PROJECT_CUSTOMERS_BASE = ["streamlineos", "projects", "customers"] as const;

export const projectCustomersQueryKeys = {
  all: PROJECT_CUSTOMERS_BASE,
  list: (filters?: Record<string, unknown>) =>
    [...PROJECT_CUSTOMERS_BASE, "list", filters] as const,
};

export function useProjectCustomers(filters?: ProjectCustomersFilters) {
  const canView = useCan("build:customers:view");
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.search) params["search"] = filters.search;
  if (filters?.industry) params["industry"] = filters.industry;
  return useQuery({
    queryKey: projectCustomersQueryKeys.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<BuildCustomersPage>("/build/customers", params),
    enabled: canView,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
