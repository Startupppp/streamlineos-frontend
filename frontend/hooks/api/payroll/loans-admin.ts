"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

export function useAdminLoans() {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: queryKeys.payroll.loansAdmin(),
    queryFn: ({ signal }) => apiClient.get<LoanAdminItem[]>("/hr/loans", undefined, signal),
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
      qc.invalidateQueries({ queryKey: queryKeys.payroll.loansAdmin() });
    },
  });
}
