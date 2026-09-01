"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  SalesOrderFilters,
  SalesOrdersListResponse,
  SalesOrderDetail,
  AtpEntry,
  RawListResponse,
  RawDetailSalesOrder,
  RawAtpEntry,
} from "./sales-orders-types";
import { mapListItem, mapDetail, mapAtp } from "./sales-orders-types";

export function useSalesOrders(filters?: SalesOrderFilters) {
  const canView = useCan("inventory:sales-orders:read");
  return useQuery<SalesOrdersListResponse, Error>({
    queryKey: queryKeys.inventory.salesOrders(
      filters
        ? {
            status: filters.status,
            clientId: filters.clientId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            page: filters.page,
            limit: filters.limit,
          }
        : undefined,
    ),
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawListResponse>("/inventory/sales-orders", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.clientId ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }, signal);
      return {
        items: raw.items.map(mapListItem),
        total: raw.total,
        page: raw.page,
        totalPages: raw.totalPages,
      };
    },
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useSalesOrder(soId: number) {
  const canView = useCan("inventory:sales-orders:read");
  return useQuery<SalesOrderDetail, Error>({
    queryKey: queryKeys.inventory.salesOrder(soId),
    queryFn: async ({ signal }) =>
      mapDetail(
        await apiClient.get<RawDetailSalesOrder>(`/inventory/sales-orders/${soId}`, undefined, signal),
      ),
    staleTime: 2 * 60_000,
    enabled: canView && soId > 0,
  });
}

export function useSoAtp(soId: number) {
  const canView = useCan("inventory:sales-orders:read");
  return useQuery<AtpEntry[], Error>({
    queryKey: [...queryKeys.inventory.salesOrder(soId), "atp"] as const,
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawAtpEntry[]>(
        `/inventory/sales-orders/${soId}/atp`, signal,
      );
      return raw.map(mapAtp);
    },
    staleTime: 1 * 60_000,
    enabled: canView && soId > 0,
  });
}
