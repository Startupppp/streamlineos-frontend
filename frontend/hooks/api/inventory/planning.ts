"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type StockoutRisk = "HIGH" | "MEDIUM" | "LOW";

export interface ReplenishmentRule {
  id: number;
  variantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  safetyStock: number | null;
  leadTimeDays: number | null;
  vendorId: number | null;
  vendorName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ReplenishmentRuleListResponse {
  items: ReplenishmentRule[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateReplenishmentRuleInput {
  variantId: number;
  warehouseId: number;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  safetyStock?: number;
  leadTimeDays?: number;
  vendorId?: number;
}

export interface ReplenishmentSuggestion {
  id: number;
  variantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  currentStock: number;
  minQty: number;
  suggestedQty: number;
  forecastedDemand: number | null;
  vendorId: number | null;
  vendorName: string | null;
  expectedDate: string | null;
  reason: string;
}

export interface GeneratePOInput {
  vendorId: number;
  suggestions: { variantId: number; warehouseId: number; qty: number }[];
}

interface GeneratePOResult {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
}

export interface ForecastRow {
  variantId: number;
  variantSku: string;
  productName: string;
  weeklyDemand: number | null;
  projection: { week: number; projectedQty: number }[];
  stockoutRisk: StockoutRisk;
  currentStock: number;
}

interface ForecastListResponse {
  items: ForecastRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface ReplenishmentRuleParams {
  [key: string]: unknown;
  isActive?: boolean;
  warehouseId?: number;
  page?: number;
}

interface ForecastParams {
  [key: string]: unknown;
  search?: string;
  page?: number;
}

export function useReplenishmentRules(params?: ReplenishmentRuleParams) {
  return useQuery<ReplenishmentRuleListResponse, Error>({
    queryKey: queryKeys.inventory.replenishmentRules(params),
    queryFn: () =>
      apiClient.get<ReplenishmentRuleListResponse>("/inventory/replenishment/rules", {
        ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useCreateReplenishmentRule() {
  const qc = useQueryClient();
  return useMutation<ReplenishmentRule, Error, CreateReplenishmentRuleInput>({
    mutationKey: ["inventory", "replenishment", "rule", "create"],
    mutationFn: (data) =>
      apiClient.post<ReplenishmentRule>("/inventory/replenishment/rules", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export function useUpdateReplenishmentRule() {
  const qc = useQueryClient();
  return useMutation<
    ReplenishmentRule,
    Error,
    { ruleId: number; data: Partial<CreateReplenishmentRuleInput> }
  >({
    mutationKey: ["inventory", "replenishment", "rule", "update"],
    mutationFn: ({ ruleId, data }) =>
      apiClient.patch<ReplenishmentRule>(`/inventory/replenishment/rules/${ruleId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export function useDeactivateReplenishmentRule() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["inventory", "replenishment", "rule", "deactivate"],
    mutationFn: (ruleId) =>
      apiClient.delete<void>(`/inventory/replenishment/rules/${ruleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export interface ReplenishmentSuggestionsResponse {
  items: ReplenishmentSuggestion[];
  total: number;
  page: number;
  totalPages: number;
}

interface ReplenishmentSuggestionsParams {
  page?: number;
  limit?: number;
}

export function useReplenishmentSuggestions(params?: ReplenishmentSuggestionsParams) {
  return useQuery<ReplenishmentSuggestionsResponse, Error>({
    queryKey: queryKeys.inventory.replenishmentSuggestions(params),
    queryFn: () =>
      apiClient.get<ReplenishmentSuggestionsResponse>("/inventory/replenishment/suggestions", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 5 * 60_000,
  });
}

export function useGeneratePO() {
  const qc = useQueryClient();
  return useMutation<GeneratePOResult, Error, GeneratePOInput>({
    mutationKey: ["inventory", "replenishment", "generate-po"],
    mutationFn: (input) =>
      apiClient.post<GeneratePOResult>("/inventory/replenishment/suggestions/generate-po", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export function useForecasting(params?: ForecastParams) {
  return useQuery<ForecastListResponse, Error>({
    queryKey: queryKeys.inventory.forecasting(params),
    queryFn: () =>
      apiClient.get<ForecastListResponse>("/inventory/forecasting", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }),
    staleTime: 5 * 60_000,
  });
}
