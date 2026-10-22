"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CostingVariants,
  InventoryPeriod,
  ValuationGrain,
  ValuationReport,
} from "@/hooks/api/inventory/valuation-schema";

export type {
  ValuationReport,
  ValuationRow,
  CostingVariant,
} from "@/hooks/api/inventory/valuation-schema";

const valuationReportContract = lazyContract(() =>
  import("@/hooks/api/inventory/valuation-schema").then((m) => m.valuationReportContract),
);
const costingVariantsContract = lazyContract(() =>
  import("@/hooks/api/inventory/valuation-schema").then((m) => m.costingVariantsContract),
);

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

interface ValuationLayersResponse {
  grain: ValuationGrain;
  items: ValuationLayer[];
  total: number;
  page: number;
  totalPages: number;
}

interface ValuationPeriodsResponse {
  installed: boolean;
  items: InventoryPeriod[];
}

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

interface ValuationReportParams {
  [key: string]: unknown;
  warehouseId?: number;
  categoryId?: number;
  asOfDate?: string;
  periodId?: string;
  page?: number;
  limit?: number;
}

interface CostingParams {
  [key: string]: unknown;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useValuationReport(params?: ValuationReportParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationReport, Error>({
    queryKey: queryKeys.inventory.valuationReport(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/reports/valuation",
        {
          warehouseId: params?.warehouseId,
          categoryId: params?.categoryId,
          asOfDate: params?.asOfDate,
          periodId: params?.periodId,
          page: params?.page,
          limit: params?.limit,
        },
        signal,
        valuationReportContract,
      ),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useValuationLayers(variantId: number, page?: number) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationLayersResponse, Error>({
    queryKey: queryKeys.inventory.valuationLayers(variantId, page),
    queryFn: ({ signal }) =>
      apiClient.get<ValuationLayersResponse>("/inventory/valuation/layers", {
        variantId: String(variantId),
        ...(page ? { page: String(page) } : {}),
      }, signal),
    enabled: canView && variantId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useValuationPeriods() {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationPeriodsResponse, Error>({
    queryKey: queryKeys.inventory.valuationPeriods(),
    queryFn: ({ signal }) => apiClient.get<ValuationPeriodsResponse>("/inventory/valuation/periods", undefined, signal),
    staleTime: 30 * 60_000,
    enabled: canView,
  });
}

export function useValuationConsumptions(params?: ValuationConsumptionsParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<ValuationConsumptionsResponse, Error>({
    queryKey: queryKeys.inventory.valuationConsumptions(params),
    queryFn: ({ signal }) =>
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
      }, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCostingProducts(params?: CostingParams) {
  const canView = useCan("inventory:products:read");
  return useQuery<CostingVariants, Error>({
    queryKey: queryKeys.inventory.costingProducts(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/inventory/products/variants",
        {
          activeOnly: params?.activeOnly === undefined ? undefined : String(params.activeOnly),
          page: params?.page,
          limit: params?.limit,
        },
        signal,
        costingVariantsContract,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
