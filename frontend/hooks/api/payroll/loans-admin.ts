"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

export type LoanStatus = "PENDING" | "APPROVED" | "ACTIVE" | "REPAID" | "REJECTED";

export interface LoanAdminItem {
  id: number;
  orgId: string;
  userId: string;
  amount: string;
  reason: string | null;
  emiAmount: string | null;
  totalEmis: number | null;
  paidEmis: number;
  status: LoanStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export const loansAdminKeys = {
  all: ["hr", "loans"] as const,
  list: () => ["hr", "loans", "list"] as const,
};

export function useAdminLoans() {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: loansAdminKeys.list(),
    queryFn: () => apiClient.get<LoanAdminItem[]>("/hr/loans"),
    staleTime: 30_000,
    enabled: canView,
  });
}

interface UpdateLoanStatusInput {
  loanId: number;
  status: "APPROVED" | "ACTIVE" | "REPAID" | "REJECTED";
}

export function useUpdateLoanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "loans", "update-status"],
    mutationFn: ({ loanId, status }: UpdateLoanStatusInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/loans/${loanId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loansAdminKeys.all });
    },
  });
}
