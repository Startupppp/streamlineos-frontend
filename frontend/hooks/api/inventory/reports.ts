"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  RawDashboardResponse,
  RawStockSummaryEnvelope,
  RawReorderEnvelope,
  RawMovementsEnvelope,
  RawStockLevelRow,
  RawTransactionRow,
  RawReorderRow,
  InventoryDashboard,
  InventoryDashboardMovement,
  StockSummaryRow,
  ReorderReportRow,
  MovementReportRow,
  ReorderUrgency,
  PaginatedResponse,
  MovementsParams,
  SlowMovingRow,
  ExpiryReportRow,
  SlowMovingParams,
  ExpiryReportParams,
} from "./reports-types";

export type {
  MovementType,
  PaginatedResponse,
  MovementsParams,
  SlowMovingRow,
  ExpiryReportRow,
  AiInsight,
  StockSummaryRow,
  ReorderReportRow,
  MovementReportRow,
  StockSummaryParams,
  ReorderReportParams,
  SlowMovingParams,
  ExpiryReportParams,
} from "./reports-types";

function toNumber(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function reorderUrgency(onHand: number, reorderPoint: number): ReorderUrgency {
  if (onHand <= 0) return "critical";
  if (reorderPoint <= 0) return "medium";
  const ratio = onHand / reorderPoint;
  if (ratio <= 0.25) return "critical";
  if (ratio <= 0.5) return "high";
  return "medium";
}

function toStockSummaryRow(row: RawStockLevelRow): StockSummaryRow {
  const variant = row.productVariant;
  const product = variant?.product ?? null;
  const onHandQty = toNumber(row.onHand);
  const reservedQty = toNumber(row.committed);
  const costPrice = product?.costPrice ?? variant?.costPrice ?? null;
  return {
    productId: product?.id ?? variant?.id ?? 0,
    productName: product?.name ?? variant?.name ?? "—",
    sku: variant?.sku ?? "—",
    categoryName: null,
    uom: null,
    warehouseName: row.location?.warehouse?.name ?? null,
    onHandQty,
    reservedQty,
    availableQty: onHandQty - reservedQty,
    reorderPoint: product?.reorderPoint != null ? toNumber(product.reorderPoint) : null,
    costPrice,
    totalValue: onHandQty * toNumber(costPrice),
  };
}

function toReorderRowFromFlat(row: RawReorderRow): ReorderReportRow {
  const deficit = Math.max(row.reorderPoint - row.onHand, 0);
  return {
    productId: row.productId,
    productName: row.productName,
    sku: row.productSku,
    variantSku: row.variantSku,
    categoryName: null,
    warehouseName: null,
    onHand: row.onHand,
    availableQty: row.onHand - row.committed,
    reorderPoint: row.reorderPoint,
    reorderQty: row.suggestedQty > 0 ? row.suggestedQty : (deficit > 0 ? deficit : null),
    deficit,
    costPrice: null,
    vendorName: null,
    urgency: reorderUrgency(row.onHand, row.reorderPoint),
  };
}

function toMovementRow(row: RawTransactionRow): MovementReportRow {
  const variant = row.productVariant;
  const product = variant?.product ?? null;
  return {
    id: row.id,
    type: row.transactionType,
    productName: product?.name ?? variant?.name ?? "—",
    sku: variant?.sku ?? "—",
    warehouseId: row.location?.warehouse?.id ?? null,
    warehouseName: row.location?.warehouse?.name ?? null,
    locationName: row.location?.name ?? null,
    quantity: toNumber(row.quantityChange),
    balanceAfter: row.quantityAfter != null ? toNumber(row.quantityAfter) : null,
    referenceType: row.referenceType,
    referenceNumber: row.referenceId,
    notes: row.notes,
    createdAt: row.createdAt,
    performedBy: row.creator?.name ?? null,
  };
}

function toDashboardMovement(row: RawTransactionRow): InventoryDashboardMovement {
  const variant = row.productVariant;
  const product = variant?.product ?? null;
  return {
    id: row.id,
    transactionType: row.transactionType,
    quantityChange: toNumber(row.quantityChange),
    createdAt: row.createdAt,
    notes: row.notes,
    productName: product?.name ?? variant?.name ?? "—",
    sku: variant?.sku ?? "—",
    locationName: row.location?.name ?? null,
    performedBy: row.creator?.name ?? null,
  };
}

export function useInventoryDashboard() {
  const canView = useCan("inventory:reports:read");
  return useQuery<InventoryDashboard, Error>({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<RawDashboardResponse>("/inventory/reports/dashboard", undefined, signal);
      const summary = data.stockSummary;
      return {
        totalSkus: summary?.totalSkus ?? 0,
        totalOnHand: summary?.totalOnHand ?? 0,
        totalCommitted: summary?.totalCommitted ?? 0,
        totalOnOrder: summary?.totalOnOrder ?? 0,
        lowStockCount: data.lowStockCount ?? 0,
        draftPoCount: data.draftPoCount ?? 0,
        openSoCount: data.openSoCount ?? 0,
        recentMovements: (data.recentMovements ?? []).map(toDashboardMovement),
        stockValue: data.stockValue ?? 0,
        expiringLotsCount: data.expiringLotsCount ?? 0,
        qualityHoldQty: data.qualityHoldQty ?? 0,
        activeReservationsCount: data.activeReservationsCount ?? 0,
        openShipmentsCount: data.openShipmentsCount ?? 0,
        failedChannelSyncsCount: data.failedChannelSyncsCount ?? 0,
        openInspectionsCount: data.openInspectionsCount ?? 0,
        recentInsights: data.recentInsights ?? [],
      };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useStockSummary(params?: { page?: number; limit?: number }) {
  const canView = useCan("inventory:reports:read");
  return useQuery<PaginatedResponse<StockSummaryRow>, Error>({
    queryKey: queryKeys.inventory.stockSummary(params),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<RawStockSummaryEnvelope>("/inventory/reports/stock-summary", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal);
      const items = (data.items ?? []).map(toStockSummaryRow);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useReorderReport(params?: { page?: number; limit?: number }) {
  const canView = useCan("inventory:reports:read");
  return useQuery<PaginatedResponse<ReorderReportRow>, Error>({
    queryKey: queryKeys.inventory.reorderReport(params),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<RawReorderEnvelope>("/inventory/reports/reorder", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal);
      const items = (data.items ?? []).map(toReorderRowFromFlat);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useMovementsReport(params?: MovementsParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<PaginatedResponse<MovementReportRow>, Error>({
    queryKey: queryKeys.inventory.movementsReport(params),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<RawMovementsEnvelope>("/inventory/reports/movements", {
        ...(params?.dateFrom !== undefined ? { fromDate: params.dateFrom } : {}),
        ...(params?.dateTo !== undefined ? { toDate: params.dateTo } : {}),
        ...(params?.warehouseId !== undefined ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.type !== undefined ? { type: params.type } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal);
      const items = (data.items ?? []).map(toMovementRow);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useSlowMovingReport(params?: SlowMovingParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<PaginatedResponse<SlowMovingRow>, Error>({
    queryKey: queryKeys.inventory.slowMovingReport(params),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<PaginatedResponse<SlowMovingRow>>("/inventory/reports/slow-moving", {
        ...(params?.days !== undefined ? { days: String(params.days) } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal);
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useExpiryReport(params?: ExpiryReportParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<PaginatedResponse<ExpiryReportRow>, Error>({
    queryKey: queryKeys.inventory.expiryReport(params),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<PaginatedResponse<ExpiryReportRow>>("/inventory/reports/expiry", {
        ...(params?.withinDays !== undefined ? { withinDays: String(params.withinDays) } : {}),
        ...(params?.warehouseId !== undefined ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.status !== undefined ? { status: params.status } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal);
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}
