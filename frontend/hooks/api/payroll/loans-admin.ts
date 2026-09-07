"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";

const loanListC = lazyContract(() =>
  import("@/hooks/api/payroll/loans-admin-schema").then((m) => m.loanListResponseContract),
);
const loanSuccessC = lazyContract(() =>
  import("@/hooks/api/payroll/loans-admin-schema").then((m) => m.successContract),
);

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
    queryKey: payrollQueryKeys.payroll.loansAdmin(),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<LoanAdminItem>>("/hr/loans", undefined, signal, loanListC)).items,
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
  return useAuthorizedMutation("hr:payroll:view", {
    mutationKey: ["hr", "loans", "update-status"],
    mutationFn: ({ loanId, status }: UpdateLoanStatusInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/loans/${loanId}`, { status }, undefined, loanSuccessC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.loansAdmin() });
    },
  });
}
