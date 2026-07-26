"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type {
  EssOverview,
  EssPayslip,
  EssSalaryStructure,
  EssReimbursement,
  EssLoan,
  EssTaxDeclarationResponse,
  EssBankDetails,
  EssFnfSettlement,
  ManagerInbox,
  TotalRewardsStatement,
  TeamRewardsResult,
  PayCompressionStats,
} from "@/types/payroll/ess";

export const essKeys = {
  all: ["payroll", "ess"] as const,
  overview: () => ["payroll", "ess", "overview"] as const,
  payslips: () => ["payroll", "ess", "payslips"] as const,
  salaryStructure: () => ["payroll", "ess", "salary-structure"] as const,
  reimbursements: () => ["payroll", "ess", "reimbursements"] as const,
  loans: () => ["payroll", "ess", "loans"] as const,
  taxDeclaration: () => ["payroll", "ess", "tax-declaration"] as const,
  bank: () => ["payroll", "ess", "bank"] as const,
  fnf: () => ["payroll", "ess", "fnf"] as const,
  managerInbox: () => ["payroll", "manager", "inbox"] as const,
  totalRewards: () => ["payroll", "ess", "total-rewards"] as const,
  teamRewards: () => ["payroll", "manager", "team-rewards"] as const,
  orgPayCompression: () => ["payroll", "analytics", "pay-compression"] as const,
};

export function useEssTotalRewards() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.totalRewards(),
    queryFn: () => apiClient.get<TotalRewardsStatement>("/payroll/me/total-rewards"),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useManagerTeamRewards(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.teamRewards(),
    queryFn: () => apiClient.get<TeamRewardsResult>("/payroll/manager/team-rewards"),
    staleTime: 60_000,
    enabled: enabled && canSelf,
  });
}

export function useOrgPayCompression(enabled = true) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: essKeys.orgPayCompression(),
    queryFn: () =>
      apiClient.get<PayCompressionStats & { scope: "organization" }>(
        "/payroll/analytics/pay-compression",
      ),
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useManagerInbox(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.managerInbox(),
    queryFn: () => apiClient.get<ManagerInbox>("/payroll/manager/inbox"),
    staleTime: 30_000,
    enabled: enabled && canSelf,
  });
}

function useInvalidateManagerInbox() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: essKeys.managerInbox() });
  };
}

export function useManagerApproveReimbursement() {
  const invalidate = useInvalidateManagerInbox();
  return useMutation({
    mutationKey: ["payroll", "manager", "reimb-approve"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/reimbursements/${id}/approve`),
    onSuccess: () => invalidate(),
  });
}

export function useManagerRejectReimbursement() {
  const invalidate = useInvalidateManagerInbox();
  return useMutation({
    mutationKey: ["payroll", "manager", "reimb-reject"],
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/reimbursements/${id}/reject`, {
        reason,
      }),
    onSuccess: () => invalidate(),
  });
}

export function useManagerApproveLoan() {
  const invalidate = useInvalidateManagerInbox();
  return useMutation({
    mutationKey: ["payroll", "manager", "loan-approve"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/loans/${id}/approve`),
    onSuccess: () => invalidate(),
  });
}

export function useManagerRejectLoan() {
  const invalidate = useInvalidateManagerInbox();
  return useMutation({
    mutationKey: ["payroll", "manager", "loan-reject"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/loans/${id}/reject`),
    onSuccess: () => invalidate(),
  });
}

export function useEssOverview() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.overview(),
    queryFn: () => apiClient.get<EssOverview>("/payroll/me/overview"),
    staleTime: 30_000,
    enabled: canSelf,
  });
}

export function useEssPayslips() {
  const canSelf = useCan("self:payslips");
  return useQuery({
    queryKey: essKeys.payslips(),
    queryFn: () => apiClient.get<EssPayslip[]>("/payroll/me/payslips"),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssSalaryStructure() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.salaryStructure(),
    queryFn: () => apiClient.get<EssSalaryStructure>("/payroll/me/salary-structure"),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssReimbursements() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.reimbursements(),
    queryFn: () => apiClient.get<EssReimbursement[]>("/payroll/me/reimbursements"),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssLoans() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.loans(),
    queryFn: () => apiClient.get<EssLoan[]>("/payroll/me/loans"),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssTaxDeclaration() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.taxDeclaration(),
    queryFn: () => apiClient.get<EssTaxDeclarationResponse>("/payroll/me/tax-declaration"),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssBank() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.bank(),
    queryFn: () => apiClient.get<EssBankDetails>("/payroll/me/bank"),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssFnf() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: essKeys.fnf(),
    queryFn: () => apiClient.get<EssFnfSettlement | null>("/payroll/me/fnf"),
    staleTime: 120_000,
    enabled: canSelf,
  });
}

interface SubmitReimbursementBody {
  category: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  payrollMonth?: string;
}

export function useSubmitReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "reimbursements", "submit"],
    mutationFn: (body: SubmitReimbursementBody) =>
      apiClient.post<EssReimbursement>("/payroll/me/reimbursements", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.reimbursements() });
      qc.invalidateQueries({ queryKey: essKeys.overview() });
    },
  });
}

interface CreateLoanBody {
  amount: number;
  reason: string;
  totalEmis: number;
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "loans", "create"],
    mutationFn: (body: CreateLoanBody) =>
      apiClient.post<EssLoan>("/payroll/me/loans", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.loans() });
      qc.invalidateQueries({ queryKey: essKeys.overview() });
    },
  });
}

interface SubmitTaxDeclarationBody {
  financialYear: string;
  regime: "OLD" | "NEW";
  hra?: number;
  lta?: number;
  section80c?: number;
  section80d?: number;
  section80g?: number;
  homeLoanInterest?: number;
}

export function useSubmitTaxDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "tax-declaration", "submit"],
    mutationFn: (body: SubmitTaxDeclarationBody) =>
      apiClient.post<EssTaxDeclarationResponse>("/payroll/me/tax-declaration", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.taxDeclaration() });
    },
  });
}

interface UpdateBankBody {
  accountNumber: string;
  bankName?: string;
  branch?: string;
  ifsc?: string;
  code?: string;
  accountHolder: string;
  bankCountry?: string;
  pfUanNumber?: string;
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "ess", "bank", "update"],
    mutationFn: (body: UpdateBankBody) =>
      apiClient.patch<EssBankDetails>("/payroll/me/bank", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.bank() });
    },
  });
}
