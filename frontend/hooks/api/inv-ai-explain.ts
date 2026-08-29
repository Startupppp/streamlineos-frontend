"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

/**
 * INV-102. An action arrives as a resolved object, not a sentence: the server
 * chose the label, the route and the permission from a closed table. The model
 * contributed only which member of the enum this is, so nothing renderable
 * here originated as model text except `rationale`.
 */
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
  /** `null` for anything that mutates — those never render as a link. */
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
  /**
   * `insufficient_evidence` and `refused` are real answers and must render as
   * themselves. Showing either as an empty success would read as "nothing
   * found", which is a different claim than "I could not tell".
   */
  status: "ok" | "insufficient_evidence" | "refused";
  explanation: string;
  factors: ExplainFactor[];
  actions: ResolvedAiAction[];
  evidenceSnapshot: Record<string, unknown>;
  provenance: AiProvenance;
}

export function useExplainInsight() {
  return useMutation<InsightNarration, Error, number>({
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`),
  });
}

export interface ReorderEvidence {
  productVariantId: string;
  variantSku: string;
  variantName: string;
  productName: string;
  currentOnHand: number;
  forecasted: number;
  suggestedQty: number;
  vendorId: string;
  leadTimeDays: number;
  expectedDate: string | null;
  reason: string;
}

export interface ReorderProposalResponse {
  evidence: ReorderEvidence;
  explanation: InsightNarration;
  proposal: {
    proposalId: string;
    token: string;
    expiresAt: string;
  };
}

export interface VendorPerformance {
  onTimeRate: number;
  fillRate: number;
  avgLeadTimeDays: number;
  returnRate: number;
  openPoCount: number;
  totalSpend: number;
}

export interface SupplierDelayVendor {
  vendorId: string;
  vendorName: string;
  insights: unknown[];
  performance: VendorPerformance;
  insightCount: number;
}

export interface SupplierDelayBriefing {
  vendors: SupplierDelayVendor[];
  narration: string;
  generatedAt: string;
}

export interface InventoryDigestGroup {
  insightType: string;
  count: number;
  severityCounts: Record<string, number>;
  samples: Array<{ id: number; title: string; body: string; severity: string }>;
}

export interface InventoryDigest {
  groups: InventoryDigestGroup[];
  totalNew: number;
  narration?: string;
}

/**
 * The brief is deliberately disabled until the operator asks for it. The
 * endpoint may invoke a metered model, so loading it as part of the dashboard
 * query would make a page visit spend AI credits unexpectedly.
 */
export function useInventoryDigest() {
  return useQuery<InventoryDigest, Error>({
    queryKey: queryKeys.inventory.aiDigest(true),
    queryFn: () => apiClient.get<InventoryDigest>("/inventory/ai/digest", { narrate: "true" }),
    staleTime: 10 * 60_000,
    // This is an explicit operator action because the endpoint may spend AI credits.
    enabled: false,
  });
}

export function useReorderProposal() {
  return useMutation<ReorderProposalResponse, Error, { variantId: string; warehouseId?: string }>({
    mutationKey: ["inventory", "ai", "reorder-proposal"],
    mutationFn: (body) =>
      apiClient.post<ReorderProposalResponse>("/inventory/ai/reorder-proposal", body),
  });
}

export function useConfirmReorderProposal() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { proposalId: string; token: string }>({
    mutationKey: ["inventory", "ai", "reorder-proposal", "confirm"],
    mutationFn: (body) =>
      apiClient.post<unknown>("/inventory/ai/reorder-proposal/confirm", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
    },
  });
}

export function useSupplierDelayBriefing(vendorId?: string) {
  const canRead = useCan("inventory:ai:read");
  return useQuery<SupplierDelayBriefing, Error>({
    queryKey: queryKeys.inventory.supplierDelayBriefing(vendorId),
    queryFn: () =>
      apiClient.get<SupplierDelayBriefing>(
        "/inventory/ai/supplier-delay",
        vendorId ? { vendorId } : {},
      ),
    staleTime: 5 * 60_000,
    enabled: canRead,
  });
}
