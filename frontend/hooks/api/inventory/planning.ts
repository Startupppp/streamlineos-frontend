"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

/** `NONE` is a variant with no demand, so no stockout date to project. */
type StockoutRisk = "HIGH" | "MEDIUM" | "LOW" | "NONE";

function toStockoutRisk(value: string): StockoutRisk {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW" ? value : "NONE";
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface ReplenishmentRule {
  id: number;
  variantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number;
  /** Null for a rule that applies to every warehouse. */
  warehouseName: string | null;
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

/**
 * A rule as `GET /inventory/replenishment/rules` returns it: the row with its
 * variant and warehouse nested and its quantities as decimal strings. The
 * screens read the flattened `ReplenishmentRule`, so the list rendered blanks
 * for SKU, product and warehouse until this was mapped.
 */
interface RawReplenishmentRule {
  id: number;
  orgId: string;
  productVariantId: number;
  warehouseId: number | null;
  minQty: string;
  maxQty: string | null;
  reorderQty: string | null;
  vendorId: number | null;
  leadTimeDays: number | null;
  safetyStock: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productVariant: { id: number; name: string; sku: string; product: { id: number; name: string; sku: string } };
  warehouse: { id: number; name: string } | null;
}

/** What a create or update answers with: the stored row, relations not loaded. */
type RawReplenishmentRuleDetail = Omit<RawReplenishmentRule, "productVariant" | "warehouse">;

function mapRule(raw: RawReplenishmentRule): ReplenishmentRule {
  return {
    id: raw.id,
    variantId: raw.productVariantId,
    variantSku: raw.productVariant.sku,
    productName: raw.productVariant.product.name,
    warehouseId: raw.warehouseId ?? 0,
    warehouseName: raw.warehouse?.name ?? null,
    minQty: toNumber(raw.minQty),
    maxQty: toNumber(raw.maxQty),
    reorderQty: toNumber(raw.reorderQty),
    safetyStock: raw.safetyStock != null ? toNumber(raw.safetyStock) : null,
    leadTimeDays: raw.leadTimeDays,
    vendorId: raw.vendorId,
    vendorName: null,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
  };
}

interface RawReplenishmentRuleListResponse {
  items: RawReplenishmentRule[];
  total: number;
  page: number;
  totalPages: number;
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

export interface ForecastRow {
  variantId: number;
  variantSku: string;
  productName: string;
  weeklyDemand: number | null;
  projection: { week: number; projectedQty: number }[];
  stockoutRisk: StockoutRisk;
  currentStock: number;
}

/**
 * A row as `GET /inventory/forecasting` returns it. `ForecastRow` is the shape
 * the screen reads; the names differ (`avgWeeklyDemand`, `projectedWeeks`,
 * `onHand`), so unmapped the demand, projection and stock columns were empty.
 */
interface RawForecastItem {
  variantId: number;
  variantSku: string;
  variantName: string;
  productName: string;
  onHand: number;
  onOrder: number;
  avgWeeklyDemand: number;
  weeksOfStock: number | null;
  stockoutRisk: string;
  projectedWeeks: { week: number; projectedDemand: number; projectedStock: number }[];
}

interface RawForecastListResponse {
  items: RawForecastItem[];
  total: number;
  page: number;
  totalPages: number;
}

function mapForecastRow(raw: RawForecastItem): ForecastRow {
  return {
    variantId: raw.variantId,
    variantSku: raw.variantSku,
    productName: raw.productName,
    weeklyDemand: raw.avgWeeklyDemand,
    projection: raw.projectedWeeks.map((w) => ({ week: w.week, projectedQty: w.projectedStock })),
    stockoutRisk: toStockoutRisk(raw.stockoutRisk),
    currentStock: raw.onHand,
  };
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
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawReplenishmentRuleListResponse>("/inventory/replenishment/rules", {
        ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal);
      return { items: raw.items.map(mapRule), total: raw.total, page: raw.page, totalPages: raw.totalPages };
    },
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCreateReplenishmentRule() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<RawReplenishmentRuleDetail, Error, CreateReplenishmentRuleInput>("inventory:replenishment:manage", {
    mutationKey: ["inventory", "replenishment", "rule", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<RawReplenishmentRuleDetail>("/inventory/replenishment/rules", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.replenishmentRules() });
    },
  });
}

export function useUpdateReplenishmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    RawReplenishmentRuleDetail,
    Error,
    { ruleId: number; data: Partial<CreateReplenishmentRuleInput> }
  >("inventory:replenishment:manage", {
    mutationKey: ["inventory", "replenishment", "rule", "update"],
    mutationFn: ({ ruleId, data }) =>
      apiClient.patch<RawReplenishmentRuleDetail>(`/inventory/replenishment/rules/${ruleId}`, data),
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

export function useForecasting(params?: ForecastParams) {
  const canView = useCan("inventory:reports:read");
  return useQuery<ForecastListResponse, Error>({
    queryKey: queryKeys.inventory.forecasting(params),
    queryFn: async ({ signal }) => {
      const raw = await apiClient.get<RawForecastListResponse>("/inventory/forecasting", {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
      }, signal);
      return { items: raw.items.map(mapForecastRow), total: raw.total, page: raw.page, totalPages: raw.totalPages };
    },
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
    queryFn: ({ signal }) =>
      apiClient.get<ReorderProposal>(
        `/inventory/forecasting/reorder-proposal/${productVariantId}`, undefined, signal,
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
    queryFn: ({ signal }) =>
      apiClient.get<DemandBaselineReport>(`/inventory/forecasting/baseline/${productVariantId}`, undefined, signal),
    staleTime: 60_000,
    ...options,
    enabled: canManage && productVariantId !== null && (options?.enabled ?? true),
  });
}

export function useSimulateReplenishment() {
  return useAuthorizedMutation<SimulationResult, Error, SimulateInput>("inventory:replenishment:manage", {
    mutationKey: ["inventory", "forecasting", "simulate"],
    mutationFn: ({ productVariantId, scenarios, serviceLevel }) =>
      apiClient.post<SimulationResult>(
        `/inventory/forecasting/simulate/${productVariantId}`,
        { scenarios, ...(serviceLevel !== undefined ? { serviceLevel } : {}) },
      ),
  });
}
