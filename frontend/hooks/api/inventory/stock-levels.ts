"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { StockAvailability } from "@/types/inventory-availability";

export type TransactionType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "GRN"
  | "OPENING_BALANCE"
  | "VENDOR_RETURN"
  | "CUSTOMER_RETURN"
  | "CYCLE_COUNT_GAIN"
  | "CYCLE_COUNT_LOSS"
  | "SCRAP"
  | "QUARANTINE_IN"
  | "QUARANTINE_OUT"
  | "RESERVATION_CREATE"
  | "RESERVATION_RELEASE"
  | "RESERVATION_CONSUME";

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

/**
 * Which quantity a movement moved. A quarantine or block movement leaves on-hand
 * untouched and moves goods between buckets, so its balance pair describes the
 * bucket named here rather than on-hand.
 */
export type QuantityBucket = "ON_HAND" | "BLOCKED" | "QUALITY_HOLD";

export type StockTransactionDirection = "in" | "out";

export type StockTransactionFilters = {
  productVariantId?: number;
  warehouseId?: number;
  locationId?: number;
  transactionType?: TransactionType;
  direction?: StockTransactionDirection;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  /**
   * G1. Keyset position. Sent, it supersedes `page`: the ledger is append-only
   * and a reader scrolling it while the engine posts loses or repeats a row at
   * every offset boundary. Drive it with `useCursorPagination`.
   */
  cursor?: string;
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
  /** Which quantity moved. The balance pair describes this bucket, not on-hand. */
  quantityBucket: QuantityBucket;
  createdAt: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  productVariant: StockTransactionVariant | null;
  location: { id: number; name: string; code: string; warehouse: { id: number; name: string } | null } | null;
  creator: { id: string; name: string | null } | null;
}

interface StockTransactionsResult {
  items: StockTransaction[];
  /** Null on a cursor page: the server was not asked to count. */
  total: number | null;
  page: number;
  totalPages: number | null;
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * The wire shape of `GET /inventory/stock`, exactly as the API sends it.
 *
 * Exported so the backend's response-shape drift gate
 * (`src/modules/inventory/__tests__/inventory-response-shape-drift.spec.ts`) can
 * read it. It compares this interface's own members against the service's
 * `select()` projection: `apiClient.get<T>()` is an assertion about a payload,
 * not a fact `tsc` can check, and this endpoint spent its whole life returning
 * the driver's snake_case column names to a hook that reads camelCase --
 * `NaN` in every quantity column and a dash for every name -- with both repos
 * compiling green throughout.
 */
export interface RawStockLevel {
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
  quantityBucket: QuantityBucket | null;
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
  location: { id: number; name: string; code: string; warehouse: { id: number; name: string } | null } | null;
  creator: { id: string; name: string | null } | null;
}

interface RawTransactionsResponse {
  items: RawTransaction[];
  total: number | null;
  page: number;
  totalPages: number | null;
  hasMore: boolean;
  nextCursor: string | null;
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
    quantityBucket: r.quantityBucket ?? "ON_HAND",
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
    location: r.location
      ? {
          id: r.location.id,
          name: r.location.name,
          code: r.location.code,
          warehouse: r.location.warehouse ?? null,
        }
      : null,
    creator: r.creator,
  };
}

export function useStockLevels(filters?: StockLevelFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<StockLevelsResult, Error>({
    queryKey: queryKeys.inventory.stockLevels(filters),
    queryFn: async ({ signal }) => {
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
      }, signal);
      return {
        items: res.items.map(toStockLevelRow),
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      };
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useStockAvailability(variantId: number, warehouseId?: number) {
  const canView = useCan("inventory:stock:read");
  return useQuery<StockAvailability, Error>({
    queryKey: queryKeys.inventory.availability(variantId, warehouseId),
    queryFn: ({ signal }) =>
      apiClient.get<StockAvailability>("/inventory/stock/availability", {
        variantId,
        ...(warehouseId !== undefined ? { warehouseId } : {}),
      }, signal),
    enabled: canView && variantId > 0,
    staleTime: 30_000,
  });
}

export function useStockTransactions(filters?: StockTransactionFilters) {
  const canView = useCan("inventory:stock:read");
  return useQuery<StockTransactionsResult, Error>({
    queryKey: queryKeys.inventory.stockTransactions(filters),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<RawTransactionsResponse>("/inventory/stock/transactions", {
        productVariantId: filters?.productVariantId,
        warehouseId: filters?.warehouseId,
        locationId: filters?.locationId,
        transactionType: filters?.transactionType,
        direction: filters?.direction,
        search: filters?.search,
        fromDate: filters?.fromDate,
        toDate: filters?.toDate,
        page: filters?.page,
        limit: filters?.limit,
        cursor: filters?.cursor,
      }, signal);
      return {
        items: res.items.map(toStockTransaction),
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
        hasMore: res.hasMore,
        nextCursor: res.nextCursor,
      };
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
