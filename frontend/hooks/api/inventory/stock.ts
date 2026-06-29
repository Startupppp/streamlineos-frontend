"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type TransactionType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "GRN";

export type AdjustmentReason =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRY"
  | "THEFT"
  | "RECOUNT"
  | "OTHER";

export type AdjustmentType = "IN" | "OUT" | "SET";

export type TransferStatus = "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

type StockLevelFilters = {
  warehouseId?: number;
  productId?: number;
  lowStock?: boolean;
  page?: number;
  limit?: number;
};

type StockTransactionFilters = {
  productVariantId?: number;
  locationId?: number;
  transactionType?: TransactionType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export interface StockLevelRow {
  id: number;
  productName: string;
  sku: string;
  warehouseName: string | null;
  locationCode: string | null;
  onHand: number;
  committed: number;
  onOrder: number;
  reorderPoint: number | null;
  minStockLevel: number | null;
}

interface StockLevelsResult {
  items: StockLevelRow[];
  page: number;
  limit: number;
}

export interface StockTransactionVariant {
  id: number;
  name: string | null;
  sku: string | null;
  product: { id: number; name: string; sku: string } | null;
}

export interface StockTransaction {
  id: number;
  transactionType: TransactionType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  createdAt: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  productVariant: StockTransactionVariant | null;
  location: { id: number; name: string; code: string } | null;
  creator: { id: string; name: string | null } | null;
}

interface StockTransactionsResult {
  items: StockTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdjustmentListItem {
  id: number;
  referenceNumber: string;
  reason: AdjustmentReason;
  status: string;
  notes: string | null;
  createdAt: string;
  createdByName: string | null;
  lineCount: number;
}

interface AdjustmentsResult {
  items: AdjustmentListItem[];
  total: number;
  page: number;
  totalPages: number;
}

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

interface CreateAdjustmentInput {
  warehouseId?: number;
  productId: number;
  locationId?: number;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
}

interface CreateTransferLineInput {
  productId: number;
  quantity: number;
}

interface CreateTransferInput {
  fromWarehouseId?: number;
  toWarehouseId?: number;
  fromLocationId?: number;
  toLocationId?: number;
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

interface RawStockLevel {
  id: number;
  onHand: string;
  committed: string;
  onOrder: string;
  productVariant: {
    id: number;
    name: string | null;
    sku: string | null;
    product: { id: number; name: string; sku: string; reorderPoint: string | null } | null;
  } | null;
  location: {
    id: number;
    name: string;
    code: string;
    warehouse: { id: number; name: string } | null;
  } | null;
}

interface RawStockLevelsResponse {
  items: RawStockLevel[];
  page: number;
  limit: number;
}

interface RawTransaction {
  id: number;
  transactionType: TransactionType;
  quantityChange: string;
  quantityBefore: string;
  quantityAfter: string;
  createdAt: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  productVariant: {
    id: number;
    name: string | null;
    sku: string | null;
    product: { id: number; name: string; sku: string } | null;
  } | null;
  location: { id: number; name: string; code: string } | null;
  creator: { id: string; name: string | null } | null;
}

interface RawTransactionsResponse {
  items: RawTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

interface RawAdjustment {
  id: number;
  referenceNumber: string;
  reason: AdjustmentReason;
  status: string;
  notes: string | null;
  createdAt: string;
  creator: { id: string; name: string | null } | null;
  lines: Array<{ id: number }>;
}

interface RawAdjustmentsResponse {
  items: RawAdjustment[];
  total: number;
  page: number;
  totalPages: number;
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

function toStockLevelRow(r: RawStockLevel): StockLevelRow {
  const product = r.productVariant?.product ?? null;
  return {
    id: r.id,
    productName: product?.name ?? r.productVariant?.name ?? "—",
    sku: product?.sku ?? r.productVariant?.sku ?? "—",
    warehouseName: r.location?.warehouse?.name ?? null,
    locationCode: r.location?.code ?? null,
    onHand: Number(r.onHand),
    committed: Number(r.committed),
    onOrder: Number(r.onOrder),
    reorderPoint: product?.reorderPoint != null ? Number(product.reorderPoint) : null,
    minStockLevel: null,
  };
}

function toStockTransaction(r: RawTransaction): StockTransaction {
  return {
    id: r.id,
    transactionType: r.transactionType,
    quantityChange: Number(r.quantityChange),
    quantityBefore: Number(r.quantityBefore),
    quantityAfter: Number(r.quantityAfter),
    createdAt: r.createdAt,
    notes: r.notes,
    referenceType: r.referenceType,
    referenceId: r.referenceId,
    productVariant: r.productVariant
      ? {
          id: r.productVariant.id,
          name: r.productVariant.name,
          sku: r.productVariant.sku,
          product: r.productVariant.product,
        }
      : null,
    location: r.location,
    creator: r.creator,
  };
}

function toAdjustmentListItem(r: RawAdjustment): AdjustmentListItem {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    reason: r.reason,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    createdByName: r.creator?.name ?? null,
    lineCount: r.lines?.length ?? 0,
  };
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
    })),
  };
}

function signedQuantity(type: AdjustmentType, quantity: number): number {
  const magnitude = Math.abs(quantity);
  return type === "OUT" ? -magnitude : magnitude;
}

export function useAdjustments(filters?: { page?: number; limit?: number }) {
  return useQuery<AdjustmentsResult, Error>({
    queryKey: queryKeys.inventory.adjustments(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawAdjustmentsResponse>("/inventory/stock/adjustments", {
        page: filters?.page,
        limit: filters?.limit,
      });
      return {
        items: res.items.map(toAdjustmentListItem),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
    },
    staleTime: 2 * 60_000,
  });
}

export function useStockLevels(filters?: StockLevelFilters) {
  return useQuery<StockLevelsResult, Error>({
    queryKey: queryKeys.inventory.stockLevels(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawStockLevelsResponse>("/inventory/stock", {
        warehouseId: filters?.warehouseId,
        productId: filters?.productId,
        lowStock: filters?.lowStock,
        page: filters?.page,
        limit: filters?.limit,
      });
      return {
        items: res.items.map(toStockLevelRow),
        page: res.page,
        limit: res.limit,
      };
    },
    staleTime: 2 * 60_000,
  });
}

export function useStockTransactions(filters?: StockTransactionFilters) {
  return useQuery<StockTransactionsResult, Error>({
    queryKey: queryKeys.inventory.stockTransactions(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawTransactionsResponse>("/inventory/stock/transactions", {
        productVariantId: filters?.productVariantId,
        locationId: filters?.locationId,
        transactionType: filters?.transactionType,
        fromDate: filters?.fromDate,
        toDate: filters?.toDate,
        page: filters?.page,
        limit: filters?.limit,
      });
      return {
        items: res.items.map(toStockTransaction),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
    },
    staleTime: 2 * 60_000,
  });
}

export function useTransfers() {
  return useQuery<TransferListItem[], Error>({
    queryKey: queryKeys.inventory.transfers(),
    queryFn: async () => {
      const res = await apiClient.get<RawTransferListItem[]>("/inventory/stock/transfers");
      return res.map(toTransferListItem);
    },
    staleTime: 2 * 60_000,
  });
}

export function useTransfer(transferId: number) {
  return useQuery<TransferDetail | null, Error>({
    queryKey: queryKeys.inventory.transfer(transferId),
    queryFn: async () => {
      const res = await apiClient.get<RawTransferDetail | null>(
        `/inventory/stock/transfers/${transferId}`,
      );
      return res ? toTransferDetail(res) : null;
    },
    enabled: transferId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation<void, Error, CreateAdjustmentInput>({
    mutationFn: (data) =>
      apiClient.post<void>("/inventory/stock/adjustments", {
        reason: data.reason,
        notes: data.notes,
        lines: [
          {
            productVariantId: data.productId,
            locationId: data.locationId,
            quantityChange: signedQuantity(data.adjustmentType, data.quantity),
            notes: data.notes,
          },
        ],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation<CreatedTransfer, Error, CreateTransferInput>({
    mutationFn: (data) =>
      apiClient.post<CreatedTransfer>("/inventory/stock/transfers", {
        fromLocationId: data.fromLocationId ?? data.fromWarehouseId,
        toLocationId: data.toLocationId ?? data.toWarehouseId,
        notes: data.notes,
        lines: data.lines.map((l) => ({ productVariantId: l.productId, quantity: l.quantity })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCompleteTransfer() {
  const qc = useQueryClient();
  return useMutation<void, Error, CompleteTransferInput>({
    mutationFn: ({ transferId, lines }) =>
      apiClient.post<void>(`/inventory/stock/transfers/${transferId}/complete`, { lines }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfer(vars.transferId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}
