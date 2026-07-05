"use client";

import { useQuery } from "@tanstack/react-query";
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

type StockLevelFilters = {
  warehouseId?: number;
  locationId?: number;
  variantId?: number;
  lotId?: number;
  serialId?: number;
  productId?: number;
  lowStock?: boolean;
  negative?: boolean;
  search?: string;
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
  available: number;
  blockedQty: number;
  qualityHoldQty: number;
  averageCost: string | null;
  reorderPoint: number | null;
  minStockLevel: number | null;
  variantId: number | null;
  locationId: number | null;
}

interface StockLevelsResult {
  items: StockLevelRow[];
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
}

interface StockTransactionVariant {
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

interface RawStockLevel {
  id: number;
  onHand: string;
  committed: string;
  onOrder: string;
  available: string;
  blockedQty: string;
  qualityHoldQty: string;
  averageCost: string | null;
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
  total?: number;
  totalPages?: number;
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
    available: Number(r.available),
    blockedQty: Number(r.blockedQty),
    qualityHoldQty: Number(r.qualityHoldQty),
    averageCost: r.averageCost ?? null,
    reorderPoint: product?.reorderPoint != null ? Number(product.reorderPoint) : null,
    minStockLevel: null,
    variantId: r.productVariant?.id ?? null,
    locationId: r.location?.id ?? null,
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

export function useStockLevels(filters?: StockLevelFilters) {
  return useQuery<StockLevelsResult, Error>({
    queryKey: queryKeys.inventory.stockLevels(filters),
    queryFn: async () => {
      const res = await apiClient.get<RawStockLevelsResponse>("/inventory/stock", {
        warehouseId: filters?.warehouseId,
        locationId: filters?.locationId,
        variantId: filters?.variantId,
        lotId: filters?.lotId,
        serialId: filters?.serialId,
        productId: filters?.productId,
        lowStock: filters?.lowStock,
        negative: filters?.negative,
        search: filters?.search,
        page: filters?.page,
        limit: filters?.limit,
      });
      return {
        items: res.items.map(toStockLevelRow),
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      };
    },
    staleTime: 60_000,
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
