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
  return useAuthorizedMutation<InsightNarration, Error, number>("inventory:reports:read", {
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`),
  });
}

/**
 * F4. The evidence is the **persisted C2 proposal**, resolved by the same
 * service the buyer's own batching screen uses. Every quantity is an exact
 * decimal string, not a number: these are 18,4 ledger figures and rendering one
 * through a JS float is how a purchase order acquires a rounding error.
 *
 * The old shape described a live reorder *suggestion* and named four fields the
 * server never sent (`forecasted`, `suggestedQty`, `expectedDate`, `reason` —
 * the API returns `forecastedQty`, `suggestedOrderQty`, `expectedDeliveryDate`,
 * `reorderReason`), so those cells rendered `undefined`. They are gone rather
 * than renamed, because the figures they described are no longer what the
 * proposal is made of.
 */
export interface ReorderEvidence {
  /** The persisted forecast version this proposal is about. */
  proposalId: number;
  productVariantId: number;
  variantSku: string;
  productName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  vendorId: number | null;
  vendorName: string | null;
  currency: string | null;
  /** When the forecast version behind the proposal was generated. */
  generatedAt: string;
  reorderPoint: string | null;
  /** What the server will order, through the supplier's minimum and pack size. */
  suggestedQuantity: string;
  unitCost: string;
  duplicateOfPoNumber: string | null;
  blockedReason: string | null;
}

/**
 * The C1 forecast behind the proposal, carried so the panel can show what the
 * model was and was not confident about rather than only the point estimate.
 */
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
  /**
   * `blocked` is the server declining to propose — no supplier, already on a
   * draft order, the position already covers the reorder point. It is a real
   * answer with a reason, and no credits were spent producing it, so it must
   * render as itself rather than as an empty success.
   */
  status: "proposed" | "blocked";
  evidence: ReorderEvidence;
  forecast: ReorderForecast;
  /** Null on `blocked` — there is nothing to narrate. */
  explanation: InsightNarration | null;
  /** Null on `blocked` — there is nothing confirmable. */
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
  /**
   * C4. The same scorecard the vendor page renders, from the same service.
   * The briefing used to declare its own `VendorPerformance` shape whose
   * `totalSpend` was typed as cents and rendered as rupees — a hundredfold
   * error nothing type-checked away, because the two declarations never met.
   */
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
