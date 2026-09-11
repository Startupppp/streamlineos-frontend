"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { usePermissionGate } from "@/hooks/api/access";
import { gated, useGatedQuery } from "@/hooks/api/gated-query";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { Customer360Response, TimelinePage } from "@/types/crm";

import { lazyContract } from "@/lib/api-envelope";
const customer360Lazy = lazyContract(() => import("@/hooks/api/crm/customer360-schema").then((m) => m.customer360Contract));
const customer360TimelineLazy = lazyContract(() => import("@/hooks/api/crm/customer360-schema").then((m) => m.customer360TimelineContract));

export function useCompany360(companyId: number) {
  return useGatedQuery("crm:customer360:view", {
    queryKey: queryKeys.customer360.company(companyId),
    queryFn: ({ signal }) =>
      apiClient.get<Customer360Response>(`/crm/customer-360/company/${companyId}`, undefined, signal, customer360Lazy),
    enabled: companyId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useClient360(clientId: number) {
  return useGatedQuery("crm:customer360:view", {
    queryKey: queryKeys.customer360.client(clientId),
    queryFn: ({ signal }) =>
      apiClient.get<Customer360Response>(`/crm/customer-360/client/${clientId}`, undefined, signal, customer360Lazy),
    enabled: clientId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCompany360Timeline(companyId: number) {
  const access = usePermissionGate("crm:customer360:view");
  return gated(
    useInfiniteQuery({
      queryKey: queryKeys.customer360.companyTimeline(companyId),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<TimelinePage>(`/crm/customer-360/company/${companyId}/timeline`, pageParam !== undefined ? { cursor: pageParam } : undefined, signal, customer360TimelineLazy),
      getNextPageParam: (lastPage: TimelinePage) => lastPage.nextCursor ?? undefined,
      initialPageParam: NO_CURSOR_YET,
      enabled: access.allowed && companyId > 0,
      staleTime: 2 * 60_000,
    }),
    access,
  );
}
