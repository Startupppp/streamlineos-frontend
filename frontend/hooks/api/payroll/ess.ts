"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  essBankDetailsContract,
  essPayslipsContract,
} from "@/hooks/api/payroll/ess-schema";
import {
  essLoansContract,
  essReimbursementsContract,
  essSalaryStructureContract,
  type EssLoan,
  type EssReimbursement,
  type EssSalaryStructure,
} from "@/hooks/api/payroll/ess-money-schema";
import type {
  EssOverview,
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
    queryKey: payrollQueryKeys.payroll.essTotalRewards(),
    queryFn: ({ signal }) => apiClient.get<TotalRewardsStatement>("/payroll/me/total-rewards", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useManagerTeamRewards(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.teamRewards(),
    queryFn: ({ signal }) => apiClient.get<TeamRewardsResult>("/payroll/manager/team-rewards", undefined, signal),
    staleTime: 60_000,
    enabled: enabled && canSelf,
  });
}

export function useOrgPayCompression(enabled = true) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.orgPayCompression(),
    queryFn: ({ signal }) =>
      apiClient.get<PayCompressionStats & { scope: "organization" }>(
        "/payroll/analytics/pay-compression", undefined, signal,
      ),
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useManagerInbox(enabled = true) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.managerInbox(),
    queryFn: ({ signal }) => apiClient.get<ManagerInbox>("/payroll/manager/inbox", undefined, signal),
    staleTime: 30_000,
    enabled: enabled && canSelf,
  });
}

function useInvalidateManagerInbox() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.managerInbox() });
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
    queryKey: payrollQueryKeys.payroll.essOverview(),
    queryFn: ({ signal }) => apiClient.get<EssOverview>("/payroll/me/overview", undefined, signal),
    staleTime: 30_000,
    enabled: canSelf,
  });
}

export function useEssPayslips() {
  const canSelf = useCan("self:payslips");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.essPayslips(),
    queryFn: ({ signal }) =>
      apiClient.get("/payroll/me/payslips", undefined, signal, essPayslipsContract),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssSalaryStructure() {
  const canSelf = useCan("self:payroll");
  return useQuery<EssSalaryStructure, Error>({
    queryKey: payrollQueryKeys.payroll.essSalaryStructure(),
    queryFn: ({ signal }) => apiClient.get("/payroll/me/salary-structure", undefined, signal, essSalaryStructureContract),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssReimbursements() {
  const canSelf = useCan("self:payroll");
  return useQuery<EssReimbursement[], Error>({
    queryKey: payrollQueryKeys.payroll.essReimbursements(),
    queryFn: ({ signal }) => apiClient.get("/payroll/me/reimbursements", undefined, signal, essReimbursementsContract),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssLoans() {
  const canSelf = useCan("self:payroll");
  return useQuery<EssLoan[], Error>({
    queryKey: payrollQueryKeys.payroll.essLoans(),
    queryFn: ({ signal }) => apiClient.get("/payroll/me/loans", undefined, signal, essLoansContract),
    staleTime: 60_000,
    enabled: canSelf,
  });
}

export function useEssTaxDeclaration(options?: { enabled?: boolean }) {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.essTaxDeclaration(),
    queryFn: ({ signal }) => apiClient.get<EssTaxDeclarationResponse>("/payroll/me/tax-declaration", undefined, signal),
    staleTime: 60_000,
    enabled: canSelf && (options?.enabled ?? true),
  });
}

export function useEssBank() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.essBank(),
    queryFn: ({ signal }) =>
      apiClient.get("/payroll/me/bank", undefined, signal, essBankDetailsContract),
    staleTime: 300_000,
    enabled: canSelf,
  });
}

export function useEssFnf() {
  const canSelf = useCan("self:payroll");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.essFnf(),
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
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essReimbursements() });
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essOverview() });
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
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essLoans() });
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essOverview() });
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
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essTaxDeclaration() });
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
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.essBank() });
    },
  });
}
