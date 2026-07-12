"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type MovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "GRN";

type ReorderUrgency = "critical" | "high" | "medium";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface StockSummaryParams {
  page?: number;
  limit?: number;
}

interface ReorderReportParams {
  page?: number;
  limit?: number;
}

export interface MovementsParams {
  warehouseId?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SlowMovingRow {
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  onHand: number;
  averageCost: number;
  value: number;
  lastMovement: string | null;
  daysSinceLastMovement: number | null;
}

export interface ExpiryReportRow {
  id: number;
  lotNumber: string;
  expiryDate: string;
  status: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  totalOnHand: string;
  daysUntilExpiry: number;
}

interface SlowMovingParams {
  days?: number;
  page?: number;
  limit?: number;
}

interface ExpiryReportParams {
  withinDays?: number;
  warehouseId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

interface InventoryDashboardMovement {
  id: number;
  transactionType: MovementType;
  quantityChange: number;
  createdAt: string;
  notes: string | null;
  productName: string;
  sku: string;
  locationName: string | null;
  performedBy: string | null;
}

export interface AiInsight {
  id: number;
  insightType: string;
  severity: string;
  title: string;
  body: string;
  status: "NEW" | "ACKNOWLEDGED" | "DISMISSED";
  createdAt: string;
}

interface InventoryDashboard {
  totalSkus: number;
  totalOnHand: number;
  totalCommitted: number;
  totalOnOrder: number;
  lowStockCount: number;
  draftPoCount: number;
  openSoCount: number;
  recentMovements: InventoryDashboardMovement[];
  stockValue: number;
  expiringLotsCount: number;
  qualityHoldQty: number;
  activeReservationsCount: number;
  openShipmentsCount: number;
  failedChannelSyncsCount: number;
  openInspectionsCount: number;
  recentInsights: AiInsight[];
}

export interface StockSummaryRow {
  productId: number;
  productName: string;
  sku: string;
  categoryName: string | null;
  uom: string | null;
  warehouseName: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  reorderPoint: number | null;
  costPrice: string | null;
  totalValue: number;
}

export interface ReorderReportRow {
  productId: number;
  productName: string;
  sku: string;
  variantSku: string;
  categoryName: string | null;
  warehouseName: string | null;
  onHand: number;
  availableQty: number;
  reorderPoint: number;
  reorderQty: number | null;
  deficit: number;
  costPrice: string | null;
  vendorName: string | null;
  urgency: ReorderUrgency;
}

export interface MovementReportRow {
  id: number;
  type: MovementType;
  productName: string;
  sku: string;
  warehouseId: number | null;
  warehouseName: string | null;
  locationName: string | null;
  quantity: number;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  performedBy: string | null;
}

interface RawProductRef {
  id: number;
  name: string;
  sku: string;
  costPrice?: string | null;
  reorderPoint?: string | null;
  minStockLevel?: string | null;
}

interface RawVariantRef {
  id: number;
  name: string;
  sku: string;
  costPrice: string | null;
  product: RawProductRef | null;
}

interface RawWarehouseRef {
  id: number;
  name: string;
}

interface RawLocationRef {
  id: number;
  name: string;
  code: string;
  warehouse?: RawWarehouseRef | null;
}

interface RawUserRef {
  id: string;
  name: string;
}

interface RawStockLevelRow {
  id: number;
  onHand: string;
  committed: string;
  onOrder: string;
  productVariant: RawVariantRef | null;
  location: RawLocationRef | null;
}

interface RawTransactionRow {
  id: number;
  transactionType: MovementType;
  quantityChange: string;
  quantityAfter: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  productVariant: RawVariantRef | null;
  location: RawLocationRef | null;
  creator: RawUserRef | null;
}

interface RawDashboardResponse {
  stockSummary: {
    totalSkus: number;
    totalOnHand: number;
    totalCommitted: number;
    totalOnOrder: number;
  } | null;
  lowStockCount: number;
  draftPoCount: number;
  openSoCount: number;
  recentMovements: RawTransactionRow[];
  stockValue?: number;
  expiringLotsCount?: number;
  qualityHoldQty?: number;
  activeReservationsCount?: number;
  openShipmentsCount?: number;
  failedChannelSyncsCount?: number;
  openInspectionsCount?: number;
  recentInsights?: AiInsight[];
}

interface RawStockSummaryEnvelope {
  items: RawStockLevelRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface RawMovementsEnvelope {
  items: RawTransactionRow[];
  total: number;
  page: number;
  totalPages: number;
}

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

function toReorderRow(row: RawStockLevelRow): ReorderReportRow {
  const variant = row.productVariant;
  const product = variant?.product ?? null;
  const onHand = toNumber(row.onHand);
  const reservedQty = toNumber(row.committed);
  const reorderPoint = product?.reorderPoint != null ? toNumber(product.reorderPoint) : 0;
  const deficit = Math.max(reorderPoint - onHand, 0);
  const variantSku = variant?.sku ?? "—";
  return {
    productId: product?.id ?? variant?.id ?? 0,
    productName: product?.name ?? variant?.name ?? "—",
    sku: variantSku,
    variantSku,
    categoryName: null,
    warehouseName: row.location?.warehouse?.name ?? null,
    onHand,
    availableQty: onHand - reservedQty,
    reorderPoint,
    reorderQty: deficit > 0 ? deficit : null,
    deficit,
    costPrice: variant?.costPrice ?? null,
    vendorName: null,
    urgency: reorderUrgency(onHand, reorderPoint),
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
  return useQuery<InventoryDashboard, Error>({
    queryKey: queryKeys.inventory.dashboard(),
    queryFn: async () => {
      const data = await apiClient.get<RawDashboardResponse>("/inventory/reports/dashboard");
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
  });
}

export function useStockSummary(params?: StockSummaryParams) {
  return useQuery<PaginatedResponse<StockSummaryRow>, Error>({
    queryKey: queryKeys.inventory.stockSummary(params),
    queryFn: async () => {
      const data = await apiClient.get<RawStockSummaryEnvelope>("/inventory/reports/stock-summary", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      });
      const items = (data.items ?? []).map(toStockSummaryRow);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
  });
}

export function useReorderReport(params?: ReorderReportParams) {
  return useQuery<PaginatedResponse<ReorderReportRow>, Error>({
    queryKey: [...queryKeys.inventory.all, "reorderReport", params ?? {}] as const,
    queryFn: async () => {
      const data = await apiClient.get<RawStockSummaryEnvelope>("/inventory/reports/reorder", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      });
      const items = (data.items ?? []).map(toReorderRow);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
  });
}

export function useMovementsReport(params?: MovementsParams) {
  return useQuery<PaginatedResponse<MovementReportRow>, Error>({
    queryKey: queryKeys.inventory.movementsReport({
      warehouseId: params?.warehouseId ?? null,
      type: params?.type ?? null,
      dateFrom: params?.dateFrom ?? null,
      dateTo: params?.dateTo ?? null,
      page: params?.page ?? null,
      limit: params?.limit ?? null,
    }),
    queryFn: async () => {
      const data = await apiClient.get<RawMovementsEnvelope>("/inventory/reports/movements", {
        ...(params?.dateFrom !== undefined ? { fromDate: params.dateFrom } : {}),
        ...(params?.dateTo !== undefined ? { toDate: params.dateTo } : {}),
        ...(params?.warehouseId !== undefined ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.type !== undefined ? { type: params.type } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      });
      const items = (data.items ?? []).map(toMovementRow);
      return { items, total: data.total, page: data.page, totalPages: data.totalPages };
    },
    staleTime: 5 * 60_000,
  });
}

export function useSlowMovingReport(params?: SlowMovingParams) {
  return useQuery<PaginatedResponse<SlowMovingRow>, Error>({
    queryKey: [...queryKeys.inventory.all, "slowMovingReport", params ?? {}] as const,
    queryFn: async () => {
      const data = await apiClient.get<PaginatedResponse<SlowMovingRow>>("/inventory/reports/slow-moving", {
        ...(params?.days !== undefined ? { days: String(params.days) } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useExpiryReport(params?: ExpiryReportParams) {
  return useQuery<PaginatedResponse<ExpiryReportRow>, Error>({
    queryKey: [...queryKeys.inventory.all, "expiryReport", params ?? {}] as const,
    queryFn: async () => {
      const data = await apiClient.get<PaginatedResponse<ExpiryReportRow>>("/inventory/reports/expiry", {
        ...(params?.withinDays !== undefined ? { withinDays: String(params.withinDays) } : {}),
        ...(params?.warehouseId !== undefined ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.status !== undefined ? { status: params.status } : {}),
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
