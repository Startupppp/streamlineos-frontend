"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
export type IncentiveStatus = "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL";

export interface Bonus {
  id: number;
  orgId: string;
  userId: string;
  type: BonusType;
  amount: string;
  reason: string | null;
  month: string | null;
  taxable: boolean;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

export interface Incentive {
  id: number;
  orgId: string;
  salesRepId: string;
  clientAccountId: string | null;
  investmentAmount: string | null;
  incentiveRate: string | null;
  calculatedAmount: string | null;
  approvedAmount: string | null;
  status: IncentiveStatus;
  notes: string | null;
  createdAt: string;
  salesRep: { id: string; name: string | null; image: string | null };
}

interface IncentivesResponse {
  incentives: Incentive[];
  total: number;
  page: number;
  totalPages: number;
}

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
      apiClient.post<Bonus>("/hr/bonuses", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payroll.bonuses() }),
  });
}

export function useBonuses() {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: queryKeys.payroll.bonuses(),
    queryFn: ({ signal }) => apiClient.get<Bonus[]>("/hr/bonuses", undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useUpdateBonus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:bonuses:manage", {
    mutationKey: ["payroll", "bonuses", "update"],
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" | "PAID" }) =>
      apiClient.patch<Bonus>(`/hr/bonuses/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payroll.bonuses() }),
  });
}

export function useIncentives(params?: { status?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string | number> = {};
  if (params?.status !== undefined) queryParams["status"] = params.status;
  if (params?.page !== undefined) queryParams["page"] = params.page;
  if (params?.limit !== undefined) queryParams["limit"] = params.limit;
  const hasParams = Object.keys(queryParams).length > 0;
  const canView = useCan("hr:payroll:view");

  return useQuery({
    queryKey: queryKeys.payroll.incentives(hasParams ? queryParams : undefined),
    queryFn: ({ signal }) =>
      apiClient.get<IncentivesResponse>("/hr/incentives", hasParams ? queryParams : undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useApproveIncentive() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:approve", {
    mutationKey: ["payroll", "incentives", "approve"],
    mutationFn: ({ id, approvedAmount, notes }: { id: number; approvedAmount: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/approve`, { approvedAmount, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payroll.incentivesAll }),
  });
}

export function useRejectIncentive() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:approve", {
    mutationKey: ["payroll", "incentives", "reject"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payroll.incentivesAll }),
  });
}
