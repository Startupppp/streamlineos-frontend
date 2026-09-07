"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  RawDashboardResponse,
  RawStockSummaryEnvelope,
  RawReorderEnvelope,
  RawMovementsEnvelope,
  RawFlatStockItem,
  RawFlatMovementItem,
  RawReorderRow,
  RawTransactionRow,
  RawSlowMovingItem,
  RawExpiryItem,
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

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
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

function toStockSummaryRow(row: RawFlatStockItem): StockSummaryRow {
  const onHandQty = toNumber(row.onHand);
  const reservedQty = toNumber(row.committed);
  return {
    productId: row.productId,
    productName: row.productName,
    sku: row.variantSku,
    categoryName: null,
    uom: null,
    warehouseName: null,
    onHandQty,
    reservedQty,
    availableQty: toNumber(row.available),
    reorderPoint: row.reorderPoint != null ? toNumber(row.reorderPoint) : null,
    costPrice: row.averageCost ?? null,
    totalValue: row.totalValue ?? (onHandQty * toNumber(row.averageCost)),
  };
}

function toReorderRowFromFlat(row: RawReorderRow): ReorderReportRow {
  const onHand = toNumber(row.onHand);
  const reorderPoint = toNumber(row.reorderPoint);
  const deficit = Math.max(reorderPoint - onHand, 0);
  return {
    productId: row.productId,
    productName: row.productName,
    sku: row.variantSku,
    variantSku: row.variantSku,
    categoryName: null,
    warehouseName: row.vendorName ?? null,
    onHand,
    availableQty: onHand,
    reorderPoint,
    reorderQty: row.suggestedQty != null && row.suggestedQty > 0 ? row.suggestedQty : (deficit > 0 ? deficit : null),
    deficit,
    costPrice: null,
    vendorName: row.vendorName ?? null,
    urgency: reorderUrgency(onHand, reorderPoint),
  };
}

function toMovementRow(row: RawFlatMovementItem): MovementReportRow {
  return {
    id: row.id,
    type: row.transactionType,
    productName: row.variantName ?? "—",
    sku: row.variantSku ?? "—",
    warehouseId: null,
    warehouseName: null,
    locationName: null,
    quantity: toNumber(row.quantityChange),
    balanceAfter: null,
    referenceType: null,
    referenceNumber: null,
    notes: null,
    createdAt: row.createdAt,
    performedBy: null,
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
    notes: row.notes ?? null,
    productName: product?.name ?? variant?.name ?? "—",
    sku: variant?.sku ?? "—",
    locationName: row.location?.name ?? null,
    performedBy: row.creator?.name ?? null,
  };
}

function mapSlowMovingRow(row: RawSlowMovingItem): SlowMovingRow {
  return {
    productVariantId: row.productVariantId,
    variantSku: row.variantSku,
    variantName: row.variantName,
    productName: row.productName,
    onHand: toNumber(row.onHand),
    averageCost: 0,
    value: toNumber(row.totalValue),
    lastMovement: row.lastMovementDate,
    daysSinceLastMovement: row.daysSinceMovement,
  };
}

function mapExpiryRow(row: RawExpiryItem): ExpiryReportRow {
  return {
    id: row.lotId,
    lotNumber: row.lotNumber,
    expiryDate: row.expiryDate ?? "",
    status: "ACTIVE",
    productVariantId: row.productVariantId,
    variantSku: row.variantSku,
    variantName: row.variantName,
    productName: row.productName,
    totalOnHand: row.totalOnHand,
    daysUntilExpiry: row.daysUntilExpiry ?? 0,
  };
}

const dashboardContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.dashboardContract),
);
const stockSummaryContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.stockSummaryContract),
);
const reorderReportContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.reorderReportContract),
);
const movementsReportContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.movementsReportContract),
);
const slowMovingReportContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.slowMovingReportContract),
);
const expiryReportContract = lazyContract(() =>
  import("@/hooks/api/inventory/reports-schema").then((m) => m.expiryReportContract),
);

export function useInventoryDashboard() {
  const canView = useCan("inventory:reports:read");
  return useQuery<InventoryDashboard, Error>({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<RawDashboardResponse>("/inventory/reports/dashboard", undefined, signal, dashboardContract);
      const summary = data.stockSummary;
      return {
        totalSkus: summary?.totalSkus ?? 0,
        totalOnHand: toNumber(summary?.totalOnHand),
        totalCommitted: toNumber(summary?.totalCommitted),
        totalOnOrder: toNumber(summary?.totalOnOrder),
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
      }, signal, stockSummaryContract);
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
      }, signal, reorderReportContract);
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
      }, signal, movementsReportContract);
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
      const data = await apiClient.get<PaginatedResponse<RawSlowMovingItem>>("/inventory/reports/slow-moving", {
        ...(params?.days !== undefined ? { days: String(params.days) } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal, slowMovingReportContract);
      return { items: data.items.map(mapSlowMovingRow), total: data.total, page: data.page, totalPages: data.totalPages };
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
      const data = await apiClient.get<PaginatedResponse<RawExpiryItem>>("/inventory/reports/expiry", {
        ...(params?.withinDays !== undefined ? { withinDays: String(params.withinDays) } : {}),
        ...(params?.warehouseId !== undefined ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.status !== undefined ? { status: params.status } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      }, signal, expiryReportContract);
      return { items: data.items.map(mapExpiryRow), total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}
