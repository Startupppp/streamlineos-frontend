"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { inventoryQueryKeys } from "@/lib/query-keys/inventory";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import type { VendorScorecard } from "@/types/inventory-vendor-performance";

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export type InvAiActionKey =
  | "review_reorder_suggestion"
  | "draft_purchase_order"
  | "open_stock_movements"
  | "open_expiry_report"
  | "review_vendor_performance"
  | "acknowledge_insight"
  | "dismiss_insight";

export interface ResolvedAiAction {
  action: InvAiActionKey;
  label: string;
  href: string | null;
  permission: PermissionKey;
  mutates: boolean;
  rationale: string;
  evidence: Array<{ kind: string; id: number }>;
}

export interface AiProvenance {
  contractVersion: number;
  promptKey: string;
  promptVersion: number;
  model: string;
  correlationId: string;
}

export interface InsightNarration {
  status: "ok" | "insufficient_evidence" | "refused";
  explanation: string;
  factors: ExplainFactor[];
  actions: ResolvedAiAction[];
  evidenceSnapshot: Record<string, unknown>;
  provenance: AiProvenance;
}

export function useExplainInsight() {
  return useAuthorizedMutation<InsightNarration, Error, number>("inventory:reports:read", {
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`),
  });
}

export interface ReorderEvidence {
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

export interface ReorderForecast {
  method: string | null;
  demandCategory: string;
  applicable: boolean;
  refusalReason: string | null;
  serviceLevel: string;
  safetyStock: string | null;
  demandMean: string;
  demandStdDev: string;
  leadTimeWeeks: string;
  leadTimeStdDevWeeks: string;
  mase: string | null;
  stockoutCensored: boolean;
}

export interface ReorderProposalResponse {
  status: "proposed" | "blocked";
  evidence: ReorderEvidence;
  forecast: ReorderForecast;
  explanation: InsightNarration | null;
  proposal: {
    proposalId: number;
    token: string;
    expiresAt: string;
  } | null;
  blockedReason: string | null;
  aiUsage?: AiUsageMeta | null;
}

export interface SupplierDelayVendor {
  vendorId: string;
  vendorName: string;
  insights: unknown[];
  performance: VendorScorecard;
  insightCount: number;
}

export interface SupplierDelayBriefing {
  vendors: SupplierDelayVendor[];
  narration: string;
  generatedAt: string;
}

export function useReorderProposal() {
  return useAuthorizedMutation<ReorderProposalResponse, Error, { variantId: number; warehouseId?: number }>("inventory:ai:propose", {
    mutationKey: ["inventory", "ai", "reorder-proposal"],
    mutationFn: (body) =>
      apiClient.post<ReorderProposalResponse>("/inventory/ai/reorder-proposal", body),
  });
}

export function useConfirmReorderProposal() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<unknown, Error, { proposalId: number; token: string }>("inventory:ai:propose", {
    mutationKey: ["inventory", "ai", "reorder-proposal", "confirm"],
    mutationFn: (body, idempotencyKey) =>
      apiClient.post<unknown>("/inventory/ai/reorder-proposal/confirm", body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryQueryKeys.inventory.aiInsights() });
    },
  });
}

export function useSupplierDelayBriefing(vendorId?: string) {
  const canRead = useCan("inventory:reports:read");
  return useQuery<SupplierDelayBriefing, Error>({
    queryKey: inventoryQueryKeys.inventory.supplierDelayBriefing(vendorId),
    queryFn: ({ signal }) =>
      apiClient.get<SupplierDelayBriefing>(
        "/inventory/ai/supplier-delay",
        vendorId ? { vendorId } : {}, signal,
      ),
    staleTime: 5 * 60_000,
    enabled: canRead,
  });
}
