"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
import type { Customer360Response, TimelinePage } from "@/types/crm";

export function useCompany360(companyId: number) {
  return useGatedQuery("crm:customer360:view", {
    queryKey: queryKeys.customer360.company(companyId),
    queryFn: () =>
      apiClient.get<Customer360Response>(`/crm/customer-360/company/${companyId}`),
    enabled: companyId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useClient360(clientId: number) {
  return useGatedQuery("crm:customer360:view", {
    queryKey: queryKeys.customer360.client(clientId),
    queryFn: () =>
      apiClient.get<Customer360Response>(`/crm/customer-360/client/${clientId}`),
    enabled: clientId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCompany360Timeline(companyId: number) {
  const access = usePermissionGate("crm:customer360:view");
  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.customer360.companyTimeline(companyId),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        apiClient.get<TimelinePage>(`/crm/customer-360/company/${companyId}/timeline`, pageParam ? { cursor: pageParam } : undefined),
      getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: access.allowed && companyId > 0,
      staleTime: 2 * 60_000,
    }),
    access,
  );
}
