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

export interface PoBatchLineOverride {
  requested: string;
  reason: string;
}

export interface PoBatchLine {
  productVariantId: number;
  productName: string;
  requested: string;
  ordered: string;
  engineOrdered: string;
  override: PoBatchLineOverride | null;
  unitCost: string;
  lineValue: string;
  excess: string;
  reasons: string[];
}

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
