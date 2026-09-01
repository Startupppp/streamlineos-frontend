"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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

export function useEssTotalRewards() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essTotalRewards(),
    queryFn: ({ signal }) => apiClient.get<TotalRewardsStatement>("/payroll/me/total-rewards", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useManagerTeamRewards(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.teamRewards(),
    queryFn: ({ signal }) => apiClient.get<TeamRewardsResult>("/payroll/manager/team-rewards", undefined, signal),
    staleTime: 60_000,
    enabled: enabled && canSelf,
  });
}

export function useOrgPayCompression(enabled = true) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: queryKeys.payroll.orgPayCompression(),
    queryFn: ({ signal }) =>
      apiClient.get<PayCompressionStats & { scope: "organization" }>(
        "/payroll/analytics/pay-compression", signal,
      ),
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useManagerInbox(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.managerInbox(),
    queryFn: ({ signal }) => apiClient.get<ManagerInbox>("/payroll/manager/inbox", undefined, signal),
    staleTime: 30_000,
    enabled: enabled && canSelf,
  });
}

function useInvalidateManagerInbox() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.managerInbox() });
  };
}

export function useManagerApproveReimbursement() {
  const invalidate = useInvalidateManagerInbox();
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "manager", "reimb-approve"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/reimbursements/${id}/approve`),
    onSuccess: () => invalidate(),
  });
}

export function useManagerRejectReimbursement() {
  const invalidate = useInvalidateManagerInbox();
  return useAuthorizedMutation("self:payroll", {
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
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "manager", "loan-approve"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/loans/${id}/approve`),
    onSuccess: () => invalidate(),
  });
}

export function useManagerRejectLoan() {
  const invalidate = useInvalidateManagerInbox();
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "manager", "loan-reject"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/payroll/manager/loans/${id}/reject`),
    onSuccess: () => invalidate(),
  });
}

export function useEssOverview() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essOverview(),
    queryFn: ({ signal }) => apiClient.get<EssOverview>("/payroll/me/overview", undefined, signal),
    staleTime: 30_000,
    enabled: canSelf,
  });
}

export function useEssPayslips() {
  const canSelf = useCan("self:payslips");
  return useQuery({
    queryKey: queryKeys.payroll.essPayslips(),
    queryFn: ({ signal }) => apiClient.get<EssPayslip[]>("/payroll/me/payslips", undefined, signal),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssSalaryStructure() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essSalaryStructure(),
    queryFn: ({ signal }) => apiClient.get<EssSalaryStructure>("/payroll/me/salary-structure", undefined, signal),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssReimbursements() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essReimbursements(),
    queryFn: ({ signal }) => apiClient.get<EssReimbursement[]>("/payroll/me/reimbursements", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssLoans() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essLoans(),
    queryFn: ({ signal }) => apiClient.get<EssLoan[]>("/payroll/me/loans", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssTaxDeclaration(options?: { enabled?: boolean }) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essTaxDeclaration(),
    queryFn: ({ signal }) => apiClient.get<EssTaxDeclarationResponse>("/payroll/me/tax-declaration", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf && (options?.enabled ?? true),
  });
}

export function useEssBank() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essBank(),
    queryFn: ({ signal }) => apiClient.get<EssBankDetails>("/payroll/me/bank", undefined, signal),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssFnf() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: queryKeys.payroll.essFnf(),
    queryFn: ({ signal }) => apiClient.get<EssFnfSettlement | null>("/payroll/me/fnf", undefined, signal),
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
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "ess", "reimbursements", "submit"],
    mutationFn: (body: SubmitReimbursementBody) =>
      apiClient.post<EssReimbursement>("/payroll/me/reimbursements", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essReimbursements() });
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essOverview() });
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
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "ess", "loans", "create"],
    mutationFn: (body: CreateLoanBody) =>
      apiClient.post<EssLoan>("/payroll/me/loans", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essLoans() });
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essOverview() });
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
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "ess", "tax-declaration", "submit"],
    mutationFn: (body: SubmitTaxDeclarationBody) =>
      apiClient.post<EssTaxDeclarationResponse>("/payroll/me/tax-declaration", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essTaxDeclaration() });
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
  return useAuthorizedMutation("self:payroll", {
    mutationKey: ["payroll", "ess", "bank", "update"],
    mutationFn: (body: UpdateBankBody) =>
      apiClient.patch<EssBankDetails>("/payroll/me/bank", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.essBank() });
    },
  });
}
