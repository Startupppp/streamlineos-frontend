"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * C5/C6/C7 — the planning surfaces the backend already computed and could not
 * be reached.
 *
 * Its own file rather than more of `planning.ts`, which is at 445 lines and
 * would cross the 500-line review bar with these added.
 *
 * Every quantity, cost and error figure below is an exact `numeric(18,4)`
 * decimal **string**. The API owns the arithmetic; parsing them into floats on
 * the last hop is exactly what the backend spent `exact.ts` avoiding.
 */

export interface WarehousePosition {
  warehouseId: number;
  warehouseName: string;
  onHand: string;
  committed: string;
  available: string;
  weeklyDemand: number;
  weeksOfCover: number | null;
}

export interface TransferRecommendation {
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  quantity: number;
  coverAfter: { from: number | null; to: number | null };
  rationale: string;
}

export interface TransferPlan {
  productVariantId: number;
  positions: WarehousePosition[];
  recommendations: TransferRecommendation[];
  caveats: string[];
}

export interface SourceAllocation {
  lotId: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
  quantity: string;
}

export interface ApprovedTransfer {
  transferId: number;
  referenceNumber: string;
  productVariantId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  fromLocationId: number;
  toLocationId: number;
  quantity: string;
  allocations: SourceAllocation[];
  status: string;
  created: boolean;
}

/** The move, never the amount — the server re-derives the quantity. */
export interface ApproveTransferInput {
  productVariantId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  notes?: string;
}

export function useTransferPlan(
  productVariantId: number | null,
  options?: Omit<UseQueryOptions<TransferPlan, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<TransferPlan, Error>({
    queryKey: queryKeys.inventoryPlanning.transferPlan(productVariantId ?? 0),
    queryFn: () =>
      apiClient.get<TransferPlan>(
        `/inventory/replenishment/transfer-recommendations/${productVariantId}`,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canRead && productVariantId !== null && (options?.enabled ?? true),
  });
}

/**
 * A fresh `Idempotency-Key` per attempt, not per recommendation.
 *
 * A retry of a failed approve is a new attempt and must be allowed to run; a
 * double-click within one attempt shares the key and replays the first
 * transfer, which is exactly the behaviour the backend guarantees.
 */
export function useApproveTransferRecommendation() {
  const qc = useQueryClient();
  return useIdempotentMutation<ApprovedTransfer, Error, ApproveTransferInput>({
    mutationKey: ["inventory", "planning", "transfer-recommendation", "approve"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<ApprovedTransfer>(
        "/inventory/replenishment/transfer-recommendations/approve",
        input, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventoryPlanning.transferPlan(variables.productVariantId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
    },
  });
}

export interface BatchableProposal {
  proposalId: number;
  productVariantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  vendorId: number | null;
  vendorName: string | null;
  currency: string | null;
  generatedAt: string;
  reorderPoint: string | null;
  suggestedQuantity: string;
  unitCost: string;
  duplicateOfPoNumber: string | null;
  blockedReason: string | null;
}

export interface BatchableProposalsResponse {
  items: BatchableProposal[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * C2 — a person's number, carried as theirs.
 *
 * `requested` is what they asked for, before the supplier's minimum and pack
 * size were applied to it. The line's `ordered` is that number through the same
 * policy the engine's goes through.
 */
export interface PoBatchLineOverride {
  requested: string;
  reason: string;
}

export interface PoBatchLine {
  productVariantId: number;
  productName: string;
  requested: string;
  ordered: string;
  /**
   * What the engine's own arithmetic would have ordered. Equal to `ordered` on
   * every line nobody touched; carried separately so the screen can always show
   * which number came from the engine and which from a person.
   */
  engineOrdered: string;
  /** Null when this line is the engine's own answer. */
  override: PoBatchLineOverride | null;
  unitCost: string;
  lineValue: string;
  excess: string;
  reasons: string[];
}

/**
 * C2 — the only way a client changes a quantity.
 *
 * It is not a field on a line. An override names the persisted proposal it
 * overrules and carries a reason, and the server records both beside the order
 * it produced. `quantity` is an exact `numeric(18,4)` **string** for the same
 * reason every other quantity here is: a float between the buyer's keyboard and
 * the order line is the one hop that makes an exact figure inexact.
 */
export interface ProposalOverrideInput {
  proposalId: number;
  quantity: string;
  reason: string;
}

export interface SupplierSiteBatch {
  vendorId: number;
  vendorName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  currency: string;
  lines: PoBatchLine[];
  totalValue: string;
  totalExcessUnits: string;
  requiresApproval: boolean;
  approvalReason?: string;
}

export interface PoBatchPreview {
  batches: SupplierSiteBatch[];
  skipped: Array<{ proposalId: number; productVariantId: number; reason: string }>;
  requiresApproval: boolean;
}

export interface CreatedPoBatch {
  poId: number;
  poNumber: string;
  vendorId: number;
  warehouseId: number | null;
  currency: string;
  lineCount: number;
  total: string;
  requiresApproval: boolean;
  nextStep: string;
  created: boolean;
}

interface BatchableProposalsParams {
  [key: string]: unknown;
  warehouseId?: number;
  vendorId?: number;
  page?: number;
  limit?: number;
}

export function useBatchableProposals(params?: BatchableProposalsParams) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<BatchableProposalsResponse, Error>({
    queryKey: queryKeys.inventoryPlanning.batchableProposals(params),
    queryFn: () =>
      apiClient.get<BatchableProposalsResponse>(
        "/inventory/replenishment/po-batches/proposals",
        {
          ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
          ...(params?.vendorId ? { vendorId: String(params.vendorId) } : {}),
          ...(params?.page ? { page: String(params.page) } : {}),
          ...(params?.limit ? { limit: String(params.limit) } : {}),
        },
      ),
    staleTime: 60_000,
  enabled: canRead,
  });
}

/**
 * The preview is a POST because the id list can run to a couple of hundred
 * entries, but it writes nothing — so it is a `useQuery`, keyed on the selection
 * and cached like the read it is.
 */
export function usePoBatchPreview(
  proposalIds: readonly number[],
  overrides: readonly ProposalOverrideInput[] = [],
  options?: Omit<UseQueryOptions<PoBatchPreview, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<PoBatchPreview, Error>({
    queryKey: queryKeys.inventoryPlanning.poBatchPreview(proposalIds, overrides),
    queryFn: () =>
      apiClient.post<PoBatchPreview>("/inventory/replenishment/po-batches/preview", {
        proposalIds: [...proposalIds],
        overrides: [...overrides],
      }),
    staleTime: 30_000,
    ...options,
    enabled: canRead && proposalIds.length > 0 && (options?.enabled ?? true),
  });
}

export interface CreatePoBatchInput {
  proposalIds: number[];
  vendorId: number;
  overrides?: ProposalOverrideInput[];
}

export interface RefreshProposalsInput {
  warehouseId?: number;
  limit?: number;
}

export interface RefreshedProposals {
  scanned: number;
  recorded: number;
  unchanged: number;
  failed: Array<{ productVariantId: number; reason: string }>;
}

/**
 * C2 — ask the engine to record proposals for the SKUs that have been selling.
 *
 * The persistence endpoint has existed since C1 and nothing called it, so the
 * proposals table stayed empty and this screen had nothing to review. It writes
 * forecast versions, so it takes the manage key rather than the read one, and it
 * is idempotent by fingerprint: a second sweep over unchanged data reports
 * `unchanged` rather than appending a duplicate history.
 */
export function useRefreshProposals() {
  const qc = useQueryClient();
  return useMutation<RefreshedProposals, Error, RefreshProposalsInput>({
    mutationKey: ["inventory", "planning", "proposals", "refresh"],
    mutationFn: (input) =>
      apiClient.post<RefreshedProposals>("/inventory/forecasting/versions/refresh", input),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventoryPlanning.batchableProposalsList,
      });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryPlanning.poBatchPreviewList });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryPlanning.driftWatchlistList });
    },
  });
}

export function useCreatePoBatch() {
  const qc = useQueryClient();
  return useIdempotentMutation<CreatedPoBatch, Error, CreatePoBatchInput>({
    mutationKey: ["inventory", "planning", "po-batch", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<CreatedPoBatch>("/inventory/replenishment/po-batches", input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.inventoryPlanning.batchableProposalsList,
      });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryPlanning.poBatchPreviewList });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrders() });
    },
  });
}

export interface DriftWatchRow {
  forecastId: number;
  productVariantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  method: string | null;
  generatedAt: string;
  mae: string | null;
  rmse: string | null;
  bias: string | null;
  mase: string | null;
  demandMean: string;
  maeRatio: string | null;
  breachesThreshold: boolean;
  stale: boolean;
  ageDays: number;
  coverage: {
    periods: number;
    from: string;
    to: string;
    censoredPeriods: number;
    stockoutCensored: boolean;
  };
  applicable: boolean;
  refusalReason: string | null;
  storedVersions: number;
}

export interface DriftSummary {
  tracked: number;
  breaching: number;
  stale: number;
  refused: number;
  coverage: { variantsForecast: number; variantsTotal: number; percent: string };
  proposals: {
    total: number;
    accepted: number;
    acceptedPercent: string;
    refusals: number;
    overridden: number;
    overriddenPercent: string;
  };
}

export interface DriftWatchlistResponse {
  items: DriftWatchRow[];
  total: number;
  page: number;
  totalPages: number;
  threshold: number;
  summary: DriftSummary;
}

export interface ForecastAccuracyMetrics {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  mase: number | null;
}

export interface DriftReport {
  productVariantId: number;
  warehouseId: number | null;
  method: string | null;
  earlier: ForecastAccuracyMetrics | null;
  recent: ForecastAccuracyMetrics | null;
  maeRatio: number | null;
  status: "stable" | "degrading" | "improving" | "insufficient_data";
  championChanged: boolean;
  previousChampion?: string;
  findings: string[];
}

export interface DriftEvidenceVersion {
  id: number;
  generatedAt: string;
  method: string | null;
  historyWeeks: number;
  horizonWeeks: number;
  periods: number;
  coverage: { from: string; to: string };
  metrics: { mae: string; rmse: string; bias: string; mase: string | null } | null;
  applicable: boolean;
  refusalReason: string | null;
}

export interface DriftDetail {
  report: DriftReport;
  evidence: {
    productVariantId: number;
    warehouseId: number | null;
    totalVersions: number;
    versions: DriftEvidenceVersion[];
  };
}

interface DriftWatchlistParams {
  [key: string]: unknown;
  warehouseId?: number;
  maeRatioThreshold?: number;
  breachingOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useDriftWatchlist(params?: DriftWatchlistParams) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<DriftWatchlistResponse, Error>({
    queryKey: queryKeys.inventoryPlanning.driftWatchlist(params),
    queryFn: () =>
      apiClient.get<DriftWatchlistResponse>("/inventory/replenishment/drift", {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
        ...(params?.maeRatioThreshold !== undefined
          ? { maeRatioThreshold: String(params.maeRatioThreshold) }
          : {}),
        ...(params?.breachingOnly ? { breachingOnly: "true" } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useDriftDetail(
  productVariantId: number | null,
  params?: { warehouseId?: number },
  options?: Omit<UseQueryOptions<DriftDetail, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("inventory:replenishment:read");
  return useQuery<DriftDetail, Error>({
    queryKey: queryKeys.inventoryPlanning.driftDetail(productVariantId ?? 0, params),
    queryFn: () =>
      apiClient.get<DriftDetail>(`/inventory/replenishment/drift/${productVariantId}`, {
        ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }),
    staleTime: 2 * 60_000,
    ...options,
    enabled: canRead && productVariantId !== null && (options?.enabled ?? true),
  });
}
