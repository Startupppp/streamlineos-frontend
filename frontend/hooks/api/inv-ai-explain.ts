"use client";
import type { z } from "zod";
import type { explainInsightContract as explainInsightContractDef } from "@/hooks/api/inventory/ai-schema";
import type { reorderProposalContract as reorderProposalContractDef } from "@/hooks/api/inventory/ai-schema";
import type { supplierDelayBriefingContract as supplierDelayBriefingContractDef } from "@/hooks/api/inventory/ai-schema";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { inventoryQueryKeys } from "@/lib/query-keys/inventory";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const explainInsightInvContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.explainInsightContract),
);
const reorderProposalInvContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.reorderProposalContract),
);
const supplierDelayBriefingInvContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.supplierDelayBriefingContract),
);
const confirmReorderProposalContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.confirmReorderProposalContract),
);

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export type InsightNarration = z.infer<typeof explainInsightContractDef>;
export type ReorderProposalResponse = z.infer<typeof reorderProposalContractDef>;
export type SupplierDelayBriefing = z.infer<typeof supplierDelayBriefingContractDef>;
export type SupplierDelayVendor = SupplierDelayBriefing["vendors"][number];
export type ReorderEvidence = ReorderProposalResponse["evidence"];

export function useExplainInsight() {
  return useAuthorizedMutation<InsightNarration, Error, number>("inventory:reports:read", {
    mutationKey: ["inventory", "ai", "insight", "explain"],
    mutationFn: (insightId: number) =>
      apiClient.post<InsightNarration>(`/inventory/ai/insights/${insightId}/explain`, undefined, undefined, explainInsightInvContract),
  });
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
  return useAuthorizedMutation<unknown, Error, { proposalId: number; token: string }>("inventory:ai:propose", {
    mutationKey: ["inventory", "ai", "reorder-proposal", "confirm"],
    mutationFn: (body) =>
      apiClient.post<unknown>("/inventory/ai/reorder-proposal/confirm", body, undefined, confirmReorderProposalContract),
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
        vendorId ? { vendorId } : {}, signal, supplierDelayBriefingInvContract,
      ),
    staleTime: 5 * 60_000,
    enabled: canRead,
  });
}
