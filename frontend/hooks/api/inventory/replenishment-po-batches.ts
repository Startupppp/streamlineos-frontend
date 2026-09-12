"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
    queryFn: ({ signal }) =>
      apiClient.get<BatchableProposalsResponse>(
        "/inventory/replenishment/po-batches/proposals",
        {
          ...(params?.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
          ...(params?.vendorId ? { vendorId: String(params.vendorId) } : {}),
          ...(params?.page ? { page: String(params.page) } : {}),
          ...(params?.limit ? { limit: String(params.limit) } : {}),
        },
        signal,
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
    queryFn: ({ signal }) =>
      apiClient.post<PoBatchPreview>(
        "/inventory/replenishment/po-batches/preview",
        {
          proposalIds: [...proposalIds],
          overrides: [...overrides],
        },
        { signal },
      ),
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
  return useAuthorizedMutation<RefreshedProposals, Error, RefreshProposalsInput>(
    "inventory:replenishment:manage",
    {
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
    },
  );
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
