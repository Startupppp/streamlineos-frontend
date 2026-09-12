"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ExpiryItem,
  LotDetail,
  LotList,
  SerialDetail,
  SerialList,
  TraceabilityChain,
} from "@/hooks/api/inventory/traceability-schema";

const lotListContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.lotListContract),
);
const lotDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.lotDetailContract),
);
const serialListContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.serialListContract),
);
const serialDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.serialDetailContract),
);
const expiryListContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.expiryListContract),
);
const traceabilityChainContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.traceabilityChainContract),
);

type LotsParams = {
  [key: string]: unknown;
  variantId?: number;
  status?: string;
  expiringWithinDays?: number;
  search?: string;
  page?: number;
  limit?: number;
};

type SerialsParams = {
  [key: string]: unknown;
  variantId?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export function useLots(params?: LotsParams) {
  const canView = useCan("inventory:stock:read");
  return useQuery<LotList, Error>({
    queryKey: queryKeys.inventory.lots(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/lots",
        {
          variantId: params?.variantId,
          status: params?.status,
          expiringWithinDays: params?.expiringWithinDays,
          search: params?.search,
          page: params?.page,
          limit: params?.limit,
        },
        signal,
        lotListContract,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useLot(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<LotDetail, Error>({
    queryKey: queryKeys.inventory.lot(id),
    queryFn: ({ signal }) =>
      apiClient.get(`/inventory/lots/${id}`, undefined, signal, lotDetailContract),
    staleTime: 60_000,
    enabled: canView && id > 0,
  });
}

export function useUpdateLotStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, { lotId: number; status: "ACTIVE" | "BLOCKED" }>("inventory:stock:adjust", {
    mutationKey: ["inventory", "lot", "update-status"],
    mutationFn: ({ lotId, status }) =>
      apiClient.patch<void>(`/inventory/lots/${lotId}/status`, { status }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.lot(vars.lotId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.lots() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.traceability() });
    },
  });
}

export function useSerials(params?: SerialsParams) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SerialList, Error>({
    queryKey: queryKeys.inventory.serials(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/serials",
        {
          variantId: params?.variantId,
          status: params?.status,
          search: params?.search,
          page: params?.page,
          limit: params?.limit,
        },
        signal,
        serialListContract,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useSerial(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SerialDetail, Error>({
    queryKey: queryKeys.inventory.serial(id),
    queryFn: ({ signal }) =>
      apiClient.get(`/inventory/serials/${id}`, undefined, signal, serialDetailContract),
    staleTime: 60_000,
    enabled: canView && id > 0,
  });
}

export function useExpiryItems(params?: { withinDays?: number }) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ExpiryItem[], Error>({
    queryKey: queryKeys.inventory.expiry(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/expiry",
        { withinDays: params?.withinDays },
        signal,
        expiryListContract,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useTraceability(params: { lotId?: number; serialId?: number }) {
  const canView = useCan("inventory:stock:read");
  return useQuery<TraceabilityChain, Error>({
    queryKey: queryKeys.inventory.traceability(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/traceability",
        {
          lotId: params.lotId,
          serialId: params.serialId,
        },
        signal,
        traceabilityChainContract,
      ),
    staleTime: 60_000,
    enabled: canView && (params.lotId !== undefined || params.serialId !== undefined),
  });
}
