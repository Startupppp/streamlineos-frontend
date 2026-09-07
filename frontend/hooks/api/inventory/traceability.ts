"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { LotStatus, SerialStatus } from "@/features/inventory/lib";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const listLotsContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.listLotsContract),
);
const getLotDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.getLotDetailContract),
);
const listSerialsContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.listSerialsContract),
);
const getSerialDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.getSerialDetailContract),
);
const traceabilityChainContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.traceabilityChainContract),
);
const expiryItemsArrayContract = lazyContract(() =>
  import("@/hooks/api/inventory/traceability-schema").then((m) => m.expiryItemsArrayContract),
);

interface LotListItem {
  id: number;
  orgId: string;
  productVariantId: number;
  lotNumber: string;
  expiryDate: string | null;
  manufacturedDate: string | null;
  status: LotStatus;
  notes: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  productVariant?: { id: number; name: string; sku: string };
}

interface LotListResponse {
  items: LotListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LotStockByLocation {
  locationId: number;
  locationName: string;
  onHand: string;
}

export interface LotMovement {
  id: number;
  transactionType: string;
  quantityChange: string;
  createdAt: string;
}

interface LotDetail {
  id: number;
  orgId: string;
  productVariantId: number;
  lotNumber: string;
  expiryDate: string | null;
  manufacturedDate: string | null;
  status: LotStatus;
  notes: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  productVariant?: { id: number; name: string; sku: string };
  stockLevels?: LotStockByLocation[];
  transactions?: LotMovement[];
}

interface SerialListItem {
  id: number;
  orgId: string;
  productVariantId: number;
  serialNumber: string;
  status: SerialStatus;
  lotId: number | null;
  locationId: number | null;
  notes: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  productVariant?: { id: number; name: string; sku: string };
  location?: { id: number; name: string; code: string } | null;
}

interface SerialListResponse {
  items: SerialListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface SerialDetail extends SerialListItem {
  transactions?: LotMovement[];
}

export interface ExpiryItem {
  lotId: number;
  lotNumber: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  onHand: string;
  locationId: number | null;
  locationName: string | null;
}

export interface TraceabilityNode {
  type: string;
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface TraceabilityEdge {
  fromId: string;
  toId: string;
  relationship: string;
}

export interface TraceabilityResult {
  sourceType: string;
  sourceId: string;
  nodes: TraceabilityNode[];
  edges: TraceabilityEdge[];
}

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
  return useQuery<LotListResponse, Error>({
    queryKey: queryKeys.inventory.lots(params),
    queryFn: ({ signal }) =>
      apiClient.get<LotListResponse>("/inventory/lots", {
        variantId: params?.variantId,
        status: params?.status,
        expiringWithinDays: params?.expiringWithinDays,
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }, signal, listLotsContract),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useLot(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<LotDetail, Error>({
    queryKey: queryKeys.inventory.lot(id),
    queryFn: ({ signal }) => apiClient.get<LotDetail>(`/inventory/lots/${id}`, undefined, signal, getLotDetailContract),
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
    },
  });
}

export function useSerials(params?: SerialsParams) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SerialListResponse, Error>({
    queryKey: queryKeys.inventory.serials(params),
    queryFn: ({ signal }) =>
      apiClient.get<SerialListResponse>("/inventory/serials", {
        variantId: params?.variantId,
        status: params?.status,
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }, signal, listSerialsContract),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useSerial(id: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<SerialDetail, Error>({
    queryKey: queryKeys.inventory.serial(id),
    queryFn: ({ signal }) => apiClient.get<SerialDetail>(`/inventory/serials/${id}`, undefined, signal, getSerialDetailContract),
    staleTime: 60_000,
    enabled: canView && id > 0,
  });
}

export function useExpiryItems(params?: { days?: number }) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ExpiryItem[], Error>({
    queryKey: queryKeys.inventory.expiry(params),
    queryFn: ({ signal }) =>
      apiClient.get<ExpiryItem[]>("/inventory/expiry", { days: params?.days }, signal, expiryItemsArrayContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useTraceability(params: { lotId?: number; serialId?: number }) {
  const canView = useCan("inventory:stock:read");
  return useQuery<TraceabilityResult, Error>({
    queryKey: queryKeys.inventory.traceability(params),
    queryFn: ({ signal }) =>
      apiClient.get<TraceabilityResult>("/inventory/traceability", {
        lotId: params.lotId,
        serialId: params.serialId,
      }, signal, traceabilityChainContract),
    staleTime: 60_000,
    enabled: canView && (params.lotId !== undefined || params.serialId !== undefined),
  });
}
