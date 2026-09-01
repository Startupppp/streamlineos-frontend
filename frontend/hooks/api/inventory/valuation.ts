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

interface ValuationLayer {
  id: number;
  qty: number;
  unitCost: number;
  remainingQty: number;
  receivedAt: string;
  referenceType: string | null;
  referenceId: string | null;
}

interface ValuationLayersResponse {
  items: ValuationLayer[];
  total: number;
  page: number;
  totalPages: number;
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
    queryFn: ({ signal }) =>
      apiClient.get<ValuationSummary>("/inventory/reports/valuation", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.categoryId ? { categoryId: String(params.categoryId) } : {}),
      }, signal),
    staleTime: 5 * 60_000,
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

export function useCostingProducts(params?: CostingParams) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<CostingListResponse, Error>({
    queryKey: queryKeys.inventory.costingProducts(params),
    queryFn: ({ signal }) =>
      apiClient.get<CostingListResponse>("/inventory/products/variants", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
