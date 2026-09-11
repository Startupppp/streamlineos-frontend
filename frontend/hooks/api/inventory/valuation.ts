"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

type CostingMethod = "FIFO" | "LIFO" | "WEIGHTED_AVG" | "STANDARD";

export interface ValuationRow {
  variantId: number;
  variantSku: string;
  productName: string;
  costingMethod: CostingMethod;
  onHandQty: number;
  unitCostBasis: number;
  totalValue: number;
  warehouseId: number | null;
  warehouseName: string | null;
}

interface ValuationSummary {
  totalValue: number;
  byMethod: { method: CostingMethod; value: number }[];
  rows: ValuationRow[];
}

/**
 * Every quantity and money figure on the valuation evidence endpoints leaves
 * Postgres as `text` and stays a string here. They are `numeric(18,4)` in the
 * organisation's own currency — not minor units — so neither `/100` nor
 * `parseFloat` belongs anywhere near them.
 */
export interface ValuationLayer {
  layerId: number;
  createdAt: string;
  stockTransactionId: number | null;
  costingMethod: string;
  sourceType: string | null;
  sourceId: string | null;
  locationId: number | null;
  locationName: string | null;
  warehouseName: string | null;
  lotId: number | null;
  lotNumber: string | null;
  quantity: string;
  unitCost: string;
  totalValue: string;
  remainingQuantity: string;
  remainingValue: string;
  consumedQuantity: string;
  consumptionCount: number;
  remainingQuantityAsAt: string;
  remainingValueAsAt: string;
}

/** The date a figure is quoted as at, and the accounting period holding it. */
export interface ValuationGrain {
  asOfDate: string;
  live: boolean;
  period: InventoryPeriod | null;
}

interface ValuationLayersResponse {
  grain: ValuationGrain;
  items: ValuationLayer[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InventoryPeriod {
  /** A `gl_periods` id: valuation reads the default book's accounting periods. */
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

/**
 * `installed: false` is the ordinary answer, not a failure: periods live in the
 * accounting module and an organisation without it has none.
 */
interface ValuationPeriodsResponse {
  installed: boolean;
  items: InventoryPeriod[];
}

/** One layer an issue drew from: how much it took, and what that draw cost. */
export interface ValuationConsumption {
  consumptionId: number;
  createdAt: string;
  stockTransactionId: number;
  valuationLayerId: number;
  quantity: string;
  unitCost: string;
  totalCost: string;
  layerUnitCost: string;
  layerCreatedAt: string;
  layerSourceType: string | null;
  layerSourceId: string | null;
  costingMethod: string;
  productVariantId: number;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  postingDate: string;
  variantSku: string;
  productName: string;
  locationName: string | null;
}

interface ValuationConsumptionsResponse {
  window: { fromDate: string; toDate: string; period: InventoryPeriod | null };
  items: ValuationConsumption[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ValuationConsumptionsParams {
  [key: string]: unknown;
  variantId?: number;
  layerId?: number;
  stockTransactionId?: number;
  periodId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CostingProductRow {
  variantId: number;
  variantSku: string;
  productName: string;
  costingMethod: CostingMethod;
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

export function useValuationReport(params?: ValuationReportParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationSummary, Error>({
    queryKey: queryKeys.inventory.valuationReport(params),
    queryFn: () =>
      apiClient.get<ValuationSummary>("/inventory/reports/valuation", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.categoryId ? { categoryId: String(params.categoryId) } : {}),
      }),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useValuationLayers(variantId: number, page?: number) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationLayersResponse, Error>({
    queryKey: queryKeys.inventory.valuationLayers(variantId, page),
    queryFn: () =>
      apiClient.get<ValuationLayersResponse>("/inventory/valuation/layers", {
        variantId: String(variantId),
        ...(page ? { page: String(page) } : {}),
      }),
    enabled: canView && variantId > 0,
    staleTime: 2 * 60_000,
  });
}

/**
 * The accounting periods a valuation figure can be quoted against.
 *
 * Catalog-tier staleness: a period list changes when the books are closed, which
 * is monthly at most. `installed: false` means the accounting module is absent —
 * the caller renders no period filter rather than an empty one.
 */
export function useValuationPeriods() {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationPeriodsResponse, Error>({
    queryKey: queryKeys.inventory.valuationPeriods(),
    queryFn: () => apiClient.get<ValuationPeriodsResponse>("/inventory/valuation/periods"),
    staleTime: 30 * 60_000,
    enabled: canView,
  });
}

/**
 * Which layer each issue drew from, and at what cost — the rows a cost of goods
 * sold figure is reproducible from. Defaults to the current month server-side
 * when no window is named.
 */
export function useValuationConsumptions(params?: ValuationConsumptionsParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationConsumptionsResponse, Error>({
    queryKey: queryKeys.inventory.valuationConsumptions(params),
    queryFn: () =>
      apiClient.get<ValuationConsumptionsResponse>("/inventory/valuation/consumptions", {
        ...(params?.variantId ? { variantId: String(params.variantId) } : {}),
        ...(params?.layerId ? { layerId: String(params.layerId) } : {}),
        ...(params?.stockTransactionId
          ? { stockTransactionId: String(params.stockTransactionId) }
          : {}),
        ...(params?.periodId ? { periodId: String(params.periodId) } : {}),
        ...(params?.fromDate ? { fromDate: params.fromDate } : {}),
        ...(params?.toDate ? { toDate: params.toDate } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

/**
 * The costing table reads the variant list, so the gate is that endpoint's own key.
 * Gating it on `inventory:valuation:read` sent a 403 for anyone holding valuation
 * without products; the page-level finance gate lives in `CostingClient`.
 */
export function useCostingProducts(params?: CostingParams) {
  const canView = useCan("inventory:products:read");
  return useQuery<CostingListResponse, Error>({
    queryKey: queryKeys.inventory.costingProducts(params),
    queryFn: () =>
      apiClient.get<CostingListResponse>("/inventory/products/variants", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
