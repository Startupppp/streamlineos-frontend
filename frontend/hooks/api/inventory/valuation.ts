"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface ValuationRow {
  variantId: number;
  variantSku: string;
  productName: string;
  costingMethod: string;
  onHandQty: number;
  unitCostBasis: number;
  totalValue: number;
  warehouseId: number | null;
  warehouseName: string | null;
}

interface ValuationSummary {
  totalValue: number;
  byMethod: { method: string; value: number }[];
  rows: ValuationRow[];
}

interface RawValuationItem {
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productId: number;
  productName: string;
  costingMethod: string | null;
  onHand: string;
  averageCost: string | null;
  totalValue: string;
}

interface RawValuationEnvelope {
  items: RawValuationItem[];
  total: number;
  page: number;
  totalPages: number;
  totalValue?: string;
}

function mapValuationRow(raw: RawValuationItem): ValuationRow {
  const onHandQty = toNumber(raw.onHand);
  const unitCostBasis = toNumber(raw.averageCost);
  return {
    variantId: raw.productVariantId,
    variantSku: raw.variantSku,
    productName: raw.productName,
    costingMethod: raw.costingMethod ?? "UNKNOWN",
    onHandQty,
    unitCostBasis,
    totalValue: toNumber(raw.totalValue),
    warehouseId: null,
    warehouseName: null,
  };
}

interface RawValuationLayer {
  id: number;
  productVariantId: number;
  costingMethod: string;
  quantity: string;
  unitCost: string;
  totalValue: string;
  remainingQuantity: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

interface ValuationLayer {
  id: number;
  qty: number;
  unitCost: number;
  remainingQty: number;
  receivedAt: string;
  referenceType: string | null;
  referenceId: string | null;
}

function mapValuationLayer(raw: RawValuationLayer): ValuationLayer {
  return {
    id: raw.id,
    qty: toNumber(raw.quantity),
    unitCost: toNumber(raw.unitCost),
    remainingQty: toNumber(raw.remainingQuantity),
    receivedAt: raw.createdAt,
    referenceType: raw.sourceType,
    referenceId: raw.sourceId,
  };
}

interface RawValuationLayersEnvelope {
  items: RawValuationLayer[];
  total: number;
  page: number;
  totalPages: number;
}

interface ValuationLayersResponse {
  items: ValuationLayer[];
  total: number;
  page: number;
  totalPages: number;
}

interface RawVariantForCosting {
  id: number;
  productId: number;
  productName: string;
  name: string;
  sku: string;
  costPrice?: string;
  isActive: boolean;
}

interface RawVariantsEnvelope {
  items: RawVariantForCosting[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CostingProductRow {
  variantId: number;
  variantSku: string;
  productName: string;
  costingMethod: string;
  standardCost: number | null;
  averageCost: number | null;
  onHandQty: number;
  isLocked: boolean;
}

interface CostingListResponse {
  items: CostingProductRow[];
  total: number;
  page: number;
  totalPages: number;
}

function mapCostingRow(raw: RawVariantForCosting): CostingProductRow {
  return {
    variantId: raw.id,
    variantSku: raw.sku,
    productName: raw.productName,
    costingMethod: "WEIGHTED_AVG",
    standardCost: null,
    averageCost: raw.costPrice != null ? toNumber(raw.costPrice) : null,
    onHandQty: 0,
    isLocked: false,
  };
}

interface ValuationReportParams {
  [key: string]: unknown;
  warehouseId?: number;
  categoryId?: number;
}

interface CostingParams {
  [key: string]: unknown;
  search?: string;
  page?: number;
}

const valuationSummaryContract = lazyContract(() =>
  import("@/hooks/api/inventory/valuation-schema").then((m) => m.valuationSummaryContract),
);
const valuationLayersContract = lazyContract(() =>
  import("@/hooks/api/inventory/valuation-schema").then((m) => m.valuationLayersContract),
);
const listVariantsContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.listVariantsContract),
);

export function useValuationReport(params?: ValuationReportParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationSummary, Error>({
    queryKey: queryKeys.inventory.valuationReport(params),
    queryFn: async ({ signal }) => {
      const envelope = await apiClient.get<RawValuationEnvelope>("/inventory/reports/valuation", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.categoryId ? { categoryId: String(params.categoryId) } : {}),
      }, signal, valuationSummaryContract);
      const rows = (envelope.items ?? []).map(mapValuationRow);
      const byMethodMap = new Map<string, number>();
      for (const row of rows)
        byMethodMap.set(row.costingMethod, (byMethodMap.get(row.costingMethod) ?? 0) + row.totalValue);
      const byMethod = Array.from(byMethodMap.entries()).map(([method, value]) => ({ method, value }));
      const totalValue = envelope.totalValue != null ? toNumber(envelope.totalValue) : rows.reduce((sum, r) => sum + r.totalValue, 0);
      return { totalValue, byMethod, rows };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useValuationLayers(variantId: number, page?: number) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationLayersResponse, Error>({
    queryKey: queryKeys.inventory.valuationLayers(variantId, page),
    queryFn: async ({ signal }) => {
      const envelope = await apiClient.get<RawValuationLayersEnvelope>("/inventory/valuation/layers", {
        variantId: String(variantId),
        ...(page ? { page: String(page) } : {}),
      }, signal, valuationLayersContract);
      return {
        items: envelope.items.map(mapValuationLayer),
        total: envelope.total,
        page: envelope.page,
        totalPages: envelope.totalPages,
      };
    },
    enabled: canView && variantId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCostingProducts(params?: CostingParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<CostingListResponse, Error>({
    queryKey: queryKeys.inventory.costingProducts(params),
    queryFn: async ({ signal }) => {
      const envelope = await apiClient.get<RawVariantsEnvelope>("/inventory/products/variants", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal, listVariantsContract);
      return {
        items: envelope.items.map(mapCostingRow),
        total: envelope.total,
        page: envelope.page,
        totalPages: envelope.totalPages,
      };
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
