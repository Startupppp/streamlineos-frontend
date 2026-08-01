"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ExplainFactor {
  label: string;
  value: string;
  isFactual: boolean;
}

export interface InsightNarration {
  explanation: string;
  factors: ExplainFactor[];
  suggestedActions: string[];
  evidenceSnapshot: Record<string, unknown>;
}

interface DigestSample {
  id: number;
  title: string;
  body: string;
  severity: string;
}

export interface DigestGroup {
  insightType: string;
  count: number;
  severityCounts: Record<string, number>;
  samples: DigestSample[];
}

export interface InventoryDigest {
  groups: DigestGroup[];
  totalNew: number;
  narration?: string;
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
  return useQuery<SupplierDelayBriefing, Error>({
    queryKey: queryKeys.inventory.supplierDelayBriefing(vendorId),
    queryFn: () =>
      apiClient.get<SupplierDelayBriefing>(
        "/inventory/ai/supplier-delay",
        vendorId ? { vendorId } : {},
      ),
    staleTime: 5 * 60_000,
  });
}
