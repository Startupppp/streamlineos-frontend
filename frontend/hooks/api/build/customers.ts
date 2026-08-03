"use client";

import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedCrmOrganizations } from "@/types/crm";

interface ProjectCustomersFilters {
  search?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

const PROJECT_CUSTOMERS_BASE = ["streamlineos", "projects", "customers"] as const;

export const projectCustomersQueryKeys = {
  all: PROJECT_CUSTOMERS_BASE,
  list: (filters?: Record<string, unknown>) =>
    [...PROJECT_CUSTOMERS_BASE, "list", filters] as const,
};

export function useProjectCustomers(filters?: ProjectCustomersFilters) {
  return useQuery({
    queryKey: projectCustomersQueryKeys.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedCrmOrganizations>(
        "/build/customers",
        filters as Record<string, unknown>,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
