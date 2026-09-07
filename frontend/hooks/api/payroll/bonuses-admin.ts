"use client";
import type { Bonus, BonusCreated, IncentiveItem, IncentiveList } from "@/hooks/api/payroll/bonuses-schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type { Bonus, IncentiveItem as Incentive };

const bonusCreatedC = lazyContract(() =>
  import("@/hooks/api/payroll/bonuses-schema").then((m) => m.bonusCreatedContract),
);
const bonusListC = lazyContract(() =>
  import("@/hooks/api/payroll/bonuses-schema").then((m) => m.bonusListContract),
);
const incentiveListC = lazyContract(() =>
  import("@/hooks/api/payroll/bonuses-schema").then((m) => m.incentiveListContract),
);
const bonusSuccessC = lazyContract(() =>
  import("@/hooks/api/payroll/bonuses-schema").then((m) => m.successContract),
);

export type BonusType =
  | "PERFORMANCE"
  | "FESTIVAL"
  | "REFERRAL"
  | "SPOT"
  | "ANNUAL"
  | "JOINING"
  | "RETENTION"
  | "COMMISSION"
  | "ADJUSTMENT";

interface CreateBonusBody {
  userId: string;
  type: BonusType;
  amount: number;
  month: string;
  reason?: string;
  taxable?: boolean;
}

export function useCreateBonus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:bonuses:manage", {
    mutationKey: ["payroll", "bonuses", "create"],
    mutationFn: (body: CreateBonusBody) =>
      apiClient.post<BonusCreated>("/hr/bonuses", body, undefined, bonusCreatedC),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bonuses() }),
  });
}

export function useBonuses() {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.bonuses(),
    queryFn: ({ signal }) => apiClient.get("/hr/bonuses", undefined, signal, bonusListC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useUpdateBonus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:bonuses:manage", {
    mutationKey: ["payroll", "bonuses", "update"],
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" | "PAID" }) =>
      apiClient.patch<BonusCreated>(`/hr/bonuses/${id}`, { status }, undefined, bonusCreatedC),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bonuses() }),
  });
}

export function useIncentives(params?: { status?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string | number> = {};
  if (params?.status !== undefined) queryParams["status"] = params.status;
  if (params?.page !== undefined) queryParams["page"] = params.page;
  if (params?.limit !== undefined) queryParams["limit"] = params.limit;
  const hasParams = Object.keys(queryParams).length > 0;
  const canView = useCan("hr:payroll:view");

  return useQuery<IncentiveList>({
    queryKey: payrollQueryKeys.payroll.incentives(hasParams ? queryParams : undefined),
    queryFn: ({ signal }) =>
      apiClient.get<IncentiveList>("/hr/incentives", hasParams ? queryParams : undefined, signal, incentiveListC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useApproveIncentive() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:approve", {
    mutationKey: ["payroll", "incentives", "approve"],
    mutationFn: ({ id, approvedAmount, notes }: { id: number; approvedAmount: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/approve`, { approvedAmount, notes }, undefined, bonusSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.incentivesAll }),
  });
}

export function useRejectIncentive() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:approve", {
    mutationKey: ["payroll", "incentives", "reject"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/reject`, {}, undefined, bonusSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.incentivesAll }),
  });
}
