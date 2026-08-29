"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
    suggestedQty: raw.suggestedQty,
    forecastedDemand: raw.forecasted,
    vendorId: raw.vendorId,
    vendorName: null,
    expectedDate: raw.expectedDate,
    reason: raw.reason,
  };
}

export interface GeneratePOLineInput {
  productVariantId: number;
  suggestedQty: number;
  unitCost?: number;
}

export interface GeneratePOInput {
  vendorId: number;
  warehouseId?: number;
  suggestions: GeneratePOLineInput[];
}

export interface GeneratePOResult {
  id: number;
  poNumber: string;
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
  const canView = useCan("inventory:replenishment:manage");
  return useQuery<ReplenishmentRuleListResponse, Error>({
    queryKey: queryKeys.inventory.replenishmentRules(params),
    queryFn: () =>
      apiClient.get<ReplenishmentRuleListResponse>("/inventory/replenishment/rules", {
        ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canView,
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
    queryFn: async () => {
      const raw = await apiClient.get<RawReplenishmentSuggestionsResponse>("/inventory/replenishment/suggestions", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      });
      return { items: raw.items.map(mapSuggestion), total: raw.total, page: raw.page, totalPages: raw.totalPages };
    },
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useGeneratePO() {
  const qc = useQueryClient();
  return useMutation<GeneratePOResult, Error, GeneratePOInput>({
    mutationKey: ["inventory", "replenishment", "generate-po"],
    mutationFn: (input) =>
      apiClient.post<GeneratePOResult>("/inventory/replenishment/suggestions/generate-po", input),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
      for (const line of variables.suggestions)
        qc.invalidateQueries({ queryKey: reorderProposalKey(line.productVariantId) });
    },
  });
}

export function useForecasting(params?: ForecastParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<ForecastListResponse, Error>({
    queryKey: queryKeys.inventory.forecasting(params),
    queryFn: () =>
      apiClient.get<ForecastListResponse>("/inventory/forecasting", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export interface ReorderEvidenceLine {
  label: string;
  value: string;
  source: string;
}

export type ReorderRecommendation = "propose" | "review" | "hold";

/**
 * Exact `numeric(18,4)` decimal strings, not numbers. The API owns the
 * arithmetic and hands over figures a buyer acts on; parsing them into floats
 * here would undo the exactness on the last hop.
 */
export interface ReorderPosition {
  onHand: string;
  committed: string;
  onOrder: string;
  available: string;
}

export interface ReorderProposal {
  productVariantId: number;
  /** Null when the proposal covers the whole organisation. */
  warehouseId: number | null;
  suggestedQuantity: string | null;
  position: ReorderPosition;
  reorderPoint: string | null;
  evidence: ReorderEvidenceLine[];
  caveats: string[];
  recommendation: ReorderRecommendation;
}

export type DemandCategory = "smooth" | "erratic" | "intermittent" | "lumpy" | "no_demand";

export interface DemandClassification {
  category: DemandCategory;
  adi: number;
  cv2: number;
  nonZeroPeriods: number;
  guidance: string;
}

export interface ForecastAccuracyMetrics {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  mase: number | null;
}

export interface ForecastBacktestResult {
  method: string;
  metrics: ForecastAccuracyMetrics;
}

export interface DemandSeasonality {
  seasonLength: number | null;
  strength: number;
  candidates: { lag: number; correlation: number }[];
}

export interface DemandPeriod {
  period: string;
  /** Exact decimal string — the ledger figure, not a float. */
  quantity: string;
  closingOnHand: string;
  /**
   * The period closed with nothing on hand, so its demand is a lower bound
   * rather than a measurement.
   */
  stockoutCensored: boolean;
}

export interface DemandBaselineReport {
  productVariantId: number;
  /** Null when the report covers the whole organisation. */
  warehouseId: number | null;
  periods: number;
  history: DemandPeriod[];
  classification: DemandClassification;
  seasonality: DemandSeasonality;
  ranked: ForecastBacktestResult[];
  champion: ForecastBacktestResult | null;
  unrestrictedBest: ForecastBacktestResult | null;
  censoredPeriods: number;
  stockoutCensored: boolean;
  coverage: { from: string; to: string };
  shapeNote?: string;
  insufficientReason?: string;
  censoringNote?: string;
}

export interface SimulationScenarioInput {
  label: string;
  demandMultiplier?: number;
  leadTimeWeeks?: number;
  leadTimeStdDevWeeks?: number;
  serviceLevel?: number;
}

export interface SimulationOutcome {
  label: string;
  serviceLevel: number;
  demandMean: number;
  leadTimeWeeks: number;
  safetyStock: number;
  reorderPoint: number;
  deltaSafetyStock: number;
  deltaReorderPoint: number;
}

export interface SimulationResult {
  productVariantId: number;
  /** Null when the simulation covers the whole organisation. */
  warehouseId: number | null;
  applicable: boolean;
  reason?: string;
  baseline: SimulationOutcome | null;
  scenarios: SimulationOutcome[];
  caveats: string[];
}

export interface SimulateInput {
  productVariantId: number;
  scenarios: SimulationScenarioInput[];
  serviceLevel?: number;
}

function reorderProposalKey(productVariantId: number | null) {
  // Its own key rather than a scoped variant of the forecasting one: the two
  // surfaces invalidate independently, and sharing a factory means refreshing
  // one silently drops the other's cache.
  return productVariantId === null
    ? queryKeys.inventory.forecasting({ scope: "reorder-proposal" })
    : queryKeys.inventory.reorderProposal(productVariantId);
}

export function useForecastReorderProposal(
  productVariantId: number | null,
  options?: Omit<UseQueryOptions<ReorderProposal, Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("inventory:replenishment:manage");
  return useQuery<ReorderProposal, Error>({
    queryKey: reorderProposalKey(productVariantId),
    queryFn: () =>
      apiClient.get<ReorderProposal>(
        `/inventory/forecasting/reorder-proposal/${productVariantId}`,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canManage && productVariantId !== null && (options?.enabled ?? true),
  });
}

export function useDemandBaseline(
  productVariantId: number | null,
  options?: Omit<UseQueryOptions<DemandBaselineReport, Error>, "queryKey" | "queryFn">,
) {
  const canManage = useCan("inventory:replenishment:manage");
  return useQuery<DemandBaselineReport, Error>({
    // The query is disabled while the id is null, so the key only has to be
    // stable and distinct for that state rather than meaningful.
    queryKey: queryKeys.inventory.demandBaseline(productVariantId ?? 0),
    queryFn: () =>
      apiClient.get<DemandBaselineReport>(`/inventory/forecasting/baseline/${productVariantId}`),
    staleTime: 60_000,
    ...options,
    enabled: canManage && productVariantId !== null && (options?.enabled ?? true),
  });
}

export function useSimulateReplenishment() {
  return useMutation<SimulationResult, Error, SimulateInput>({
    mutationKey: ["inventory", "forecasting", "simulate"],
    mutationFn: ({ productVariantId, scenarios, serviceLevel }) =>
      apiClient.post<SimulationResult>(
        `/inventory/forecasting/simulate/${productVariantId}`,
        { scenarios, ...(serviceLevel !== undefined ? { serviceLevel } : {}) },
      ),
  });
}
