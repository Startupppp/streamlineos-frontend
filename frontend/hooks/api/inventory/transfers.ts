"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { TransferStatus } from "@/features/inventory/lib";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type { TransferStatus };

export interface TransferListItem {
  id: number;
  referenceNumber: string;
  status: TransferStatus;
  fromLocationName: string | null;
  toLocationName: string | null;
  createdAt: string;
  completedAt: string | null;
  createdByName: string | null;
  lineCount: number;
  notes: string | null;
}

interface TransferDetailLine {
  id: number;
  productName: string;
  sku: string;
  quantity: number;
  quantityReceived: number;
  notes: string | null;
  lotId: number | null;
  lotNumber: string | null;
  serialId: number | null;
  serialNumber: string | null;
}

interface TransferLocationRef {
  id: number;
  name: string;
  code: string;
  warehouse: { id: number; name: string } | null;
}

export interface TransferDetail {
  id: number;
  referenceNumber: string;
  status: TransferStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdByName: string | null;
  fromLocation: TransferLocationRef | null;
  toLocation: TransferLocationRef | null;
  lines: TransferDetailLine[];
}

interface CreateTransferLineInput {
  productVariantId: number;
  quantity: number;
  lotId?: number;
  serialId?: number;
}

interface CreateTransferInput {
  fromLocationId: number;
  toLocationId: number;
  lines: CreateTransferLineInput[];
  notes?: string;
}

interface CompleteTransferLineInput {
  transferLineId: number;
  quantityReceived: number;
}

interface CompleteTransferInput {
  transferId: number;
  lines: CompleteTransferLineInput[];
}

interface CreatedTransfer {
  id: number;
  referenceNumber: string;
  status: TransferStatus;
}

interface RawTransferListItem {
  id: number;
  referenceNumber: string;
  status: TransferStatus;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  fromLocation: { id: number; name: string; code: string } | null;
  toLocation: { id: number; name: string; code: string } | null;
  creator: { id: string; name: string | null } | null;
  lines: Array<{ id: number }>;
}

interface RawTransferDetailLine {
  id: number;
  quantity: string;
  quantityReceived: string;
  notes: string | null;
  lotId: number | null;
  serialId: number | null;
  lot: { id: number; lotNumber: string } | null;
  serial: { id: number; serialNumber: string } | null;
  productVariant: {
    id: number;
    name: string | null;
    sku: string | null;
    product: { id: number; name: string; sku: string } | null;
  } | null;
}

interface RawTransferLocation {
  id: number;
  name: string;
  code: string;
  warehouse?: { id: number; name: string } | null;
}

interface RawTransferDetail {
  id: number;
  referenceNumber: string;
  status: TransferStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  creator: { id: string; name: string | null } | null;
  fromLocation: RawTransferLocation | null;
  toLocation: RawTransferLocation | null;
  lines: RawTransferDetailLine[];
}

function toTransferListItem(r: RawTransferListItem): TransferListItem {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    status: r.status,
    fromLocationName: r.fromLocation?.name ?? null,
    toLocationName: r.toLocation?.name ?? null,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    createdByName: r.creator?.name ?? null,
    lineCount: r.lines?.length ?? 0,
    notes: r.notes,
  };
}

function toTransferLocationRef(l: RawTransferLocation | null): TransferLocationRef | null {
  if (!l) return null;
  return { id: l.id, name: l.name, code: l.code, warehouse: l.warehouse ?? null };
}

function toTransferDetail(r: RawTransferDetail): TransferDetail {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    createdByName: r.creator?.name ?? null,
    fromLocation: toTransferLocationRef(r.fromLocation),
    toLocation: toTransferLocationRef(r.toLocation),
    lines: r.lines.map((l) => ({
      id: l.id,
      productName: l.productVariant?.product?.name ?? l.productVariant?.name ?? "—",
      sku: l.productVariant?.product?.sku ?? l.productVariant?.sku ?? "—",
      quantity: Number(l.quantity),
      quantityReceived: Number(l.quantityReceived),
      notes: l.notes,
      lotId: l.lotId,
      lotNumber: l.lot?.lotNumber ?? null,
      serialId: l.serialId,
      serialNumber: l.serial?.serialNumber ?? null,
    })),
  };
}

export interface TransferFilters {
  status?: TransferStatus;
  fromWarehouseId?: number;
  toWarehouseId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useTransfers(filters?: TransferFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<{ items: TransferListItem[]; total: number; page: number; totalPages: number }, Error>({
    queryKey: queryKeys.inventory.transfers(filters as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, string | undefined> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.fromWarehouseId) params.fromWarehouseId = String(filters.fromWarehouseId);
      if (filters?.toWarehouseId) params.toWarehouseId = String(filters.toWarehouseId);
      if (filters?.fromDate) params.fromDate = filters.fromDate;
      if (filters?.toDate) params.toDate = filters.toDate;
      if (filters?.search) params.search = filters.search;
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      const res = await apiClient.get<{ items: RawTransferListItem[]; total: number; page: number; totalPages: number }>(
        "/inventory/stock/transfers",
        params,
      );
      return {
        items: res.items.map(toTransferListItem),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
    },
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useTransfer(transferId: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<TransferDetail | null, Error>({
    queryKey: queryKeys.inventory.transfer(transferId),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<RawTransferDetail | null>(
        `/inventory/stock/transfers/${transferId}`, undefined, signal,
      );
      return res ? toTransferDetail(res) : null;
    },
    enabled: canView && transferId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CreatedTransfer, Error, CreateTransferInput>("inventory:stock:transfer", {
    mutationKey: ["inventory", "transfer", "create"],
    mutationFn: (data) =>
      apiClient.post<CreatedTransfer>("/inventory/stock/transfers", {
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        notes: data.notes,
        lines: data.lines.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
          lotId: l.lotId,
          serialId: l.serialId,
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCompleteTransfer() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, CompleteTransferInput>("inventory:stock:transfer", {
    mutationKey: ["inventory", "transfer", "complete"],
    mutationFn: ({ transferId, lines }) =>
      apiClient.post<void>(`/inventory/stock/transfers/${transferId}/complete`, { lines }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(vars.transferId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useDispatchTransfer() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, { transferId: number }>("inventory:stock:transfer", {
    mutationKey: ["inventory", "transfer", "dispatch"],
    mutationFn: ({ transferId }) =>
      apiClient.post<void>(`/inventory/stock/transfers/${transferId}/dispatch`, {}),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(vars.transferId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useReserveTransfer() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("inventory:stock:transfer", {
    mutationKey: ["inventory", "transfer", "reserve"],
    mutationFn: (transferId) =>
      apiClient.post<void>(
        `/inventory/stock/transfers/${transferId}/reserve`,
        {},
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: (_, transferId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(transferId) });
    },
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("inventory:stock:transfer", {
    mutationKey: ["inventory", "transfer", "cancel"],
    mutationFn: (transferId) =>
      apiClient.post<void>(`/inventory/stock/transfers/${transferId}/cancel`, {}),
    onSuccess: (_, transferId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(transferId) });
    },
  });
}
