"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const dealAgingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealAgingContract));
const dealApprovalLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalContract));
const dealApprovalsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalsListContract));

interface DealApproval {
  id: number;
  dealId: number;
  dealName: string | null;
  dealValue: string | null;
  requesterName: string | null;
  requestedStage: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
}

interface AgingDeal {
  id: number;
  name: string;
  value: string | null;
  stage: string;
  daysInStage: number;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
}

interface AgingResponse {
  summary: { total: number; stale: number; critical: number };
  deals: AgingDeal[];
}

export function useDealApprovals(params?: { status?: string }) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.approvals(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>, signal, dealApprovalsListLazy),
    staleTime: 2 * 60_000,
  });
}

export function useDealAging() {
  return useGatedQuery<AgingResponse>("crm:deals:read", {
    queryKey: queryKeys.deals.aging(),
    queryFn: ({ signal }) => apiClient.get<AgingResponse>("/deals/aging", undefined, signal, dealAgingLazy),
    staleTime: 305_000,
    refetchInterval: 300_000,
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "approvals", "resolve"] as const,
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input, undefined, dealApprovalLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.approvals() });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}
