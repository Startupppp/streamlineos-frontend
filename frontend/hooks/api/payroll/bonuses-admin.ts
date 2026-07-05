"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
export type BonusStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
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

const bonusKeys = {
  all: ["payroll", "bonuses"] as const,
  list: () => ["payroll", "bonuses", "list"] as const,
};

const incentiveKeys = {
  all: ["payroll", "incentives"] as const,
  list: (params?: Record<string, string | number>) =>
    ["payroll", "incentives", "list", params ?? {}] as const,
};

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
  return useMutation({
    mutationKey: ["payroll", "bonuses", "create"],
    mutationFn: (body: CreateBonusBody) =>
      apiClient.post<Bonus>("/hr/bonuses", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.all }),
  });
}

export function useBonuses() {
  return useQuery({
    queryKey: bonusKeys.list(),
    queryFn: () => apiClient.get<Bonus[]>("/hr/bonuses"),
    staleTime: 60_000,
  });
}

export function useUpdateBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "bonuses", "update"],
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" | "PAID" }) =>
      apiClient.patch<Bonus>(`/hr/bonuses/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.all }),
  });
}

export function useIncentives(params?: { status?: string; page?: number; limit?: number }) {
  const queryParams: Record<string, string | number> = {};
  if (params?.status !== undefined) queryParams["status"] = params.status;
  if (params?.page !== undefined) queryParams["page"] = params.page;
  if (params?.limit !== undefined) queryParams["limit"] = params.limit;
  const hasParams = Object.keys(queryParams).length > 0;

  return useQuery({
    queryKey: incentiveKeys.list(hasParams ? queryParams : undefined),
    queryFn: () =>
      apiClient.get<IncentivesResponse>("/hr/incentives", hasParams ? queryParams : undefined),
    staleTime: 60_000,
  });
}

export function useApproveIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "incentives", "approve"],
    mutationFn: ({ id, approvedAmount, notes }: { id: number; approvedAmount: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/approve`, { approvedAmount, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: incentiveKeys.all }),
  });
}

export function useRejectIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "incentives", "reject"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/incentives/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: incentiveKeys.all }),
  });
}
