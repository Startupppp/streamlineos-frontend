"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { LotStatus, SerialStatus } from "@/features/inventory/lib";

interface LotListItem {
  id: number;
  lotNumber: string;
  variantId: number;
  variantSku: string;
  productName: string;
  status: LotStatus;
  expiryDate: string | null;
  currentStock: number;
  warehouseId: number | null;
  warehouseName: string | null;
  createdAt: string;
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
  warehouseName: string;
  qty: number;
}

export interface LotMovement {
  id: number;
  type: string;
  qty: number;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  performedBy: string | null;
}

interface LotDetail {
  id: number;
  lotNumber: string;
  variantId: number;
  variantSku: string;
  productName: string;
  status: LotStatus;
  expiryDate: string | null;
  currentStock: number;
  stockByLocation: LotStockByLocation[];
  movements: LotMovement[];
  createdAt: string;
}

interface SerialListItem {
  id: number;
  serialNumber: string;
  variantId: number;
  variantSku: string;
  productName: string;
  status: SerialStatus;
  locationId: number | null;
  locationName: string | null;
  warehouseName: string | null;
  lotId: number | null;
  lotNumber: string | null;
  createdAt: string;
}

interface SerialListResponse {
  items: SerialListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface SerialDetail extends SerialListItem {
  movements: LotMovement[];
}

export interface ExpiryItem {
  lotId: number;
  lotNumber: string;
  variantSku: string;
  productName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  currentStock: number;
  warehouseName: string | null;
}

export interface TraceabilityEvent {
  id: number;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  date: string;
  qty: number;
  notes: string | null;
  performedBy: string | null;
}

export interface TraceabilityResult {
  origin: {
    receiptId: number | null;
    receiptDate: string | null;
    vendorName: string | null;
  } | null;
  receipts: TraceabilityEvent[];
  currentStock: LotStockByLocation[];
  shipments: TraceabilityEvent[];
  vendorReturns: TraceabilityEvent[];
  customerReturns: TraceabilityEvent[];
  events: TraceabilityEvent[];
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
  return useQuery<LotListResponse, Error>({
    queryKey: queryKeys.inventory.lots(params),
    queryFn: () =>
      apiClient.get<LotListResponse>("/inventory/lots", {
        variantId: params?.variantId,
        status: params?.status,
        expiringWithinDays: params?.expiringWithinDays,
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useLot(id: number) {
  return useQuery<LotDetail, Error>({
    queryKey: queryKeys.inventory.lot(id),
    queryFn: () => apiClient.get<LotDetail>(`/inventory/lots/${id}`),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useUpdateLotStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { lotId: number; status: "ACTIVE" | "BLOCKED" }>({
    mutationKey: ["inventory", "lot", "update-status"],
    mutationFn: ({ lotId, status }) =>
      apiClient.patch<void>(`/inventory/lots/${lotId}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.lot(vars.lotId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.lots() });
    },
  });
}

export function useSerials(params?: SerialsParams) {
  return useQuery<SerialListResponse, Error>({
    queryKey: queryKeys.inventory.serials(params),
    queryFn: () =>
      apiClient.get<SerialListResponse>("/inventory/serials", {
        variantId: params?.variantId,
        status: params?.status,
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useSerial(id: number) {
  return useQuery<SerialDetail, Error>({
    queryKey: queryKeys.inventory.serial(id),
    queryFn: () => apiClient.get<SerialDetail>(`/inventory/serials/${id}`),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

export function useExpiryItems(params?: { days?: number }) {
  return useQuery<ExpiryItem[], Error>({
    queryKey: queryKeys.inventory.expiry(params),
    queryFn: () =>
      apiClient.get<ExpiryItem[]>("/inventory/expiry", { days: params?.days }),
    staleTime: 30_000,
  });
}

export function useTraceability(params: { lotId?: number; serialId?: number }) {
  return useQuery<TraceabilityResult, Error>({
    queryKey: queryKeys.inventory.traceability(params),
    queryFn: () =>
      apiClient.get<TraceabilityResult>("/inventory/traceability", {
        lotId: params.lotId,
        serialId: params.serialId,
      }),
    enabled: params.lotId !== undefined || params.serialId !== undefined,
    staleTime: 60_000,
  });
}
