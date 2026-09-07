"use client";
import type { z } from "zod";
import type { reorderProposalInvContract as reorderProposalInvContractDef } from "@/hooks/api/inv-ai-explain-schema";
import type { explainInsightInvContract as explainInsightInvContractDef } from "@/hooks/api/inv-ai-explain-schema";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { inventoryQueryKeys } from "@/lib/query-keys/inventory";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const explainInsightInvContract = lazyContract(() =>
  import("@/hooks/api/inv-ai-explain-schema").then((m) => m.explainInsightInvContract),
);
const reorderProposalInvContract = lazyContract(() =>
  import("@/hooks/api/inv-ai-explain-schema").then((m) => m.reorderProposalInvContract),
);
const supplierDelayBriefingInvContract = lazyContract(() =>
  import("@/hooks/api/inv-ai-explain-schema").then((m) => m.supplierDelayBriefingInvContract),
);

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export type InsightNarration = z.infer<typeof explainInsightInvContractDef>;

export function useExplainInsight() {
  return useAuthorizedMutation<InsightNarration, Error, number>("inventory:reports:read", {
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`, undefined, undefined, explainInsightInvContract),
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

export type ReorderProposalResponse = z.infer<typeof reorderProposalInvContractDef>;

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

export function useReorderProposal() {
  return useAuthorizedMutation<ReorderProposalResponse, Error, { variantId: string; warehouseId?: string }>("inventory:ai:propose", {
    mutationKey: ["inventory", "ai", "reorder-proposal"],
    mutationFn: (body) =>
      apiClient.post<ReorderProposalResponse>("/inventory/ai/reorder-proposal", body, undefined, reorderProposalInvContract),
  });
}

export function useConfirmReorderProposal() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { proposalId: string; token: string }>("inventory:ai:propose", {
    mutationKey: ["inventory", "ai", "reorder-proposal", "confirm"],
    mutationFn: (body) =>
      apiClient.post<unknown>("/inventory/ai/reorder-proposal/confirm", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryQueryKeys.inventory.aiInsights() });
    },
  });
}

export function useSupplierDelayBriefing(vendorId?: string) {
  return useQuery<SupplierDelayBriefing, Error>({
    queryKey: inventoryQueryKeys.inventory.supplierDelayBriefing(vendorId),
    queryFn: ({ signal }) =>
      apiClient.get<SupplierDelayBriefing>(
        "/inventory/ai/supplier-delay",
        vendorId ? { vendorId } : {}, signal, supplierDelayBriefingInvContract,
      ),
    staleTime: 5 * 60_000,
  });
}
