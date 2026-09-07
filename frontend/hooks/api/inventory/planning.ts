"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

interface RawReplenishmentSuggestion {
  productVariantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  ruleId: number;
  warehouseId: number | null;
  warehouseName: string | null;
  currentOnHand: number;
  forecasted: number;
  suggestedQty: number;
  vendorId: number | null;
  leadTimeDays: number;
  expectedDate: string;
  reason: string;
}

export interface ReplenishmentSuggestion {
  id: number;
  variantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  currentStock: number;
  minQty: number;
  suggestedQty: number;
  forecastedDemand: number | null;
  vendorId: number | null;
  vendorName: string | null;
  expectedDate: string | null;
  reason: string;
}

function mapSuggestion(raw: RawReplenishmentSuggestion): ReplenishmentSuggestion {
  return {
    id: raw.ruleId,
    variantId: raw.productVariantId,
    variantSku: raw.variantSku,
    productName: raw.productName,
    warehouseId: raw.warehouseId,
    warehouseName: raw.warehouseName,
    currentStock: raw.currentOnHand,
    minQty: 0,
    suggestedQty: raw.suggestedQty,
    forecastedDemand: raw.forecasted,
    vendorId: raw.vendorId,
    vendorName: null,
    expectedDate: raw.expectedDate,
    reason: raw.reason,
  };
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

const listRulesContract = lazyContract(() =>
  import("@/hooks/api/inventory/planning-schema").then((m) => m.listRulesContract),
);
const ruleDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/planning-schema").then((m) => m.ruleDetailContract),
);
const listSuggestionsContract = lazyContract(() =>
  import("@/hooks/api/inventory/planning-schema").then((m) => m.listSuggestionsContract),
);
const listForecastingContract = lazyContract(() =>
  import("@/hooks/api/inventory/planning-schema").then((m) => m.listForecastingContract),
);
const getPoContract = lazyContract(() =>
  import("@/hooks/api/inventory/purchase-orders-schema").then((m) => m.getPoContract),
);

export function useReplenishmentRules(params?: ReplenishmentRuleParams) {
  const canView = useCan("inventory:replenishment:manage");
  return useQuery<ReplenishmentRuleListResponse, Error>({
    queryKey: queryKeys.inventory.replenishmentRules(params),
    queryFn: ({ signal }) =>
      apiClient.get<ReplenishmentRuleListResponse>("/inventory/replenishment/rules", {
        ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal, listRulesContract),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCreateReplenishmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ReplenishmentRule, Error, CreateReplenishmentRuleInput>("inventory:replenishment:manage", {
    mutationKey: ["inventory", "replenishment", "rule", "create"],
    mutationFn: (data) =>
      apiClient.post<ReplenishmentRule>("/inventory/replenishment/rules", data, undefined, ruleDetailContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export function useUpdateReplenishmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    ReplenishmentRule,
    Error,
    { ruleId: number; data: Partial<CreateReplenishmentRuleInput> }
  >("inventory:replenishment:manage", {
    mutationKey: ["inventory", "replenishment", "rule", "update"],
    mutationFn: ({ ruleId, data }) =>
      apiClient.patch<ReplenishmentRule>(`/inventory/replenishment/rules/${ruleId}`, data, undefined, ruleDetailContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export function useDeactivateReplenishmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("inventory:replenishment:manage", {
    mutationKey: ["inventory", "replenishment", "rule", "deactivate"],
    mutationFn: (ruleId) =>
      apiClient.delete<void>(`/inventory/replenishment/rules/${ruleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

interface RawReplenishmentSuggestionsResponse {
  items: RawReplenishmentSuggestion[];
  total: number;
  page: number;
  totalPages: number;
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
  const canView = useCan("inventory:reports:read");
  return useQuery<ReplenishmentSuggestionsResponse, Error>({
    queryKey: queryKeys.inventory.replenishmentSuggestions(params),
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawReplenishmentSuggestionsResponse>("/inventory/replenishment/suggestions", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal, listSuggestionsContract);
      return { items: raw.items.map(mapSuggestion), total: raw.total, page: raw.page, totalPages: raw.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useGeneratePO() {
  const qc = useQueryClient();
  return useAuthorizedMutation<GeneratePOResult, Error, GeneratePOInput>("inventory:purchase-orders:create", {
    mutationKey: ["inventory", "replenishment", "generate-po"],
    mutationFn: (input) =>
      apiClient.post<GeneratePOResult>("/inventory/replenishment/suggestions/generate-po", input, undefined, getPoContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export function useForecasting(params?: ForecastParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<ForecastListResponse, Error>({
    queryKey: queryKeys.inventory.forecasting(params),
    queryFn: ({ signal }) =>
      apiClient.get<ForecastListResponse>("/inventory/forecasting", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal, listForecastingContract),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}
